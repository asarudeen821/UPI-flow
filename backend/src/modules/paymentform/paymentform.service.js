import { randomBytes } from 'crypto';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../../db/mongo.js';

async function col() {
  const db = await getDatabase();
  const collection = db.collection('payment_forms');
  await collection.createIndex({ slug: 1 }, { unique: true });
  await collection.createIndex({ userId: 1 });
  await collection.createIndex({ createdAt: -1 });
  return collection;
}

function toPublic(document) {
  if (!document) {
    return null;
  }
  const { _id, ...rest } = document;
  return {
    ...rest,
    id: _id?.toString() || document.id,
  };
}

export async function createForm({
  title,
  description,
  currency,
  fields,
  quickAmounts,
  allowCustomAmount,
  userId,
  upiId,
  recipientName,
}) {
  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${randomBytes(3).toString('hex')}`;
  
  const doc = {
    slug,
    title,
    description: description || '',
    currency: currency || 'INR',
    fields: fields || [],
    quickAmounts: quickAmounts || [],
    allowCustomAmount: allowCustomAmount !== false,
    userId: userId || null,
    upiId: upiId || null,
    recipientName: recipientName || '',
    is_active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const collection = await col();
  const result = await collection.insertOne(doc);
  return toPublic({ ...doc, _id: result.insertedId });
}

export async function getFormBySlug(slug) {
  const collection = await col();
  const doc = await collection.findOne({ slug });
  return toPublic(doc);
}

export async function listForms(userId = null) {
  const collection = await col();
  const query = userId ? { userId } : {};
  const items = await collection.find(query).sort({ createdAt: -1 }).limit(100).toArray();
  return items.map(toPublic);
}

export async function updateForm(id, updates) {
  const collection = await col();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    }
  );
  return toPublic(result);
}

export async function deleteForm(id) {
  const collection = await col();
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}
