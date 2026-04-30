/**
 * Webhook Service
 * Simulates webhook delivery with retry, logging, and status tracking
 */

const WEBHOOK_LOG_KEY = 'webhook_log'
const WEBHOOK_CONFIG_KEY = 'webhook_config'

function getLog() {
  try { return JSON.parse(localStorage.getItem(WEBHOOK_LOG_KEY) || '[]') } catch { return [] }
}

export const WebhookService = {
  getConfig() {
    try { return JSON.parse(localStorage.getItem(WEBHOOK_CONFIG_KEY) || 'null') } catch { return null }
  },

  saveConfig({ url, secret, events }) {
    localStorage.setItem(WEBHOOK_CONFIG_KEY, JSON.stringify({ url, secret, events: events || ['payment.success', 'payment.failed', 'payment.pending'] }))
    return { success: true }
  },

  async emit(event, payload) {
    try {
      const config = this.getConfig()
      const entry = {
        id: `WH_${Date.now()}`,
        event,
        payload,
        timestamp: new Date().toISOString(),
        status: 'pending',
        attempts: 0,
        response: null,
      }

      if (!config?.url) {
        entry.status = 'skipped'
        entry.response = 'No webhook URL configured'
        this._log(entry)
        return { success: true, skipped: true }
      }

      // Attempt delivery
      for (let attempt = 1; attempt <= 3; attempt++) {
        entry.attempts = attempt
        try {
          const res = await fetch(config.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-PayApp-Event': event,
              'X-PayApp-Signature': await this._sign(JSON.stringify(payload), config.secret || ''),
            },
            body: JSON.stringify({ event, data: payload, timestamp: entry.timestamp }),
          })
          entry.status = res.ok ? 'delivered' : 'failed'
          entry.response = `HTTP ${res.status}`
          if (res.ok) break
        } catch (err) {
          entry.status = 'failed'
          entry.response = err.message
        }
        if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt))
      }

      this._log(entry)
      return { success: entry.status === 'delivered', entry }
    } catch (error) {
      // Silently fail - webhooks are non-critical
      console.warn('[WebhookService] Emit failed:', error.message)
      return { success: false, error: error.message }
    }
  },

  _log(entry) {
    const log = getLog()
    log.unshift(entry)
    localStorage.setItem(WEBHOOK_LOG_KEY, JSON.stringify(log.slice(0, 200)))
  },

  getLog() { return getLog() },

  async _sign(body, secret) {
    try {
      if (!secret) return 'no-secret'
      const enc = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
      return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
    } catch (error) {
      console.warn('[WebhookService] Signature failed:', error.message)
      return 'signature-error'
    }
  },
}

export default WebhookService
