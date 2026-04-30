import OpenAI from 'openai';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';
import { isSLMAvailable, processWithSLM } from './ai.slm.service.js';

let _client = null;
let _mockMode = false;
let _slmMode = false;
let _runtimeApiKey = null;
let _runtimeModel = null;

// Initialize AI mode based on environment
function initializeAIMode() {
  const apiKey = env.OPENAI_API_KEY;
  
  // Check if SLM mode is explicitly enabled
  const slmEnabled = env.AI_MODE === 'slm' || env.OPENAI_API_KEY === 'slm';
  
  if (slmEnabled || (!apiKey || apiKey === 'mock' || apiKey === 'demo')) {
    _mockMode = !slmEnabled;
    _slmMode = slmEnabled;
    logger.info(`🤖 AI Service running in ${_slmMode ? 'SLM' : 'MOCK'} mode`);
  } else {
    _mockMode = false;
    _slmMode = false;
    _client = new OpenAI({ apiKey });
    logger.info(`🤖 AI Service running in REAL mode with model: ${env.OPENAI_MODEL || 'gpt-4o-mini'}`);
  }
}

initializeAIMode();

export function getAIClient() {
  if (!_mockMode && !_slmMode && !getEffectiveApiKey()) {
    throw new Error('OPENAI_API_KEY is not configured. AI features are unavailable.');
  }
  if (!_mockMode && !_slmMode && !_client) {
    const apiKey = getEffectiveApiKey();
    _client = new OpenAI({ apiKey });
  }
  return _mockMode ? createMockClient() : null;
}

export function isMockMode() {
  return _mockMode;
}

export function isSLMMode() {
  return _slmMode;
}

// Get the effective API key (runtime or env)
export function getEffectiveApiKey() {
  return _runtimeApiKey || env.OPENAI_API_KEY;
}

// Get the effective model (runtime or env)
export function getEffectiveModel() {
  return _runtimeModel || env.OPENAI_MODEL || 'gpt-4o-mini';
}

// Configure AI mode at runtime (dynamic switching between REAL, MOCK, and SLM)
export function configureAI({ apiKey, model, forceMock = false, forceSLM = false } = {}) {
  logger.info(`🔄 Configuring AI: mock=${forceMock || !apiKey}, slm=${forceSLM}, model=${model || 'default'}`);

  if (forceSLM) {
    _slmMode = true;
    _mockMode = false;
    _runtimeApiKey = null;
    _runtimeModel = null;
    _client = null;
    logger.info('🤖 AI Service switched to SLM mode (Small Language Model)');
  } else if (forceMock || !apiKey) {
    _mockMode = true;
    _slmMode = false;
    _runtimeApiKey = null;
    _runtimeModel = null;
    _client = null;
    logger.info('🤖 AI Service switched to MOCK mode');
  } else {
    _mockMode = false;
    _slmMode = false;
    _runtimeApiKey = apiKey;
    _runtimeModel = model || null;
    _client = new OpenAI({ apiKey });
    logger.info(`🤖 AI Service switched to REAL mode with model: ${getEffectiveModel()}`);
  }

  return {
    mockMode: _mockMode,
    slmMode: _slmMode,
    model: getEffectiveModel(),
    available: true
  };
}

// Test AI connection (useful for validating API key)
export async function testAIConnection() {
  try {
    if (_mockMode) {
      return { success: true, mode: 'mock', message: 'Mock mode is working' };
    }
    
    const client = getAIClient();
    const response = await client.chat.completions.create({
      model: getEffectiveModel(),
      messages: [{ role: 'user', content: 'Say "OK" if you can read this' }],
      max_tokens: 10,
    });
    
    return {
      success: true,
      mode: 'real',
      model: getEffectiveModel(),
      response: response.choices[0].message.content
    };
  } catch (error) {
    logger.error('❌ AI connection test failed:', error.message);
    return {
      success: false,
      mode: _mockMode ? 'mock' : 'real',
      error: error.message
    };
  }
}

// Get current AI configuration status
export function getAIConfig() {
  const apiKey = getEffectiveApiKey();
  const hasApiKey = !!apiKey && apiKey !== 'mock' && apiKey !== 'demo' && apiKey !== 'slm';

  return {
    mockMode: _mockMode,
    slmMode: _slmMode,
    hasApiKey: hasApiKey,
    model: getEffectiveModel(),
    apiKeyConfigured: hasApiKey && !_mockMode && !_slmMode,
    runtimeConfigured: !!_runtimeApiKey,
    available: true,
    slmAvailable: isSLMAvailable()
  };
}

// Mock AI client for demo purposes
function createMockClient() {
  return {
    chat: {
      completions: {
        create: async (options) => {
          const messages = options.messages || [];
          const lastMessage = messages[messages.length - 1];
          const userContent = lastMessage?.content || '';
          const systemMessage = messages.find(m => m.role === 'system');
          const systemContent = systemMessage?.content || '';

          // Generate mock responses based on the input and system prompt
          const mockResponse = generateMockResponse(userContent, options, systemContent, messages);

          return {
            choices: [{
              message: { content: mockResponse },
              finish_reason: 'stop'
            }]
          };
        }
      }
    }
  };
}

// Generate context-aware mock responses — system prompt takes HIGHEST priority
function generateMockResponse(content, options, systemPrompt = '', allMessages = []) {
  const isJsonMode = options.response_format?.type === 'json_object';
  const lower = content.toLowerCase();
  const sysLower = systemPrompt.toLowerCase();

  // ── Determine bot type from system prompt (most reliable signal) ──────────
  // Check in order of specificity (most specific first)
  if (sysLower.includes('business') || sysLower.includes('unified intent')) return _mockBusinessChat(lower, options);
  if (sysLower.includes('form builder')) return _mockFormBuilder(lower);
  if (sysLower.includes('merchant assistant')) return _mockMerchant(lower);
  if (sysLower.includes('customer support')) return _mockSupport(lower, allMessages);
  if (sysLower.includes('fraud awareness')) return _mockFraud();
  if (sysLower.includes('invoice generator')) return _mockInvoice();
  if (sysLower.includes('workflow automation')) return _mockWorkflow();
  if (sysLower.includes('analytics') && sysLower.includes('metrics')) return _mockAnalytics();

  // ── Fallback: infer from message content ─────────────────────────────────
  if (lower.includes('donation') || lower.includes('payment form') || lower.includes('form builder'))
    return _mockFormBuilder(lower);

  if (lower.includes('refund') || lower.includes('money back') || lower.includes('failed transaction') ||
      lower.includes('not received') || lower.includes('upi limit') || lower.includes('transfer limit') ||
      lower.includes('why did') || lower.includes('how do i get'))
    return _mockSupport(lower, allMessages);

  if (lower.includes('qr') || lower.includes('payment link') || lower.includes('analytics') ||
      lower.includes('generate') || lower.includes('create payment') || lower.includes('show my') ||
      lower.includes('create') || lower.includes('search') || lower.includes('revenue'))
    return _mockBusinessChat(lower, options);

  // ── Default ───────────────────────────────────────────────────────────────
  if (isJsonMode) {
    return JSON.stringify({
      reply: "I'm here to help! Could you tell me more about what you need — creating a payment, checking a transaction, or something else?",
      action: 'none',
      params: {}
    });
  }
  return "I'm your AI assistant for the payment platform. I can help you create payment pages, generate QR codes, analyze transactions, and answer support questions. What would you like to do today?";
}

function _mockFormBuilder(lower) {
  const isDonation = lower.includes('donation') || lower.includes('donate');
  const isEvent = lower.includes('event') || lower.includes('ticket');
  return JSON.stringify({
    title: isDonation ? 'Donation Form' : isEvent ? 'Event Registration' : 'Payment Form',
    description: isDonation ? 'Accept donations securely via UPI' : 'Secure UPI payment form',
    currency: 'INR',
    fields: [
      { name: 'name', label: 'Full Name', type: 'text', required: true, options: null },
      { name: 'email', label: 'Email', type: 'email', required: true, options: null },
      { name: 'phone', label: 'Mobile Number', type: 'tel', required: false, options: null },
    ],
    quickAmounts: isDonation ? [100, 500, 1000, 5000] : [200, 500, 1000, 2000],
    allowCustomAmount: true,
  });
}

function _mockAnalytics() {
  return JSON.stringify({
    summary: 'Your payment platform is performing well with steady growth this week.',
    insights: [
      'Transaction volume increased by 15% compared to last week',
      'Peak payment hours are between 6–9 PM',
      'Mobile UPI payments account for 78% of all transactions',
    ],
    suggestions: [
      'Add quick payment options during peak hours to reduce drop-offs',
      'Send payment reminders to customers with pending transactions',
      'Enable auto-settlement for faster fund processing',
    ],
  });
}

function _mockSupport(lower, allMessages) {
  const history = allMessages.filter(m => m.role === 'user' || m.role === 'assistant');
  const isUrgent = lower.includes('urgent') || lower.includes('fraud') || lower.includes('scam') || history.length > 6;
  let reply;

  if (lower.includes('refund') || lower.includes('money back')) {
    reply = 'For refund requests, please contact your bank or the merchant within 5–7 business days. If the amount was debited but the transaction shows failed, it will be auto-reversed within 3 business days.';
  } else if (lower.includes('failed') || lower.includes('not received') || lower.includes('deducted')) {
    reply = 'If your payment failed but money was deducted, it will be automatically refunded within 3–5 business days. Please note your transaction ID from the payment confirmation SMS for reference.';
  } else if (lower.includes('limit') || lower.includes('upi limit') || lower.includes('transfer limit')) {
    reply = 'UPI transfer limits are set by your bank. Most banks allow ₹1 lakh per transaction and ₹1 lakh per day. Some banks like SBI allow up to ₹2 lakhs. Contact your bank to increase limits.';
  } else if (lower.includes('status') || lower.includes('transaction')) {
    reply = 'To check your transaction status, please share the transaction ID (found in your payment confirmation SMS or email). I can look it up for you.';
  } else if (lower.includes('safe') || lower.includes('secure')) {
    reply = 'Yes, all transactions on this platform are secured with 256-bit encryption and are RBI-regulated. Your UPI PIN is never stored or shared with us.';
  } else if (lower.includes('why did') || lower.includes('payment fail')) {
    reply = 'Payments can fail due to: incorrect UPI PIN, insufficient balance, bank server downtime, or daily limit exceeded. Please retry after a few minutes. If the issue persists, contact your bank.';
  } else {
    reply = 'I understand your concern. Could you please share more details or your transaction ID so I can assist you better?';
  }

  return JSON.stringify({ reply, escalate: isUrgent });
}

function _mockMerchant(lower) {
  let action = 'none';
  let reply = 'I can help you with that!';
  let params = {};

  // Extract amount if mentioned
  const amtMatch = lower.match(/(₹|rs\.?|inr)?\s*(\d+)/i);
  const amount = amtMatch ? parseInt(amtMatch[2]) : 500;

  if (lower.includes('qr')) {
    action = 'generate_qr';
    reply = `I'll generate a UPI QR code${amount ? ` for ₹${amount}` : ''} for you right away!`;
    params = { amount, currency: 'INR', description: 'Payment via QR' };
  } else if (lower.includes('link')) {
    action = 'create_payment_link';
    reply = `I'll create a shareable payment link${amount ? ` for ₹${amount}` : ''} for you!`;
    params = { amount, currency: 'INR', description: 'Payment link' };
  } else if (lower.includes('analytics') || lower.includes('stats') || lower.includes('earnings') || lower.includes('show my')) {
    action = 'show_analytics';
    reply = "Let me pull up your analytics and insights!";
    params = {};
  } else if (lower.includes('page') || lower.includes('shop') || lower.includes('store') || lower.includes('create payment')) {
    action = 'create_payment_page';
    reply = `I'll set up a payment page${amount ? ` for ₹${amount}` : ''} for your shop!`;
    params = { amount, currency: 'INR', description: 'Payment page' };
  } else {
    reply = "I can help you generate QR codes, create payment links, set up payment pages, or show your analytics. What would you like to do?";
  }

  return JSON.stringify({ reply, action, params });
}

function _mockBusinessChat(lower, options) {
  const isJsonMode = options?.response_format?.type === 'json_object';
  const amtMatch = lower.match(/(₹|rs\.?|inr)?\s*(\d+)/i);
  const amount = amtMatch ? parseInt(amtMatch[2]) : null;

  // Detect intent from keywords
  if (lower.includes('payment link') || lower.includes('create link') || lower.includes('shareable link')) {
    return JSON.stringify({
      reply: amount ? `I'll create a payment link for ₹${amount} right away!` : 'I\'ll create a payment link for you!',
      action: 'generate_payment_link',
      params: { amount, currency: 'INR', description: 'Payment link' },
      confidence: 0.9
    });
  }

  if (lower.includes('qr') || lower.includes('qr code')) {
    return JSON.stringify({
      reply: amount ? `Generating QR code for ₹${amount}!` : 'I\'ll generate a QR code for you!',
      action: 'generate_qr_code',
      params: { amount, upiId: 'merchant@upi', recipientName: 'Merchant' },
      confidence: 0.9
    });
  }

  if (lower.includes('revenue') || lower.includes('analytics') || lower.includes('sales') || 
      lower.includes('income') || lower.includes('earnings') || lower.includes('show me')) {
    const timeRange = lower.includes('today') ? 'today' : lower.includes('month') ? 'month' : 'week';
    return JSON.stringify({
      reply: `Here's your ${timeRange} business performance summary.`,
      action: 'show_analytics',
      params: { timeRange },
      confidence: 0.85
    });
  }

  if (lower.includes('search') || lower.includes('find') || lower.includes('lookup')) {
    const status = lower.includes('failed') ? 'failed' : lower.includes('success') ? 'success' : null;
    return JSON.stringify({
      reply: status ? `Searching for ${status} payments...` : 'Searching payments...',
      action: 'search_payments',
      params: { query: lower, status },
      confidence: 0.8
    });
  }

  if (lower.includes('invoice') || lower.includes('bill')) {
    return JSON.stringify({
      reply: 'I\'ll generate an invoice for you!',
      action: 'generate_invoice',
      params: { message: lower },
      confidence: 0.85
    });
  }

  if (lower.includes('fraud') || lower.includes('suspicious') || lower.includes('scam')) {
    return JSON.stringify({
      reply: 'Let me analyze this transaction for fraud indicators.',
      action: 'explain_fraud',
      params: { transaction: {} },
      confidence: 0.8
    });
  }

  // Default business response
  return JSON.stringify({
    reply: "I can help you create payment links, generate QR codes, view analytics, search payments, and more. What would you like to do?",
    action: 'none',
    params: {},
    confidence: 0.5
  });
}

function _mockWorkflow() {
  return JSON.stringify({
    suggestions: [
      { title: 'Payment Reminder', description: 'Send SMS reminder 24h before due date', trigger: 'payment_due', action: 'send_sms' },
      { title: 'Auto Receipt', description: 'Send email receipt on successful payment', trigger: 'payment_success', action: 'send_email' },
      { title: 'Failed Payment Follow-up', description: 'Notify customer on payment failure', trigger: 'payment_failed', action: 'send_notification' },
      { title: 'Weekly Summary', description: 'Send weekly earnings report every Monday', trigger: 'schedule_weekly', action: 'send_report' },
    ],
  });
}

function _mockInvoice() {
  const today = new Date().toISOString().split('T')[0];
  const due = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  return JSON.stringify({
    invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
    date: today,
    dueDate: due,
    merchant: { name: 'Merchant', upiId: 'merchant@upi' },
    customer: { name: 'Customer', email: 'customer@example.com' },
    items: [{ description: 'Service', quantity: 1, unitPrice: 500, total: 500 }],
    subtotal: 500,
    tax: 0,
    total: 500,
    currency: 'INR',
    notes: 'Thank you for your business.',
  });
}

function _mockFraud() {
  return JSON.stringify({
    riskLevel: 'low',
    flags: [],
    advisory: 'No unusual activity detected in the provided transaction data.',
    recommendations: [
      'Enable transaction alerts for amounts above ₹10,000',
      'Review transactions from new or unrecognised UPI IDs',
      'Monitor for multiple failed attempts from the same source',
    ],
  });
}

export async function chat(systemPrompt, userMessage, jsonMode = false, history = []) {
  const historyMessages = history
    .filter(h => h.role && h.content)
    .map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content }));

  // SLM Mode - Use Small Language Model (fastest, no external API)
  if (_slmMode) {
    await new Promise(resolve => setTimeout(resolve, 150)); // Small delay for UX
    const slmResult = processWithSLM(userMessage, { systemPrompt }, history);
    return JSON.stringify(slmResult);
  }

  const client = getAIClient();

  // In mock mode add a tiny delay so the UI typing indicator is visible
  if (_mockMode) {
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Real AI mode - Use OpenAI or compatible API
  if (!_mockMode && client) {
    // Wrap real API call with a 15-second timeout to prevent hanging
    const apiCall = client.chat.completions.create({
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
      response_format: jsonMode ? { type: 'json_object' } : undefined,
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
    });

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI request timed out. Please try again.')), 15000)
    );
    const response = await Promise.race([apiCall, timeout]);
    return response.choices[0].message.content;
  }

  // Mock mode fallback
  const mockResponse = generateMockResponse(userMessage, { response_format: jsonMode ? { type: 'json_object' } : undefined }, systemPrompt, history);
  return mockResponse;
}
