/**
 * Fraud Detection Service
 * Duplicate detection, rate limiting, velocity checks
 */

const FRAUD_LOG_KEY = 'fraud_log'
const RATE_LIMIT_KEY = 'rate_limit_log'

function getFraudLog() {
  try { return JSON.parse(localStorage.getItem(FRAUD_LOG_KEY) || '[]') } catch { return [] }
}
function getRateLog() {
  try { return JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '[]') } catch { return [] }
}

const RULES = {
  MAX_AMOUNT: 100000,
  DUPLICATE_WINDOW_MS: 60000,       // 1 min
  RATE_LIMIT_WINDOW_MS: 300000,     // 5 min
  RATE_LIMIT_MAX_TXN: 10,
  SUSPICIOUS_AMOUNT_THRESHOLD: 49999,
}

export const FraudService = {
  /**
   * Run all fraud checks on a transaction
   * Returns { safe: boolean, flags: string[], riskScore: number }
   */
  check(transaction, existingTransactions = []) {
    const flags = []
    let riskScore = 0

    // 1. Amount limit
    if (transaction.amount > RULES.MAX_AMOUNT) {
      flags.push(`Amount ₹${transaction.amount} exceeds single transaction limit of ₹${RULES.MAX_AMOUNT}`)
      riskScore += 40
    }

    // 2. Suspicious round amount just below reporting threshold
    if (transaction.amount >= RULES.SUSPICIOUS_AMOUNT_THRESHOLD && transaction.amount < 50000) {
      flags.push('Amount is suspiciously close to reporting threshold (₹50,000)')
      riskScore += 20
    }

    // 3. Duplicate detection (same recipient + amount within window)
    const windowStart = Date.now() - RULES.DUPLICATE_WINDOW_MS
    const duplicate = existingTransactions.find((t) => {
      const tDate = new Date(t.created_date).getTime()
      return (
        tDate > windowStart &&
        t.amount === transaction.amount &&
        (t.upi_id === transaction.upi_id || t.mobile_number === transaction.mobile_number)
      )
    })
    if (duplicate) {
      flags.push(`Duplicate transaction detected: same recipient and amount within 1 minute (Ref: ${duplicate.transaction_id})`)
      riskScore += 60
    }

    // 4. Rate limiting
    const rateLog = getRateLog()
    const rateWindow = Date.now() - RULES.RATE_LIMIT_WINDOW_MS
    const recentCount = rateLog.filter((t) => t > rateWindow).length
    if (recentCount >= RULES.RATE_LIMIT_MAX_TXN) {
      flags.push(`Rate limit exceeded: ${recentCount} transactions in the last 5 minutes`)
      riskScore += 50
    }

    // Log this attempt
    const updatedLog = [...rateLog.filter((t) => t > rateWindow), Date.now()]
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(updatedLog))

    // 5. Log fraud flags
    if (flags.length > 0) {
      const fraudLog = getFraudLog()
      fraudLog.unshift({
        timestamp: new Date().toISOString(),
        transaction: { amount: transaction.amount, recipient: transaction.upi_id || transaction.mobile_number },
        flags,
        riskScore,
      })
      localStorage.setItem(FRAUD_LOG_KEY, JSON.stringify(fraudLog.slice(0, 100)))
    }

    return {
      safe: riskScore < 60,
      flags,
      riskScore,
      blocked: riskScore >= 60,
    }
  },

  getFraudLog() {
    return getFraudLog()
  },

  clearFraudLog() {
    localStorage.removeItem(FRAUD_LOG_KEY)
    localStorage.removeItem(RATE_LIMIT_KEY)
  },
}

export default FraudService
