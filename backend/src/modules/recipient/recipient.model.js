import { ObjectId } from 'mongodb';
import { getDatabase } from '../../db/mongo.js';

export const RecipientCategory = {
  FAMILY: 'family',
  FRIENDS: 'friends',
  BILLS: 'bills',
  SHOPPING: 'shopping',
  FOOD: 'food',
  TRANSPORT: 'transport',
  OTHER: 'other',
};

export const PaymentMethod = {
  UPI_ID: 'upi_id',
  MOBILE_NUMBER: 'mobile_number',
};

function normalize(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return {
    ...rest,
    id: _id.toString(),
    created_date: rest.created_date instanceof Date ? rest.created_date.toISOString() : rest.created_date,
    updated_date: rest.updated_date instanceof Date ? rest.updated_date.toISOString() : rest.updated_date,
    last_used: rest.last_used instanceof Date ? rest.last_used.toISOString() : rest.last_used,
  };
}

async function col() {
  const db = await getDatabase();
  const c = db.collection('recipients');
  await c.createIndex({ upi_id: 1 });
  await c.createIndex({ mobile_number: 1 });
  await c.createIndex({ category: 1 });
  await c.createIndex({ usage_count: -1 });
  return c;
}

export const RecipientModel = {
  async create({
    name,
    payment_method,
    upi_id,
    mobile_number,
    nickname,
    category = RecipientCategory.OTHER,
    last_amount = 0,
  }) {
    const collection = await col();
    const doc = {
      name,
      payment_method,
      upi_id: upi_id || null,
      mobile_number: mobile_number || null,
      nickname: nickname || name,
      category,
      last_amount,
      usage_count: 0,
      created_date: new Date(),
      updated_date: new Date(),
    };
    const result = await collection.insertOne(doc);
    return normalize({ ...doc, _id: result.insertedId });
  },

  async findById(id) {
    const collection = await col();
    const recipient = await collection.findOne({ _id: new ObjectId(id) });
    return normalize(recipient);
  },

  async findAll() {
    const collection = await col();
    const recipients = await collection.find({}).sort({ usage_count: -1, name: 1 }).toArray();
    return recipients.map(normalize);
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

  async delete(id) {
    const collection = await col();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  },

  async updateUsage(id, { amount }) {
    const collection = await col();
    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          last_used: new Date(),
          last_amount: amount,
          updated_date: new Date(),
        },
        $inc: { usage_count: 1 },
      }
    );
    const updated = await collection.findOne({ _id: new ObjectId(id) });
    return normalize(updated);
  },

  async findByUpiId(upiId) {
    const collection = await col();
    const recipient = await collection.findOne({ upi_id: upiId });
    return normalize(recipient);
  },

  async findByMobileNumber(mobileNumber) {
    const collection = await col();
    const recipient = await collection.findOne({ mobile_number: mobileNumber });
    return normalize(recipient);
  },
};

export default RecipientModel;
