import { ObjectId } from 'mongodb';
import { getDatabase } from '../../db/mongo.js';

export const TransactionStatus = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
};

export const PaymentMethod = {
  UPI_ID: 'upi_id',
  MOBILE_NUMBER: 'mobile_number',
  QR_CODE: 'qr_code',
  PAYMENT_LINK: 'payment_link',
};

function normalize(doc) {
  if (!doc) return null;
  try {
    const { _id, ...rest } = doc;
    const createdDate = rest.created_date instanceof Date ? rest.created_date : new Date(rest.created_date);
    
    return {
      ...rest,
      id: _id?.toString ? _id.toString() : String(_id),
      created_date: createdDate.toISOString(),
      updated_date: rest.updated_date instanceof Date ? rest.updated_date.toISOString() : rest.updated_date,
      // Enhanced timestamp fields for transaction history
      payment_date: createdDate.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      payment_time: createdDate.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      payment_day: createdDate.toLocaleDateString('en-IN', { 
        weekday: 'long' 
      }),
      payment_timestamp: createdDate.getTime(),
      is_today: isToday(createdDate),
      is_yesterday: isYesterday(createdDate),
      direction: rest.direction || 'sent',
      sender_name: rest.sender_name || null,
    };
  } catch (error) {
    console.error('[normalize] Error normalizing document:', error.message);
    console.error('[normalize] Document:', JSON.stringify(doc, null, 2));
    throw error;
  }
}

// Helper functions for date comparison
function isToday(date) {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

function isYesterday(date) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
}

async function col() {
  const db = await getDatabase();
  const c = db.collection('transactions');
  
  // Create only necessary indexes
  await c.createIndex({ transaction_id: 1 }, { unique: true });
  await c.createIndex({ status: 1, created_date: -1 });
  await c.createIndex({ created_date: -1 });
  await c.createIndex({ user_id: 1, created_date: -1 });
  await c.createIndex({ recipient_id: 1 });
  await c.createIndex({ upi_id: 1 });
  
  return c;
}

export const TransactionModel = {
  async create({
    payment_method,
    upi_id,
    mobile_number,
    recipient_name,
    recipient_id,
    amount,
    note = '',
    status = TransactionStatus.PENDING,
    transaction_id,
    user_id = 'user_1',
    gateway_order_id,
    payment_id,
    direction = 'sent',
    sender_name,
  }) {
    const collection = await col();
    const doc = {
      payment_method,
      upi_id: upi_id || null,
      mobile_number: mobile_number || null,
      recipient_name: recipient_name || 'Unknown',
      recipient_id: recipient_id ? new ObjectId(recipient_id) : null,
      amount,
      note,
      status,
      transaction_id: transaction_id || `TXN${Date.now()}${Math.random().toString(16).slice(2, 6)}`,
      user_id,
      gateway_order_id: gateway_order_id || null,
      payment_id: payment_id || null,
      error: null,
      direction: direction || 'sent',
      sender_name: sender_name || null,
      created_date: new Date(),
      updated_date: new Date(),
    };
    const result = await collection.insertOne(doc);
    return normalize({ ...doc, _id: result.insertedId });
  },

  async findById(id) {
    const collection = await col();
    const transaction = await collection.findOne({ _id: new ObjectId(id) });
    return normalize(transaction);
  },

  async findByTransactionId(transactionId) {
    const collection = await col();
    const transaction = await collection.findOne({ transaction_id: transactionId });
    return normalize(transaction);
  },

  async findAll({ page = 1, limit = 20, status = null, user_id = null } = {}) {
    try {
      const collection = await col();
      const query = {};
      if (status) query.status = status;
      if (user_id) query.user_id = user_id;

      console.log('[TransactionModel.findAll] Query:', query, 'Page:', page, 'Limit:', limit);

      const [items, total] = await Promise.all([
        collection
          .find(query)
          .sort({ created_date: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        collection.countDocuments(query),
      ]);
      
      console.log('[TransactionModel.findAll] Found', items.length, 'items');
      
      return { items: items.map(normalize), total, page, limit };
    } catch (error) {
      console.error('[TransactionModel.findAll] Error:', error.message);
      console.error('[TransactionModel.findAll] Stack:', error.stack);
      throw error;
    }
  },

  async updateStatus(id, status, error = null) {
    const collection = await col();
    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          error,
          updated_date: new Date(),
        },
      }
    );
    const updated = await collection.findOne({ _id: new ObjectId(id) });
    return normalize(updated);
  },

  async updateStatusByTransactionId(transactionId, status, error = null) {
    const collection = await col();
    await collection.updateOne(
      { transaction_id: transactionId },
      {
        $set: {
          status,
          error,
          updated_date: new Date(),
        },
      }
    );
    const updated = await collection.findOne({ transaction_id: transactionId });
    return normalize(updated);
  },

  async delete(id) {
    const collection = await col();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  },

  async getStats() {
    const collection = await col();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, success, failed, pending, todayTxns, weekTxns, monthTxns] = await Promise.all([
      collection.countDocuments(),
      collection.countDocuments({ status: TransactionStatus.SUCCESS }),
      collection.countDocuments({ status: TransactionStatus.FAILED }),
      collection.countDocuments({ status: TransactionStatus.PENDING }),
      collection.countDocuments({ status: TransactionStatus.SUCCESS, created_date: { $gte: todayStart } }),
      collection.countDocuments({ status: TransactionStatus.SUCCESS, created_date: { $gte: weekStart } }),
      collection.countDocuments({ status: TransactionStatus.SUCCESS, created_date: { $gte: monthStart } }),
    ]);

    const [todayAmount, weekAmount, monthAmount, totalAmount] = await Promise.all([
      collection.aggregate([
        { $match: { status: TransactionStatus.SUCCESS, created_date: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).toArray(),
      collection.aggregate([
        { $match: { status: TransactionStatus.SUCCESS, created_date: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).toArray(),
      collection.aggregate([
        { $match: { status: TransactionStatus.SUCCESS, created_date: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).toArray(),
      collection.aggregate([
        { $match: { status: TransactionStatus.SUCCESS } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).toArray(),
    ]);

    return {
      total: { count: total, amount: totalAmount[0]?.total || 0 },
      today: { count: todayTxns, amount: todayAmount[0]?.total || 0 },
      week: { count: weekTxns, amount: weekAmount[0]?.total || 0 },
      month: { count: monthTxns, amount: monthAmount[0]?.total || 0 },
      failed: { count: failed },
      pending: { count: pending },
    };
  },

  async getChartData(days = 7) {
    const collection = await col();
    const now = new Date();
    const chart = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [dayTxns] = await collection.aggregate([
        {
          $match: {
            status: TransactionStatus.SUCCESS,
            created_date: { $gte: dayStart, $lt: dayEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]).toArray();

      chart.push({
        date: dayStart.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        amount: dayTxns?.total || 0,
        count: dayTxns?.count || 0,
      });
    }

    return chart;
  },

  async getTopRecipients(limit = 5) {
    const collection = await col();
    const recipients = await collection.aggregate([
      { $match: { status: TransactionStatus.SUCCESS } },
      {
        $group: {
          _id: '$upi_id',
          recipient: { $first: '$upi_id' },
          name: { $first: '$recipient_name' },
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { total: -1 } },
      { $limit: limit },
    ]).toArray();

    return recipients.map((r) => ({
      recipient: r.recipient,
      name: r.name,
      count: r.count,
      total: r.total,
    }));
  },

  async getRecent(limit = 5) {
    const collection = await col();
    const transactions = await collection
      .find({})
      .sort({ created_date: -1 })
      .limit(limit)
      .toArray();

    return transactions.map((t) => normalize({ ...t, _id: t._id }));
  },

  // New methods for enhanced transaction history
  async findAllWithHistory({ page = 1, limit = 20, query = {} } = {}) {
    try {
      const collection = await col();
      
      const [items, total] = await Promise.all([
        collection
          .find(query)
          .sort({ created_date: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        collection.countDocuments(query),
      ]);

      return { 
        items: items.map(normalize), 
        total, 
        page, 
        limit 
      };
    } catch (error) {
      console.error('[TransactionModel.findAllWithHistory] Error:', error.message);
      throw error;
    }
  },

  async findTimeline(limit = 50, user_id = null) {
    try {
      const collection = await col();
      const query = { status: TransactionStatus.SUCCESS };
      if (user_id) query.user_id = user_id;
      
      const transactions = await collection
        .find(query)
        .sort({ created_date: -1 })
        .limit(limit)
        .toArray();

      // Group transactions by date
      const groupedByDate = {};

      transactions.forEach(txn => {
        const normalized = normalize({ ...txn, _id: txn._id });
        const dateKey = normalized.payment_date;

        if (!groupedByDate[dateKey]) {
          groupedByDate[dateKey] = {
            date: normalized.payment_date,
            day: normalized.payment_day,
            timestamp: normalized.payment_timestamp,
            is_today: normalized.is_today,
            is_yesterday: normalized.is_yesterday,
            transactions: [],
            total_amount: 0,
            count: 0,
          };
        }

        groupedByDate[dateKey].transactions.push(normalized);
        groupedByDate[dateKey].total_amount += normalized.amount;
        groupedByDate[dateKey].count += 1;
      });

      // Convert to array and sort by timestamp
      return Object.values(groupedByDate).sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('[TransactionModel.findTimeline] Error:', error.message);
      throw error;
    }
  },

  async countTransactionsSince(sinceDate) {
    try {
      const collection = await col();
      const count = await collection.countDocuments({
        status: TransactionStatus.SUCCESS,
        created_date: { $gte: sinceDate },
      });
      return count;
    } catch (error) {
      console.error('[TransactionModel.countTransactionsSince] Error:', error.message);
      return 0;
    }
  },
};

export default TransactionModel;
