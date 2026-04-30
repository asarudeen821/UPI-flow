import { ObjectId } from 'mongodb';
import { getDatabase } from '../../db/mongo.js';

export const SubscriptionStatus = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
};

export const SubscriptionFrequency = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
};

function normalize(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return {
    ...rest,
    id: _id.toString(),
    created_date: rest.created_date instanceof Date ? rest.created_date.toISOString() : rest.created_date,
    updated_date: rest.updated_date instanceof Date ? rest.updated_date.toISOString() : rest.updated_date,
    next_due: rest.next_due instanceof Date ? rest.next_due.toISOString() : rest.next_due,
    last_paid_date: rest.last_paid_date instanceof Date ? rest.last_paid_date.toISOString() : rest.last_paid_date,
    payment_history: rest.payment_history?.map((h) => ({
      ...h,
      paid_at: h.paid_at instanceof Date ? h.paid_at.toISOString() : h.paid_at,
    })),
  };
}

function computeNextDue(fromDate, frequency) {
  const date = new Date(fromDate || new Date());
  switch ((frequency || SubscriptionFrequency.MONTHLY).toLowerCase()) {
    case SubscriptionFrequency.WEEKLY:
      date.setDate(date.getDate() + 7);
      break;
    case SubscriptionFrequency.QUARTERLY:
      date.setMonth(date.getMonth() + 3);
      break;
    case SubscriptionFrequency.MONTHLY:
    default:
      date.setMonth(date.getMonth() + 1);
      break;
  }
  return date;
}

async function col() {
  const db = await getDatabase();
  const c = db.collection('subscriptions');
  await c.createIndex({ user_id: 1 });
  await c.createIndex({ status: 1 });
  await c.createIndex({ next_due: 1 });
  await c.createIndex({ frequency: 1 });
  return c;
}

export const SubscriptionModel = {
  async create({
    name,
    amount,
    frequency = SubscriptionFrequency.MONTHLY,
    recipient_name,
    upi_id,
    mobile_number,
    payment_method,
    note = '',
    user_id = 'user_1',
  }) {
    const collection = await col();
    const now = new Date();
    const doc = {
      name,
      amount,
      frequency,
      recipient_name,
      upi_id: upi_id || null,
      mobile_number: mobile_number || null,
      payment_method: payment_method || (upi_id ? 'upi_id' : 'mobile_number'),
      note,
      user_id,
      status: SubscriptionStatus.ACTIVE,
      is_active: true,
      payment_history: [],
      last_paid_date: null,
      last_transaction_id: null,
      next_due: computeNextDue(now, frequency),
      created_date: now,
      updated_date: now,
    };
    const result = await collection.insertOne(doc);
    return normalize({ ...doc, _id: result.insertedId });
  },

  async findById(id) {
    const collection = await col();
    const subscription = await collection.findOne({ _id: new ObjectId(id) });
    return normalize(subscription);
  },

  async findAll({ user_id = null, status = null } = {}) {
    const collection = await col();
    const query = {};
    if (user_id) query.user_id = user_id;
    if (status) query.status = status;

    const subscriptions = await collection.find(query).sort({ next_due: 1, name: 1 }).toArray();
    return subscriptions.map(normalize);
  },

  async findDue() {
    const collection = await col();
    const now = new Date();
    const subscriptions = await collection
      .find({
        status: SubscriptionStatus.ACTIVE,
        is_active: true,
        next_due: { $lte: now },
      })
      .sort({ next_due: 1 })
      .toArray();
    return subscriptions.map(normalize);
  },

  async update(id, updates) {
    const collection = await col();
    const updateDoc = {
      ...updates,
      updated_date: new Date(),
    };
    await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateDoc });
    const updated = await collection.findOne({ _id: new ObjectId(id) });
    return normalize(updated);
  },

  async recordPayment(id, transactionId) {
    const collection = await col();
    const subscription = await collection.findOne({ _id: new ObjectId(id) });
    if (!subscription) return null;

    const paymentHistory = subscription.payment_history || [];
    paymentHistory.push({
      paid_at: new Date(),
      txn_id: transactionId,
    });

    const updateDoc = {
      payment_history: paymentHistory,
      last_paid_date: new Date(),
      last_transaction_id: transactionId,
      next_due: computeNextDue(new Date(), subscription.frequency),
      updated_date: new Date(),
    };

    await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateDoc });
    const updated = await collection.findOne({ _id: new ObjectId(id) });
    return normalize(updated);
  },

  async toggle(id) {
    const collection = await col();
    const subscription = await collection.findOne({ _id: new ObjectId(id) });
    if (!subscription) return null;

    const currentlyActive = subscription.status === SubscriptionStatus.ACTIVE && subscription.is_active !== false;
    const newStatus = currentlyActive ? SubscriptionStatus.PAUSED : SubscriptionStatus.ACTIVE;
    const newIsActive = !currentlyActive;

    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: newStatus,
          is_active: newIsActive,
          updated_date: new Date(),
        },
      }
    );

    const updated = await collection.findOne({ _id: new ObjectId(id) });
    return normalize(updated);
  },

  async delete(id) {
    const collection = await col();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  },
};

export default SubscriptionModel;
