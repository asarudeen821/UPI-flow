import { chat, getAIClient, isMockMode, isSLMMode, configureAI, testAIConnection, getAIConfig, getEffectiveModel } from './ai.client.js';
import { 
  merchantAssistSLM, 
  businessChatSLM, 
  supportChatSLM, 
  generateFormSLM, 
  analyzeMetricsSLM,
  getSLMStats,
  isSLMAvailable
} from './ai.slm.service.js';
import env from '../../config/env.js';
import { getDatabase } from '../../db/mongo.js';

// Check if AI is available (either real API key or mock mode or SLM mode)
export function isAIAvailable() {
  return true; // Always available in mock mode or SLM mode
}

export function getAIStatus() {
  const config = getAIConfig();
  const isSLM = isSLMMode();
  
  return {
    available: true,
    model: config.model,
    mode: isSLM ? 'slm' : config.mockMode ? 'mock' : 'real',
    features: ['form_generator', 'merchant_assistant', 'analytics_insights', 'support_bot', 'workflow_automation', 'invoice_generator', 'fraud_awareness'],
    mockMode: config.mockMode,
    slmMode: isSLM,
    slmAvailable: isSLMAvailable(),
    config: config
  };
}

// Export configuration functions for controller
export { configureAI, testAIConnection, getAIConfig };

// ─── 1. No-Code Payment Form Generator ───────────────────────────────────────
const FORM_SYSTEM = `You are a payment form builder for an Indian UPI payment platform.
Given a description, return ONLY a valid JSON object with this exact shape:
{
  "title": string,
  "description": string,
  "currency": "INR",
  "fields": [{ "name": string, "label": string, "type": "text"|"number"|"select"|"email"|"tel", "required": boolean, "options": string[]|null }],
  "quickAmounts": number[],
  "allowCustomAmount": boolean
}
Rules: quickAmounts max 4 values, fields max 6, no markdown, no explanation.`;

export async function generateForm(prompt) {
  // Use SLM for form generation (fast and deterministic)
  if (isSLMMode()) {
    return generateFormSLM(prompt);
  }
  const raw = await chat(FORM_SYSTEM, prompt, true);
  return JSON.parse(raw);
}

// ─── 2. Merchant Assistant ────────────────────────────────────────────────────
const MERCHANT_SYSTEM = `You are a merchant assistant for an Indian UPI/Razorpay payment platform.
You help merchants create payment pages, generate QR codes, and understand their earnings.
Respond in the same language the user writes in (English, Hindi, or Tamil).
Return ONLY a valid JSON object:
{
  "reply": string,
  "action": "create_payment_page"|"generate_qr"|"show_analytics"|"create_payment_link"|"none",
  "params": object
}
params should contain relevant extracted values (amount, upiId, description, etc.) or {}.
Be concise. Amounts are in INR. No markdown.`;

export async function merchantAssist(message, context = {}, history = []) {
  if (isSLMMode()) {
    return merchantAssistSLM(message, context);
  }
  const userMsg = context.merchantName
    ? `Merchant: ${context.merchantName}\nMessage: ${message}`
    : message;
  const raw = await chat(MERCHANT_SYSTEM, userMsg, true, history);
  return JSON.parse(raw);
}

// ─── 3. Analytics Insights ───────────────────────────────────────────────────
const ANALYTICS_SYSTEM = `You are a financial analytics assistant for an Indian payment platform.
Given transaction summary data, return ONLY a valid JSON object:
{
  "summary": string,
  "insights": string[],
  "suggestions": string[]
}
insights: max 3 key observations. suggestions: max 3 actionable tips.
Focus on revenue trends, peak hours, conversion drops. No markdown.`;

export async function analyzeMetrics(stats) {
  // Use SLM for analytics (fast and deterministic)
  if (isSLMMode()) {
    return analyzeMetricsSLM(stats);
  }
  const raw = await chat(ANALYTICS_SYSTEM, JSON.stringify(stats), true);
  return JSON.parse(raw);
}

// ─── 4. Customer Support Bot (multi-turn) ────────────────────────────────────
const SUPPORT_SYSTEM = `You are a customer support bot for an Indian UPI payment platform.
You help users with: payment status, refund process, failed transactions, UPI issues.
Rules:
- Never make up transaction data. If asked about a specific transaction, say you need the transaction ID.
- Keep replies under 3 sentences.
- For refunds: always say "contact your bank or the merchant within 5-7 business days".
- Do NOT handle fraud detection or approve/deny payments.
- Respond in the same language the user writes in (English, Hindi, or Tamil).
Return ONLY a valid JSON object: { "reply": string, "escalate": boolean }
escalate=true only if the issue needs human intervention.`;

export async function supportReply(message, transactionContext = null, history = []) {
  // Use SLM for support (fast and deterministic)
  if (isSLMMode()) {
    return supportChatSLM(message, transactionContext, history);
  }
  
  const contextStr = transactionContext
    ? `Transaction context: ${JSON.stringify(transactionContext)}\nUser: ${message}`
    : message;
  const raw = await chat(SUPPORT_SYSTEM, contextStr, true, history);
  return JSON.parse(raw);
}

// ─── 5. Workflow Automation Suggestions ──────────────────────────────────────
const WORKFLOW_SYSTEM = `You are a payment workflow automation advisor for an Indian UPI payment platform.
Suggest automation flows based on the merchant's context.
Return ONLY a valid JSON object:
{
  "suggestions": [
    { "title": string, "description": string, "trigger": string, "action": string }
  ]
}
Max 4 suggestions. Focus on: payment reminders, auto receipts, follow-ups, retry logic. No markdown.`;

export async function suggestWorkflows(context) {
  const raw = await chat(WORKFLOW_SYSTEM, JSON.stringify(context), true);
  return JSON.parse(raw);
}

// ─── 6. Invoice Generator ─────────────────────────────────────────────────────
const INVOICE_SYSTEM = `You are an invoice generator for an Indian payment platform.
Generate structured invoice data from the provided details.
Return ONLY a valid JSON object:
{
  "invoiceNumber": string,
  "date": string,
  "dueDate": string,
  "merchant": { "name": string, "upiId": string },
  "customer": { "name": string, "email": string },
  "items": [{ "description": string, "quantity": number, "unitPrice": number, "total": number }],
  "subtotal": number,
  "tax": number,
  "total": number,
  "currency": "INR",
  "notes": string
}
Use today's date if not provided. No markdown.`;

export async function generateInvoice(details) {
  const raw = await chat(INVOICE_SYSTEM, JSON.stringify(details), true);
  return JSON.parse(raw);
}

// ─── 7. Fraud Awareness (Advisory Only) ──────────────────────────────────────
const FRAUD_SYSTEM = `You are a fraud awareness advisor for an Indian UPI payment platform.
Analyze transaction patterns and flag unusual activity. Advisory only — never block transactions.
Return ONLY a valid JSON object:
{
  "riskLevel": "low"|"medium"|"high",
  "flags": string[],
  "advisory": string,
  "recommendations": string[]
}
flags: list specific anomalies found. recommendations: max 3 preventive steps. No markdown.`;

export async function analyzeFraudRisk(transactionData) {
  const raw = await chat(FRAUD_SYSTEM, JSON.stringify(transactionData), true);
  return JSON.parse(raw);
}

// ─── 8. Auto Analytics — fetch live DB stats then run AI insights ─────────────
export async function autoAnalyzeFromDB() {
  const db = await getDatabase();
  const paymentsCol = db.collection('payments');
  const txnsCol = db.collection('transactions');

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const [allPayments, allTxns] = await Promise.all([
    paymentsCol.find({}).toArray(),
    txnsCol.find({}).toArray(),
  ]);

  // payments collection uses camelCase (createdAt), transactions uses snake_case (created_date)
  const successP = allPayments.filter(p => p.status === 'success');
  const failedP  = allPayments.filter(p => p.status === 'failed');
  const todayP   = successP.filter(p => new Date(p.createdAt) >= todayStart);
  const weekP    = successP.filter(p => new Date(p.createdAt) >= weekStart);

  // transactions collection uses created_date
  const successT = allTxns.filter(t => t.status === 'success');
  const todayT   = successT.filter(t => new Date(t.created_date) >= todayStart);
  const weekT    = successT.filter(t => new Date(t.created_date) >= weekStart);

  const hourBuckets = Array(24).fill(0);
  successT.forEach(t => { hourBuckets[new Date(t.created_date).getHours()] += 1; });
  // also count from payments
  successP.forEach(p => { hourBuckets[new Date(p.createdAt).getHours()] += 1; });
  const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));

  const totalRevenue = [
    ...successP.map(p => p.amount || 0),
    ...successT.map(t => t.amount || 0),
  ].reduce((s, a) => s + a, 0);

  const stats = {
    total_payments: allPayments.length + allTxns.length,
    successful: successP.length + successT.length,
    failed: failedP.length + allTxns.filter(t => t.status === 'failed').length,
    conversion_rate: (allPayments.length + allTxns.length)
      ? (((successP.length + successT.length) / (allPayments.length + allTxns.length)) * 100).toFixed(1) + '%'
      : '0%',
    revenue_today_inr: todayP.reduce((s, p) => s + (p.amount || 0), 0) + todayT.reduce((s, t) => s + (t.amount || 0), 0),
    revenue_week_inr:  weekP.reduce((s, p) => s + (p.amount || 0), 0) + weekT.reduce((s, t) => s + (t.amount || 0), 0),
    revenue_total_inr: totalRevenue,
    peak_hour: `${peakHour}:00`,
    total_transactions: allTxns.length,
  };

  return analyzeMetrics(stats);
}
