import { getDatabase } from '../../db/mongo.js';
import { PaymentStatus } from '../payment/payment.model.js';

/**
 * Analytics Controller
 * Provides dashboard statistics, charts, and analytics data
 * Works with both MongoDB and in-memory data
 */

async function getPaymentsCollection() {
  try {
    const db = await getDatabase();
    return db.collection('payments');
  } catch (error) {
    return null;
  }
}

async function getTransactionsCollection() {
  try {
    const db = await getDatabase();
    return db.collection('transactions');
  } catch (error) {
    return null;
  }
}

/**
 * Get combined analytics data from both payments and transactions
 */
export async function getAnalyticsOverview(req, res, next) {
  try {
    const days = parseInt(req.query.days) || 7;
    const limit = parseInt(req.query.limit) || 5;

    let allTransactions = [];
    let payments = [];

    // Try MongoDB first
    const transactionsCollection = await getTransactionsCollection();
    const paymentsCollection = await getPaymentsCollection();

    if (transactionsCollection) {
      allTransactions = await transactionsCollection.find({}).toArray();
    }

    if (paymentsCollection) {
      payments = await paymentsCollection.find({}).toArray();
    }

    // Calculate date ranges
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate stats from transactions
    const successTxns = allTransactions.filter(t => t.status === 'success');
    const failedTxns = allTransactions.filter(t => t.status === 'failed');
    const pendingTxns = allTransactions.filter(t => t.status === 'pending');

    const todayTxns = successTxns.filter(t => {
      const txnDate = new Date(t.created_date);
      return txnDate >= todayStart;
    });
    
    const weekTxns = successTxns.filter(t => {
      const txnDate = new Date(t.created_date);
      return txnDate >= weekStart;
    });
    
    const monthTxns = successTxns.filter(t => {
      const txnDate = new Date(t.created_date);
      return txnDate >= monthStart;
    });

    const sum = (arr) => arr.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const stats = {
      total: { count: allTransactions.length, amount: sum(successTxns) },
      today: { count: todayTxns.length, amount: sum(todayTxns) },
      week: { count: weekTxns.length, amount: sum(weekTxns) },
      month: { count: monthTxns.length, amount: sum(monthTxns) },
      failed: { count: failedTxns.length },
      pending: { count: pendingTxns.length }
    };

    // Generate daily chart data
    const chart = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayTxns = successTxns.filter(t => {
        const txnDate = new Date(t.created_date);
        return txnDate >= dayStart && txnDate < dayEnd;
      });

      chart.push({
        date: dayStart.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        amount: dayTxns.reduce((acc, t) => acc + (Number(t.amount) || 0), 0),
        count: dayTxns.length
      });
    }

    // Get top recipients
    const recipientMap = {};
    successTxns.forEach(t => {
      const key = t.upi_id || t.mobile_number || 'unknown';
      if (!recipientMap[key]) {
        recipientMap[key] = { recipient: key, name: t.recipient_name || 'Unknown', count: 0, total: 0 };
      }
      recipientMap[key].count += 1;
      recipientMap[key].total += Number(t.amount) || 0;
    });

    const topRecipients = Object.values(recipientMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);

    // Get recent transactions
    let recent = [];
    if (transactionsCollection) {
      recent = await transactionsCollection
        .find({})
        .sort({ created_date: -1 })
        .limit(5)
        .toArray();
    }

    res.json({
      success: true,
      data: {
        stats,
        chart,
        topRecipients,
        recent: recent.map(t => ({
          id: t._id ? t._id.toString() : t.id,
          amount: t.amount,
          status: t.status,
          recipient_name: t.recipient_name || 'Unknown',
          upi_id: t.upi_id,
          mobile_number: t.mobile_number,
          created_date: t.created_date
        }))
      }
    });
  } catch (err) {
    console.error('Analytics error:', err);
    next(err);
  }
}

export default {
  getAnalyticsOverview
};
