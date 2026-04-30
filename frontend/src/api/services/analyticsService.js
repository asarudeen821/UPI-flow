/**
 * Analytics Service
 * Revenue charts, daily/weekly stats, failed payment tracking
 */

export const AnalyticsService = {
  computeStats(transactions = []) {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 6)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const success = transactions.filter((t) => t.status === 'success')
    const failed = transactions.filter((t) => t.status === 'failed')
    const pending = transactions.filter((t) => t.status === 'pending')

    const todayTxns = success.filter((t) => new Date(t.created_date) >= todayStart)
    const weekTxns = success.filter((t) => new Date(t.created_date) >= weekStart)
    const monthTxns = success.filter((t) => new Date(t.created_date) >= monthStart)

    const sum = (arr) => arr.reduce((acc, t) => acc + (t.amount || 0), 0)

    return {
      total: { count: transactions.length, amount: sum(success) },
      today: { count: todayTxns.length, amount: sum(todayTxns) },
      week: { count: weekTxns.length, amount: sum(weekTxns) },
      month: { count: monthTxns.length, amount: sum(monthTxns) },
      success: { count: success.length, amount: sum(success) },
      failed: { count: failed.length },
      pending: { count: pending.length },
      successRate: transactions.length > 0 ? Math.round((success.length / transactions.length) * 100) : 0,
    }
  },

  getDailyChart(transactions = [], days = 7) {
    const result = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const dayTxns = transactions.filter((t) => {
        const td = new Date(t.created_date)
        return td >= dayStart && td < dayEnd && t.status === 'success'
      })

      result.push({
        date: dayStart.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        amount: dayTxns.reduce((acc, t) => acc + (t.amount || 0), 0),
        count: dayTxns.length,
      })
    }
    return result
  },

  getTopRecipients(transactions = [], limit = 5) {
    const map = {}
    transactions
      .filter((t) => t.status === 'success')
      .forEach((t) => {
        const key = t.upi_id || t.mobile_number || 'unknown'
        if (!map[key]) map[key] = { recipient: key, name: t.recipient_name, count: 0, total: 0 }
        map[key].count += 1
        map[key].total += t.amount || 0
      })
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, limit)
  },
}

export default AnalyticsService
