import { chat, getAIClient, isMockMode, isSLMMode } from './ai.client.js';
import { businessChatSLM } from './ai.slm.service.js';
import { getDatabase } from '../../db/mongo.js';
import logger from '../../utils/logger.js';

// ─────────────────────────────────────────────────────────────────────────────
// CHAT-TO-BUSINESS DASHBOARD — Unified Intent-Based Action System
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Universal Business Chat System
 * Parses user intent and executes appropriate business actions
 */

const BUSINESS_CHAT_SYSTEM = `You are a powerful AI business assistant for an Indian UPI payment platform.
You can execute REAL business actions via chat commands.

AVAILABLE ACTIONS:
1. generate_payment_link — Create a shareable payment URL
   - Extract: amount (INR), description, recipientName, upiId (optional)
   
2. generate_qr_code — Generate UPI QR code
   - Extract: amount (optional), upiId, recipientName
   
3. create_payment_page — Create full payment page
   - Extract: amount, productName, description
   
4. generate_invoice — Create invoice
   - Extract: customerName, customerEmail, items (array), totalAmount
   
5. search_payments — Search transactions
   - Extract: status (success/failed/pending), dateRange, amount, customerName
   
6. show_analytics — Display business metrics
   - Extract: timeRange (today/week/month), metrics (revenue/transactions/conversion)
   
7. send_reminder — Send payment reminder
   - Extract: customerName, amount, dueDate, contactInfo
   
8. explain_fraud — Analyze transaction for fraud
   - Extract: transactionId, amount, pattern

RULES:
- Return ONLY valid JSON: { "reply": string, "action": string|null, "params": object, "confidence": number }
- action is one of the above OR "none" for general queries
- params contains extracted entities
- confidence: 0-1 (how sure you are about the intent)
- For analytics queries without specific action, use action="show_analytics"
- Amounts are always in INR (₹)
- Be concise in replies (1-2 sentences)
- Respond in user's language (English/Hindi/Tamil)`;

export async function businessChat(message, context = {}, history = []) {
  // Use SLM for business chat (fast and deterministic)
  if (isSLMMode()) {
    return businessChatSLM(message, context, history);
  }
  
  const userMsg = context.userName
    ? `User: ${context.userName}\nMessage: ${message}`
    : message;

  const raw = await chat(BUSINESS_CHAT_SYSTEM, userMsg, true, history);
  return JSON.parse(raw);
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics Q&A — Natural Language Queries
// ─────────────────────────────────────────────────────────────────────────────

const ANALYTICS_QA_SYSTEM = `You are an analytics Q&A assistant.
Given a natural language question about business metrics and the actual data,
provide a clear, insightful answer.

Return JSON: { "answer": string, "highlights": string[], "suggestion": string }

Rules:
- answer: Direct response to the question (2-3 sentences)
- highlights: 2-3 key data points
- suggestion: 1 actionable recommendation
- Use simple language, avoid jargon`;

export async function analyticsQA(question, stats) {
  const prompt = `Question: ${question}\n\nData: ${JSON.stringify(stats)}`;
  const raw = await chat(ANALYTICS_QA_SYSTEM, prompt, true);
  return JSON.parse(raw);
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Search — Natural Language
// ─────────────────────────────────────────────────────────────────────────────

const SEARCH_SYSTEM = `You are a payment search assistant.
Convert natural language search into structured query filters.

Return JSON: { 
  "filters": {
    "status": "success"|"failed"|"pending"|null,
    "minAmount": number|null,
    "maxAmount": number|null,
    "customerName": string|null,
    "dateFrom": string|null,
    "dateTo": string|null
  },
  "reply": string
}`;

export async function parseSearchQuery(query) {
  const raw = await chat(SEARCH_SYSTEM, `Search: ${query}`, true);
  return JSON.parse(raw);
}

// ─────────────────────────────────────────────────────────────────────────────
// Invoice Generator — Enhanced
// ─────────────────────────────────────────────────────────────────────────────

const INVOICE_CHAT_SYSTEM = `You are an invoice generator.
Extract invoice details from conversation.

Return JSON: {
  "customerName": string,
  "customerEmail": string,
  "items": [{ "description": string, "quantity": number, "unitPrice": number }],
  "totalAmount": number,
  "notes": string,
  "reply": string
}`;

export async function extractInvoiceDetails(message, history = []) {
  const contextStr = history.length > 0 
    ? `Conversation: ${JSON.stringify(history)}\nFinal: ${message}`
    : message;
  const raw = await chat(INVOICE_CHAT_SYSTEM, contextStr, true);
  return JSON.parse(raw);
}

// ─────────────────────────────────────────────────────────────────────────────
// Fraud Explanation — AI Analysis
// ─────────────────────────────────────────────────────────────────────────────

const FRAUD_EXPLAIN_SYSTEM = `You are a fraud explanation assistant.
Analyze transaction patterns and explain in simple terms.

Return JSON: {
  "riskLevel": "low"|"medium"|"high",
  "explanation": string,
  "redFlags": string[],
  "verdict": string,
  "recommendations": string[]
}

Rules:
- explanation: Simple paragraph anyone can understand
- redFlags: Specific anomalies found
- verdict: Clear "Safe" / "Caution" / "Risky"
- recommendations: 2-3 practical steps`;

export async function explainFraud(transactionData) {
  const raw = await chat(FRAUD_EXPLAIN_SYSTEM, JSON.stringify(transactionData), true);
  return JSON.parse(raw);
}

// ─────────────────────────────────────────────────────────────────────────────
// Business Insights — Auto-Generated
// ─────────────────────────────────────────────────────────────────────────────

const INSIGHTS_SYSTEM = `You are a business insights generator.
Given business metrics, provide actionable insights.

Return JSON: {
  "summary": string,
  "strengths": string[],
  "weaknesses": string[],
  "opportunities": string[],
  "actionPlan": [{ "priority": "high"|"medium"|"low", "action": string, "impact": string }]
}`;

export async function generateBusinessInsights(metrics) {
  const raw = await chat(INSIGHTS_SYSTEM, JSON.stringify(metrics), true);
  return JSON.parse(raw);
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto Suggestions — Context-Aware
// ─────────────────────────────────────────────────────────────────────────────

const SUGGESTIONS_SYSTEM = `You are a business suggestion assistant.
Based on current business state, suggest next best actions.

Return JSON: {
  "suggestions": [
    { 
      "title": string,
      "description": string,
      "actionType": "create_link"|"generate_qr"|"send_reminder"|"view_analytics"|"create_invoice",
      "params": object,
      "priority": number
    }
  ],
  "reasoning": string
}

Rules:
- Max 5 suggestions
- Priority: 1 (highest) to 5 (lowest)
- Each suggestion must have actionable params`;

export async function generateAutoSuggestions(context) {
  const raw = await chat(SUGGESTIONS_SYSTEM, JSON.stringify(context), true);
  return JSON.parse(raw);
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications Summary — Smart Digest
// ─────────────────────────────────────────────────────────────────────────────

const NOTIFICATIONS_SYSTEM = `You are a notifications summarizer.
Given a list of events/notifications, create a concise digest.

Return JSON: {
  "summary": string,
  "urgent": string[],
  "pending": string[],
  "info": string[],
  "suggestedActions": string[]
}`;

export async function summarizeNotifications(notifications) {
  const raw = await chat(NOTIFICATIONS_SYSTEM, JSON.stringify(notifications), true);
  return JSON.parse(raw);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Fetch Analytics from Database
// ─────────────────────────────────────────────────────────────────────────────

export async function getAnalytics(timeRange = 'week') {
  const db = await getDatabase();
  const paymentsCol = db.collection('payments');
  const txnsCol = db.collection('transactions');

  const now = new Date();
  let startDate;
  
  switch (timeRange) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
      break;
    case 'month':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    default:
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
  }

  const [allPayments, allTxns] = await Promise.all([
    paymentsCol.find({}).toArray(),
    txnsCol.find({}).toArray(),
  ]);

  const filterByDate = (items, dateField) => 
    items.filter(item => new Date(item[dateField]) >= startDate);

  const successP = allPayments.filter(p => p.status === 'success');
  const failedP = allPayments.filter(p => p.status === 'failed');
  const todayP = filterByDate(successP, 'createdAt');
  const weekP = filterByDate(successP, 'createdAt');
  
  const successT = allTxns.filter(t => t.status === 'success');
  const failedT = allTxns.filter(t => t.status === 'failed');
  const todayT = filterByDate(successT, 'created_date');
  const weekT = filterByDate(successT, 'created_date');

  // Calculate hour distribution
  const hourBuckets = Array(24).fill(0);
  [...successT, ...successP].forEach(t => {
    const date = t.created_date || t.createdAt;
    if (date) hourBuckets[new Date(date).getHours()]++;
  });
  const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));

  // Revenue calculations
  const sumAmounts = items => items.reduce((s, i) => s + (i.amount || 0), 0);
  
  return {
    total_payments: allPayments.length + allTxns.length,
    successful: successP.length + successT.length,
    failed: failedP.length + failedT.length,
    pending: allPayments.filter(p => p.status === 'pending').length,
    conversion_rate: (allPayments.length + allTxns.length)
      ? (((successP.length + successT.length) / (allPayments.length + allTxns.length)) * 100).toFixed(1) + '%'
      : '0%',
    revenue: {
      today: sumAmounts(todayP) + sumAmounts(todayT),
      week: sumAmounts(weekP) + sumAmounts(weekT),
      total: sumAmounts(successP) + sumAmounts(successT),
    },
    peak_hour: `${peakHour}:00`,
    avg_transaction: (successP.length + successT.length) > 0
      ? ((sumAmounts(successP) + sumAmounts(successT)) / (successP.length + successT.length)).toFixed(0)
      : '0',
    timeRange,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Search Payments
// ─────────────────────────────────────────────────────────────────────────────

export async function searchPayments(filters = {}) {
  const db = await getDatabase();
  const paymentsCol = db.collection('payments');
  const txnsCol = db.collection('transactions');

  const query = {};
  
  if (filters.status) query.status = filters.status;
  if (filters.minAmount || filters.maxAmount) {
    query.amount = {};
    if (filters.minAmount) query.amount.$gte = filters.minAmount;
    if (filters.maxAmount) query.amount.$lte = filters.maxAmount;
  }
  if (filters.customerName) {
    query.$or = [
      { customerName: { $regex: filters.customerName, $options: 'i' } },
      { recipientName: { $regex: filters.customerName, $options: 'i' } },
    ];
  }
  if (filters.dateFrom || filters.dateTo) {
    query.$or = [
      { createdAt: {} },
      { created_date: {} },
    ];
    if (filters.dateFrom) {
      query.$or[0].createdAt.$gte = new Date(filters.dateFrom);
      query.$or[1].created_date.$gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      query.$or[0].createdAt.$lte = new Date(filters.dateTo);
      query.$or[1].created_date.$lte = new Date(filters.dateTo);
    }
  }

  const [payments, transactions] = await Promise.all([
    paymentsCol.find(query).limit(50).toArray(),
    txnsCol.find(query).limit(50).toArray(),
  ]);

  return {
    results: [...payments, ...transactions].sort((a, b) => 
      new Date(b.created_date || b.createdAt) - new Date(a.created_date || a.createdAt)
    ),
    count: payments.length + transactions.length,
  };
}
