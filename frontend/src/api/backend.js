import { FraudService } from './services/fraudService.js'
import { GatewayService, GATEWAYS } from './services/gatewayService.js'
import { AnalyticsService as LocalAnalyticsService } from './services/analyticsService.js'
import { buildUPIString, getQRImageUrl } from './services/qrService.js'
import { FREQUENCIES } from './services/subscriptionService.js'
import { WebhookService as _WebhookService } from './services/webhookService.js'

const DEFAULT_DEV_API_BASE_URL =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : 'http://localhost:3000'

const EXPLICIT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function getRequestTargets(path) {
  const bases = []

  if (EXPLICIT_API_BASE_URL) {
    bases.push(EXPLICIT_API_BASE_URL)
  } else if (import.meta.env.DEV) {
    bases.push('')
    bases.push(DEFAULT_DEV_API_BASE_URL)
  } else {
    bases.push('')
  }

  const seen = new Set()
  return bases
    .map((base) => `${base}${path}`)
    .filter((url) => {
      if (seen.has(url)) return false
      seen.add(url)
      return true
    })
}

async function parseResponse(response) {
  const text = await response.text()

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

async function request(path, options = {}) {
  const targets = getRequestTargets(path)
  let lastError = null

  const token = localStorage.getItem('payapp_access_token') || localStorage.getItem('payment_app_access_token')

  for (const target of targets) {
    try {
      const response = await fetch(target, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
      })

      const data = await parseResponse(response)

      if (response.ok) {
        return data
      }

      lastError = new Error(data.error || data.message || `Request failed with status ${response.status}`)

      if (import.meta.env.DEV && [404, 502, 503, 504].includes(response.status)) {
        continue
      }

      throw lastError
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw lastError || new Error('Request failed')
}

export const PaymentMethod = {
  UPI_ID: 'upi_id',
  MOBILE_NUMBER: 'mobile_number',
}

export const TransactionStatus = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
}

export function generateTransactionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `TXN${Date.now().toString(36)}${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`.toUpperCase()
  }

  return `TXN${Date.now().toString(36)}${Math.random().toString(16).slice(2, 14)}`.toUpperCase()
}

export function validateTransaction(transaction) {
  const errors = []

  if (!transaction.payment_method) {
    errors.push('payment_method is required')
  } else if (!Object.values(PaymentMethod).includes(transaction.payment_method)) {
    errors.push('payment_method must be "upi_id" or "mobile_number"')
  }

  if (transaction.payment_method === PaymentMethod.UPI_ID) {
    if (!transaction.upi_id) errors.push('upi_id is required')
    else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(transaction.upi_id)) {
      errors.push('Invalid UPI ID format')
    }
  }

  if (transaction.payment_method === PaymentMethod.MOBILE_NUMBER) {
    if (!transaction.mobile_number) errors.push('mobile_number is required')
    else if (!/^[6-9]\d{9}$/.test(transaction.mobile_number.replace(/[\s-]/g, ''))) {
      errors.push('Invalid mobile number (10-digit Indian number)')
    }
  }

  if (transaction.amount === undefined || transaction.amount === null) {
    errors.push('amount is required')
  } else if (typeof transaction.amount !== 'number' || Number.isNaN(transaction.amount) || transaction.amount <= 0) {
    errors.push('amount must be a positive number')
  }

  if (!transaction.recipient_name || transaction.recipient_name.trim().length < 2) {
    errors.push('recipient_name must be at least 2 characters')
  }

  if (transaction.status && !Object.values(TransactionStatus).includes(transaction.status)) {
    errors.push('status must be pending, success, or failed')
  }

  return { valid: errors.length === 0, errors }
}

export function createTransaction(data) {
  return {
    payment_method: data.payment_method,
    upi_id: data.payment_method === PaymentMethod.UPI_ID ? data.upi_id : undefined,
    mobile_number: data.payment_method === PaymentMethod.MOBILE_NUMBER ? data.mobile_number : undefined,
    recipient_name: data.recipient_name,
    amount: data.amount,
    note: data.note || '',
    status: data.status || TransactionStatus.PENDING,
    transaction_id: data.transaction_id || generateTransactionId(),
  }
}

export function sanitizeTransaction(transaction) {
  return {
    ...transaction,
    recipient_name: transaction.recipient_name?.trim(),
    note: transaction.note?.trim() || '',
    upi_id: transaction.upi_id?.toLowerCase().trim(),
    mobile_number: transaction.mobile_number?.replace(/[\s-]/g, ''),
  }
}

export function sanitizeString(input) {
  if (typeof input !== 'string') return ''
  return input.replace(/[<>]/g, '').replace(/javascript:/gi, '').replace(/on\w+=/gi, '').trim()
}

export function sanitizeNumber(input, options = {}) {
  const { min = 0, max = Number.MAX_SAFE_INTEGER } = options
  const num = typeof input === 'string' ? Number.parseFloat(input) : input
  if (typeof num !== 'number' || Number.isNaN(num) || num < min || num > max) {
    return null
  }
  return num
}

export function sanitizeUpiId(upiId) {
  if (typeof upiId !== 'string') return null
  const sanitized = upiId.toLowerCase().trim()
  return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(sanitized) ? sanitized : null
}

export function sanitizeMobileNumber(mobile) {
  if (typeof mobile !== 'string') return null
  const cleaned = mobile.replace(/[\s-]/g, '').replace(/^(\+91|91)/, '')
  return /^[6-9]\d{9}$/.test(cleaned) ? cleaned : null
}

export function sanitizeAmount(amount, options = {}) {
  const { min = 1, max = 1000000 } = options
  const sanitized = sanitizeNumber(amount, { min, max })
  if (sanitized === null) return null
  return Math.round(sanitized * 100) / 100
}

export function sanitizeNote(note, maxLength = 256) {
  if (typeof note !== 'string') return ''
  return sanitizeString(note).slice(0, maxLength)
}

export function sanitizeRecipientName(name) {
  if (typeof name !== 'string') return null
  const sanitized = sanitizeString(name)
  if (sanitized.length < 2) return null
  return /^[a-zA-Z\s.'-]+$/.test(sanitized) ? sanitized : null
}

export const RecipientCategory = {
  FAMILY: 'family',
  FRIENDS: 'friends',
  BILLS: 'bills',
  BUSINESS: 'business',
  OTHER: 'other',
}

export function validateRecipient(recipient) {
  const errors = []

  if (!recipient.name || typeof recipient.name !== 'string') {
    errors.push('Recipient name is required')
  } else if (recipient.name.trim().length < 2) {
    errors.push('Recipient name must be at least 2 characters')
  }

  if (!recipient.payment_method) {
    errors.push('Payment method is required')
  } else if (!Object.values(PaymentMethod).includes(recipient.payment_method)) {
    errors.push('Payment method must be either "upi_id" or "mobile_number"')
  }

  if (recipient.payment_method === PaymentMethod.UPI_ID) {
    if (!recipient.upi_id || typeof recipient.upi_id !== 'string') {
      errors.push('UPI ID is required when payment_method is "upi_id"')
    } else if (!sanitizeUpiId(recipient.upi_id)) {
      errors.push('Invalid UPI ID format')
    }
  }

  if (recipient.payment_method === PaymentMethod.MOBILE_NUMBER) {
    if (!recipient.mobile_number || typeof recipient.mobile_number !== 'string') {
      errors.push('Mobile number is required when payment_method is "mobile_number"')
    } else if (!sanitizeMobileNumber(recipient.mobile_number)) {
      errors.push('Invalid mobile number format (must be 10-digit Indian number)')
    }
  }

  if (!recipient.nickname || typeof recipient.nickname !== 'string') {
    errors.push('Nickname is required')
  } else if (recipient.nickname.trim().length < 2) {
    errors.push('Nickname must be at least 2 characters')
  }

  if (recipient.category && !Object.values(RecipientCategory).includes(recipient.category)) {
    errors.push('Invalid category')
  }

  if (recipient.last_amount !== undefined && recipient.last_amount !== null) {
    if (typeof recipient.last_amount !== 'number' || recipient.last_amount <= 0) {
      errors.push('Last amount must be a positive number')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function sanitizeRecipient(recipient) {
  return {
    ...recipient,
    name: recipient.name?.trim(),
    nickname: recipient.nickname?.trim(),
    upi_id: recipient.upi_id?.toLowerCase().trim(),
    mobile_number: recipient.mobile_number?.replace(/[\s-]/g, ''),
    category: recipient.category || RecipientCategory.OTHER,
  }
}

export function updateRecipientUsage(recipient, amount) {
  return {
    ...recipient,
    last_used: new Date().toISOString(),
    usage_count: (recipient.usage_count || 0) + 1,
    last_amount: amount || recipient.last_amount,
  }
}

export function sanitizeTransactionData(transaction) {
  const errors = []
  const sanitized = {}

  if (Object.values(PaymentMethod).includes(transaction.payment_method)) {
    sanitized.payment_method = transaction.payment_method
  } else {
    errors.push('Invalid payment_method')
  }

  if (sanitized.payment_method === PaymentMethod.UPI_ID) {
    const upiId = sanitizeUpiId(transaction.upi_id)
    if (upiId) sanitized.upi_id = upiId
    else errors.push('Invalid UPI ID')
  }

  if (sanitized.payment_method === PaymentMethod.MOBILE_NUMBER) {
    const mobile = sanitizeMobileNumber(transaction.mobile_number)
    if (mobile) sanitized.mobile_number = mobile
    else errors.push('Invalid mobile number')
  }

  const recipientName = sanitizeRecipientName(transaction.recipient_name)
  if (recipientName) sanitized.recipient_name = recipientName
  else errors.push('Invalid recipient name (letters only, min 2 chars)')

  const amount = sanitizeAmount(transaction.amount)
  if (amount !== null) sanitized.amount = amount
  else errors.push('Invalid amount (Rs. 1 - Rs. 10,00,000)')

  sanitized.note = sanitizeNote(transaction.note || '')

  return { sanitized, errors }
}

export const RBI_DISCLAIMER = {
  short: 'RBI-regulated payment service',
  full: 'This is an RBI-regulated payment service. All transactions are encrypted with 256-bit encryption.',
  trustSignal: '256-bit encrypted | RBI compliant',
}

export function getRBIDisclaimer(type = 'full') {
  return RBI_DISCLAIMER[type] || RBI_DISCLAIMER.full
}

export function createSafeInputHandler(setValue, sanitizer = sanitizeString) {
  return (value) => setValue(sanitizer(value))
}

export const AuthError = {
  UNAUTHORIZED: 'unauthorized',
  USER_NOT_REGISTERED: 'user_not_registered',
  SESSION_EXPIRED: 'session_expired',
  INVALID_TOKEN: 'invalid_token',
}

const TOKEN_KEY = 'payment_app_access_token'
const TOKEN_EXPIRY_KEY = 'payment_app_token_expiry'

export function storeToken(token, expiresIn = 3600) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresIn * 1000))
}

export function getStoredToken() {
  const token = localStorage.getItem(TOKEN_KEY)
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
  if (!token) return null
  if (expiry && Date.now() > Number.parseInt(expiry, 10)) {
    clearToken()
    return null
  }
  return token
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXPIRY_KEY)
}

export async function initializeAuthFromUrl() {
  return false
}

export const TransactionAPI = {
  async create(transactionData) {
    // Fraud check with cached/lightweight fetch — only fetch recent 20 for pattern detection
    const existing = await this.list({ limit: 20 })
      .then((result) => result.data || [])
      .catch(() => [])
    const fraud = FraudService.check(transactionData, existing)
    if (fraud.blocked) {
      return { success: false, error: `Transaction blocked: ${fraud.flags[0]}`, fraud }
    }

    const result = await request('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    })

    if (result.success) {
      _WebhookService.emit('payment.success', result.data)
        .catch((err) => {
          if (import.meta.env.DEV) {
            console.warn('[TransactionAPI] Webhook emit failed:', err.message)
          }
        })
    }

    return result
  },
  async list(options = {}) {
    const params = new URLSearchParams()
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value))
      }
    })
    const query = params.toString()
    return request(`/api/transactions${query ? `?${query}` : ''}`)
  },
  async getById(id) {
    return request(`/api/transactions/${id}`)
  },
  async updateStatus(id, status) {
    return request(`/api/transactions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },
  async getAnalytics(userId, options = {}) {
    const params = new URLSearchParams({
      days: options.days || 30,
    })
    return request(`/api/transactions/analytics/${userId}?${params.toString()}`)
  },
  async getTimeline(options = {}) {
    const params = new URLSearchParams({
      limit: options.limit || 50,
      user_id: options.userId || '',
    })
    return request(`/api/transactions/timeline?${params.toString()}`)
  },
  async getStats() {
    return request('/api/transactions/stats')
  },
  async search(query, options = {}) {
    const params = new URLSearchParams({
      q: query,
      page: options.page || 1,
      limit: options.limit || 20,
      user_id: options.userId || '',
    })
    return request(`/api/transactions/search?${params.toString()}`)
  },
}

export const RecipientAPI = {
  async create(recipientData) {
    return request('/api/recipients', {
      method: 'POST',
      body: JSON.stringify(recipientData),
    })
  },
  async list(options = {}) {
    const params = new URLSearchParams()
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value))
      }
    })
    const query = params.toString()
    return request(`/api/recipients${query ? `?${query}` : ''}`)
  },
  async getById(id) {
    return request(`/api/recipients/${id}`)
  },
  async update(id, data) {
    return request(`/api/recipients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
  async delete(id) {
    return request(`/api/recipients/${id}`, {
      method: 'DELETE',
    })
  },
  async updateUsage(id, amount) {
    return request(`/api/recipients/${id}/usage`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    })
  },
}

export const AuthAPI = {
  async me() {
    return request('/api/auth/me')
  },
  async logout() {
    const result = await request('/api/auth/logout', { method: 'POST' })
    clearToken()
    return result
  },
  getLoginRedirectUrl(redirectUri) {
    return redirectUri || '/'
  },
  async isUserRegistered() {
    try {
      const result = await this.me()
      return result.success
    } catch {
      return false
    }
  },
  async getPublicSettings() {
    return request('/api/settings/public')
  },
}

export async function getCurrentUser() {
  try {
    const result = await AuthAPI.me()
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export async function isAuthenticated() {
  const user = await getCurrentUser()
  return user !== null
}

export async function logout(clearStorage = true) {
  const result = await AuthAPI.logout()
  if (clearStorage) clearToken()
  return result
}

export function getLoginRedirectUrl(redirectUri) {
  return AuthAPI.getLoginRedirectUrl(redirectUri)
}

export function redirectToLogin(redirectUri) {
  window.location.href = getLoginRedirectUrl(redirectUri)
}

export async function getPublicSettings() {
  return AuthAPI.getPublicSettings()
}

export async function checkUserRegistration() {
  try {
    const result = await AuthAPI.me()
    if (result.success) return { registered: true, user: result.data }
    return { registered: false, error: AuthError.UNAUTHORIZED }
  } catch {
    return { registered: false, error: AuthError.UNAUTHORIZED }
  }
}

export async function requireAuth(next, redirectUrl = '/login') {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirectToLogin(redirectUrl)
    return null
  }

  const user = await getCurrentUser()
  return next(user)
}

export class PaymentBackend {
  constructor(options = {}) {
    this.options = { autoInitAuth: true, ...options }
  }

  async init() {
    if (this.options.autoInitAuth) {
      await initializeAuthFromUrl()
    }
    return healthCheck()
  }

  async createPayment(data) {
    const { sanitized, errors } = sanitizeTransactionData(data)
    if (errors.length > 0) return { success: false, errors }

    const validation = validateTransaction(sanitized)
    if (!validation.valid) return { success: false, errors: validation.errors }

    return TransactionAPI.create(sanitized)
  }

  async getPaymentHistory(options) {
    return TransactionAPI.list(options)
  }

  async getUser() {
    return getCurrentUser()
  }

  async isUserAuthenticated() {
    return isAuthenticated()
  }

  async logoutUser() {
    return logout()
  }

  getLoginUrl(redirectUri) {
    return getLoginRedirectUrl(redirectUri)
  }

  async checkCompliance() {
    return getPublicSettings()
  }
}

export function createBackend(options) {
  return new PaymentBackend(options)
}

export async function healthCheck() {
  return request('/api/health')
}

export const QRService = {
  create(payload) {
    return request('/api/qr/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  list() {
    return request('/api/qr')
  },
  get(ref) {
    return request(`/api/qr/ref/${ref}`)
  },
  delete(id) {
    return request(`/api/qr/${id}`, {
      method: 'DELETE',
    })
  },
  recordScan(ref) {
    return request(`/api/qr/${ref}/scan`, {
      method: 'POST',
    })
  },
}

export const PaymentLinkService = {
  create(payload) {
    return request('/api/links', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  list() {
    return request('/api/links')
  },
  getBySlug(slug) {
    return request(`/api/links/slug/${slug}`)
  },
  recordUse(slug) {
    return request(`/api/links/slug/${slug}/use`, {
      method: 'POST',
    })
  },
  deactivate(id) {
    return request(`/api/links/${id}/deactivate`, {
      method: 'PATCH',
    })
  },
  delete(id) {
    return request(`/api/links/${id}`, {
      method: 'DELETE',
    })
  },
}

export const SubscriptionService = {
  create(payload) {
    return request('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  list() {
    return request('/api/subscriptions')
  },
  getDue() {
    return request('/api/subscriptions/due')
  },
  markPaid(id, txnId) {
    return request(`/api/subscriptions/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify({ transactionId: txnId }),
    })
  },
  toggle(id) {
    return request(`/api/subscriptions/${id}/toggle`, {
      method: 'POST',
    })
  },
  delete(id) {
    return request(`/api/subscriptions/${id}`, {
      method: 'DELETE',
    })
  },
}

export const AnalyticsService = {
  ...LocalAnalyticsService,
  overview(options = {}) {
    const params = new URLSearchParams()
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value))
      }
    })
    const query = params.toString()
    return request(`/api/analytics/overview${query ? `?${query}` : ''}`)
  },
}

export { buildUPIString, getQRImageUrl, FraudService, FREQUENCIES, _WebhookService as WebhookService, GatewayService, GATEWAYS }

export default {
  PaymentBackend,
  createBackend,
}
