/**
 * Subscription / Recurring Payment Service
 * Reminder-based recurring UPI payments
 */

const STORAGE_KEY = 'subscriptions'

function getSubs() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveSubs(subs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subs))
}

export const FREQUENCIES = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
}

export const SubscriptionService = {
  create({ name, upiId, mobileNumber, paymentMethod, recipientName, amount, frequency, note, startDate }) {
    const sub = {
      id: `SUB_${Date.now()}`,
      name,
      payment_method: paymentMethod,
      upi_id: upiId || null,
      mobile_number: mobileNumber || null,
      recipient_name: recipientName,
      amount: parseFloat(amount),
      frequency,
      note: note || '',
      start_date: startDate || new Date().toISOString(),
      next_due: computeNextDue(startDate || new Date().toISOString(), frequency),
      is_active: true,
      created_at: new Date().toISOString(),
      payment_history: [],
    }
    const subs = getSubs()
    subs.unshift(sub)
    saveSubs(subs)
    return { success: true, data: sub }
  },

  list() {
    return { success: true, data: getSubs() }
  },

  getDue() {
    const now = new Date()
    const due = getSubs().filter(
      (s) => s.is_active && new Date(s.next_due) <= now
    )
    return { success: true, data: due }
  },

  markPaid(id, txnId) {
    const subs = getSubs()
    const idx = subs.findIndex((s) => s.id === id)
    if (idx !== -1) {
      subs[idx].payment_history.push({ paid_at: new Date().toISOString(), txn_id: txnId })
      subs[idx].next_due = computeNextDue(new Date().toISOString(), subs[idx].frequency)
      saveSubs(subs)
      return { success: true, data: subs[idx] }
    }
    return { success: false, error: 'Subscription not found' }
  },

  toggle(id) {
    const subs = getSubs()
    const idx = subs.findIndex((s) => s.id === id)
    if (idx !== -1) {
      subs[idx].is_active = !subs[idx].is_active
      saveSubs(subs)
      return { success: true, data: subs[idx] }
    }
    return { success: false, error: 'Subscription not found' }
  },

  delete(id) {
    saveSubs(getSubs().filter((s) => s.id !== id))
    return { success: true }
  },
}

function computeNextDue(fromDate, frequency) {
  const d = new Date(fromDate)
  switch (frequency) {
    case FREQUENCIES.WEEKLY: d.setDate(d.getDate() + 7); break
    case FREQUENCIES.MONTHLY: d.setMonth(d.getMonth() + 1); break
    case FREQUENCIES.QUARTERLY: d.setMonth(d.getMonth() + 3); break
    default: d.setMonth(d.getMonth() + 1)
  }
  return d.toISOString()
}

export default SubscriptionService
