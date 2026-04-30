import { ObjectId } from 'mongodb';
import { getDatabase } from '../../db/mongo.js';

export const PaymentStatus = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
};

function normalize(document) {
  if (!document) {
    return null;
  }

  const { _id, ...rest } = document;
  return {
    ...rest,
    id: _id.toString(),
    createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
    updatedAt: rest.updatedAt instanceof Date ? rest.updatedAt.toISOString() : rest.updatedAt,
  };
}

async function col() {
  const db = await getDatabase();
  const c = db.collection('payments');
  await c.createIndex({ orderId: 1 }, { unique: true, sparse: true });
  await c.createIndex({ userId: 1, createdAt: -1 });
  await c.createIndex({ status: 1, createdAt: -1 });
  return c;
}

export const PaymentModel = {
  async create({
    orderId,
    amount,
    currency = 'INR',
    userId,
    recipientName,
    upiId,
    note,
    gateway = 'mock',
    receipt = null,
    source = 'checkout',
  }) {
    const collection = await col();
    const doc = {
      orderId,
      amount,
      currency,
      userId: userId || 'anonymous',
      recipientName: recipientName || 'PayApp Merchant',
      upiId: upiId || '',
      note: note || '',
      gateway,
      receipt,
      source,
      status: PaymentStatus.PENDING,
      paymentId: null,
      transactionRecordId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(doc);
    return normalize({ ...doc, _id: result.insertedId });
  },

  async updateStatus(orderId, status, paymentId = null, transactionRecordId = null) {
    const collection = await col();
    await collection.updateOne(
      { orderId },
      {
        $set: {
          status,
          paymentId,
          transactionRecordId,
          updatedAt: new Date(),
        },
      }
    );
    const updated = await collection.findOne({ orderId });
    return normalize(updated);
  },

  async findByOrderId(orderId) {
    const collection = await col();
    const payment = await collection.findOne({ orderId });
    return normalize(payment);
  },

  async findByUserId(userId, { page = 1, limit = 20 } = {}) {
    const collection = await col();
    const [items, total] = await Promise.all([
      collection.find({ userId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      collection.countDocuments({ userId }),
    ]);
    return { items: items.map(normalize), total, page, limit };
  },
};

export default PaymentModel;
