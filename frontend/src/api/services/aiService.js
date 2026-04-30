/**
 * AI Service — Frontend API client for AI features
 * Calls backend /api/ai/* endpoints
 */

// Use relative URLs so Vite proxy handles routing to backend (avoids CORS)
const API_BASE = '';
const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Get current user ID from localStorage
 * Falls back to 'anonymous' if no user is logged in
 */
function getUserId() {
  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return user.id || user._id || user.userId;
    }
  } catch (e) {
    console.error('[AI Service] Failed to get user ID:', e);
  }
  return null; // Will use 'anonymous' in backend
}

/**
 * Get auth token from localStorage
 */
function getAuthToken() {
  return localStorage.getItem('token');
}

/**
 * Default headers for API requests
 */
function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * fetch with a timeout — rejects with a clear error if the backend is too slow
 */
function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .then(res => { clearTimeout(timer); return res; })
    .catch(err => {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.');
      throw err;
    });
}

/**
 * Check if AI is available on the backend
 * @returns {Promise<{available: boolean, model: string|null, features: string[]}>}
 */
export async function checkAIStatus() {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/ai/status`);
    const data = await res.json();
    return data.success ? data.data : { available: true, model: 'mock-gpt', features: [], mockMode: true };
  } catch (error) {
    console.error('[AI] Status check failed:', error);
    return { available: true, model: 'mock-gpt', features: [], mockMode: true };
  }
}

/**
 * Generate payment form config from natural language
 * @param {string} prompt - e.g. "Create a donation form with ₹100, ₹500, custom amount"
 * @returns {Promise<Object>} Form config JSON
 */
export async function generateForm(prompt) {
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/form`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'AI form generation failed');
  return data.data;
}

/**
 * Merchant assistant — detect intent and return action + params
 * @param {string} message - e.g. "Generate UPI QR for my shop"
 * @param {Object} context - Optional merchant context
 * @returns {Promise<{reply: string, action: string, params: Object}>}
 */
export async function merchantAssist(message, context = {}) {
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/merchant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Merchant assistant failed');
  return data.data;
}

/**
 * Execute the action returned by merchant assistant
 * @param {string} action - e.g. "generate_qr"
 * @param {Object} params - Action parameters
 * @returns {Promise<Object>} Result of the action
 */
export async function executeMerchantAction(action, params) {
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/merchant/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Action execution failed');
  return { action: data.action, data: data.data };
}

/**
 * Get AI insights from a stats object
 * @param {Object} stats - Transaction stats
 * @returns {Promise<{summary: string, insights: string[], suggestions: string[]}>}
 */
export async function analyzeMetrics(stats) {
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stats }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Analytics analysis failed');
  return data.data;
}

/**
 * Get AI insights automatically from live DB stats
 * @returns {Promise<{summary: string, insights: string[], suggestions: string[]}>}
 */
export async function getAutoAnalytics() {
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/analytics/auto`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Auto analytics failed');
  return data.data;
}

/**
 * Customer support bot — multi-turn conversation
 * @param {string} message - User message
 * @param {Object|null} transactionContext - Optional transaction data
 * @param {Array} history - Conversation history [{role, content}]
 * @returns {Promise<{reply: string, escalate: boolean}>}
 */
export async function supportChat(message, transactionContext = null, history = []) {
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/support`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, transactionContext, history }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Support chat failed');
  return data.data;
}

/**
 * Generic chat endpoint — routes to merchant or support based on context.role
 * @param {string} message
 * @param {Object} context - { role: 'merchant'|'support', userId, history, ... }
 */
export async function chat(message, context = {}) {
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Chat failed');
  return data.data;
}

/**
 * Get quick AI insights (alias for auto analytics)
 */
export async function getInsights() {
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/insights`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Insights failed');
  return { insights: data.insights, summary: data.summary, suggestions: data.suggestions };
}

/**
 * Workflow automation suggestions
 * @param {Object} context - Merchant context (business type, current tools, etc.)
 */
export async function suggestWorkflows(context = {}) {
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/workflow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Workflow suggestions failed');
  return data.data;
}

/**
 * Invoice generator
 * @param {Object} details - Invoice details (merchant, customer, items, etc.)
 */
export async function generateInvoice(details) {
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/invoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ details }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Invoice generation failed');
  return data.data;
}

/**
 * Fraud awareness advisory (read-only, never blocks transactions)
 * @param {Object} transactionData - Transaction data to analyze
 */
export async function analyzeFraud(transactionData) {
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/fraud`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionData }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Fraud analysis failed');
  return data.data;
}

// ─── AI Configuration (Dynamic Mode Switching) ───────────────────────────────

/**
 * Get current AI configuration status
 * @returns {Promise<{mockMode: boolean, hasApiKey: boolean, model: string, apiKeyConfigured: boolean}>}
 */
export async function getAIConfig() {
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/config`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to get AI config');
  return data.data;
}

/**
 * Configure AI at runtime (switch between mock/real/SLM mode)
 * @param {Object} config - Configuration options
 * @param {string} [config.apiKey] - OpenAI API key (sk-...)
 * @param {string} [config.model] - Model name (e.g., 'gpt-4o-mini', 'gpt-4-turbo')
 * @param {boolean} [config.forceMock] - Force mock mode even if API key provided
 * @param {boolean} [config.forceSLM] - Force SLM mode (Small Language Model)
 * @returns {Promise<{mockMode: boolean, slmMode: boolean, model: string, available: boolean}>}
 */
export async function configureAI({ apiKey, model, forceMock = false, forceSLM = false } = {}) {
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, model, forceMock, forceSLM }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to configure AI');
  return data.data;
}

/**
 * Test AI connection (validates API key)
 * @returns {Promise<{success: boolean, mode: 'mock'|'real', model?: string, error?: string}>}
 */
export async function testAIConnection() {
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/config/test`, {
    method: 'POST',
  });
  const data = await res.json();
  return { success: data.success, ...data.data };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT-TO-BUSINESS DASHBOARD — Unified Action API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main unified business chat — execute actions via natural language
 * @param {string} message - User's natural language command
 * @param {Object} context - Optional context (userName, business info)
 * @param {Array} history - Conversation history
 * @returns {Promise<{reply: string, action: string|null, confidence: number, result?: Object}>}
 */
export async function businessChat(message, context = {}, history = []) {
  const userId = getUserId();
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/business/chat`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ 
      message, 
      context: { ...context, userId },
      history,
      userId  // Pass userId explicitly
    }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Business chat failed');
  return data.data;
}

/**
 * Get business analytics data
 * @param {string} timeRange - 'today' | 'week' | 'month'
 * @returns {Promise<Object>} Analytics data
 */
export async function getBusinessAnalytics(timeRange = 'week') {
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/business/analytics?timeRange=${timeRange}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Analytics fetch failed');
  return data.data;
}

/**
 * Get AI business suggestions
 * @param {Object} context - Business context (revenue, transactions, etc.)
 * @returns {Promise<{suggestions: Array, reasoning: string}>}
 */
export async function getBusinessSuggestions(context = {}) {
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/business/suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Suggestions failed');
  return data.data;
}

/**
 * Summarize notifications
 * @param {Array} notifications - List of notification objects
 * @returns {Promise<{summary: string, urgent: string[], pending: string[], info: string[]}>}
 */
export async function summarizeNotifications(notifications = []) {
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/business/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notifications }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Notification summary failed');
  return data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// STORED DATA API — Retrieve data from MongoDB
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all payment links from MongoDB
 * @param {string} userId - User ID to filter by (defaults to current user)
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<{items: Array, total: number, page: number}>}
 */
export async function getPaymentLinks(userId = null, page = 1, limit = 50) {
  const params = new URLSearchParams();
  const currentUserId = userId || getUserId();
  if (currentUserId) params.append('userId', currentUserId);
  params.append('page', page);
  params.append('limit', limit);
  
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/business/links?${params}`, {
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch payment links');
  return data.data;
}

/**
 * Get all QR codes from MongoDB
 * @param {string} userId - User ID to filter by (defaults to current user)
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<{items: Array, total: number, page: number}>}
 */
export async function getQRCodes(userId = null, page = 1, limit = 50) {
  const params = new URLSearchParams();
  const currentUserId = userId || getUserId();
  if (currentUserId) params.append('userId', currentUserId);
  params.append('page', page);
  params.append('limit', limit);
  
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/business/qrcodes?${params}`, {
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch QR codes');
  return data.data;
}

/**
 * Get all invoices from MongoDB
 * @param {string} userId - User ID to filter by (defaults to current user)
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<{items: Array, total: number, page: number}>}
 */
export async function getInvoices(userId = null, page = 1, limit = 50) {
  const params = new URLSearchParams();
  const currentUserId = userId || getUserId();
  if (currentUserId) params.append('userId', currentUserId);
  params.append('page', page);
  params.append('limit', limit);
  
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/business/invoices?${params}`, {
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch invoices');
  return data.data;
}

/**
 * Get comprehensive business statistics from MongoDB
 * @param {string} userId - User ID to filter by (defaults to current user)
 * @returns {Promise<{links: Object, qrcodes: Object, invoices: Object, analytics: Object}>}
 */
export async function getBusinessStats(userId = null) {
  const currentUserId = userId || getUserId();
  const params = currentUserId ? `?userId=${currentUserId}` : '';
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/business/stats${params}`, {
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch business stats');
  return data.data;
}

export default {
  checkAIStatus,
  generateForm,
  merchantAssist,
  executeMerchantAction,
  analyzeMetrics,
  getAutoAnalytics,
  supportChat,
  chat,
  getInsights,
  suggestWorkflows,
  generateInvoice,
  analyzeFraud,
  getAIConfig,
  configureAI,
  testAIConnection,
  businessChat,
  getBusinessAnalytics,
  getBusinessSuggestions,
  summarizeNotifications,
  getPaymentLinks,
  getQRCodes,
  getInvoices,
  getBusinessStats,
};
