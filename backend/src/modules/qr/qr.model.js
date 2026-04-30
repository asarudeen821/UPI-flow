import { ObjectId } from 'mongodb';
import { getDatabase } from '../../db/mongo.js';

function normalize(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;

  // Safely parse createdAt — guard against null/undefined/invalid stored values
  const rawCreatedAt = rest.createdAt;
  const createdAt = rawCreatedAt instanceof Date
    ? rawCreatedAt
    : rawCreatedAt
      ? new Date(rawCreatedAt)
      : new Date();

  // If the date is still invalid, fall back to now
  const safeCreatedAt = isNaN(createdAt.getTime()) ? new Date() : createdAt;

  const formattedDate = safeCreatedAt.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedDay = safeCreatedAt.toLocaleDateString('en-IN', { weekday: 'long' });
  const formattedTime = safeCreatedAt.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const formattedDateTime = safeCreatedAt.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Safely parse updatedAt
  const rawUpdatedAt = rest.updatedAt;
  const updatedAt = rawUpdatedAt instanceof Date
    ? rawUpdatedAt
    : rawUpdatedAt ? new Date(rawUpdatedAt) : null;
  const safeUpdatedAt = updatedAt && !isNaN(updatedAt.getTime()) ? updatedAt : null;

  return {
    ...rest,
    id: _id.toString(),
    createdAt: safeCreatedAt.toISOString(),
    updatedAt: safeUpdatedAt ? safeUpdatedAt.toISOString() : safeCreatedAt.toISOString(),
    formattedDate,
    formattedDay,
    formattedTime,
    formattedDateTime,
  };
}

async function col() {
  const db = await getDatabase();
  const c = db.collection('qr_codes');
  
  // Create indexes
  await c.createIndex({ ref: 1 }, { unique: true });
  await c.createIndex({ userId: 1, createdAt: -1 });
  await c.createIndex({ upiId: 1 });
  await c.createIndex({ status: 1 });
  
  return c;
}

export const QRCodeModel = {
  /**
   * Create a new QR code
   */
  async create({
    userId,
    upiId,
    recipientName,
    amount = null,
    note = '',
    orderId = null,
    expiresInHours = 24,
    isPermanent = false,
    source = 'chat', // 'chat', 'ui', 'api'
  }) {
    const collection = await col();
    const ref = `QR_${Date.now().toString(36).toUpperCase()}`;

    // Build UPI string
    let upiString = `upi://pay?pa=${upiId}`;
    if (recipientName) upiString += `&pn=${encodeURIComponent(recipientName)}`;
    if (amount) upiString += `&am=${amount}`;
    if (note) upiString += `&tn=${encodeURIComponent(note)}`;
    if (orderId) upiString += `&tr=${encodeURIComponent(orderId)}`;
    upiString += '&cu=INR';

    const doc = {
      ref,
      userId: userId || 'anonymous',
      upiId,
      recipientName: recipientName || 'Merchant',
      amount,
      note,
      orderId,
      upiString,
      qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiString)}`,
      status: 'active', // active, inactive
      source,
      isPermanent,
      expiresAt: isPermanent ? null : new Date(Date.now() + (expiresInHours || 24) * 3600000),
      scans: 0,
      payments: 0,
      totalAmount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(doc);
    return normalize({ ...doc, _id: result.insertedId });
  },

  /**
   * Find QR code by ref
   */
  async findByRef(ref) {
    const collection = await col();
    const qr = await collection.findOne({ ref });
    return normalize(qr);
  },

  /**
   * Find QR code by ID
   */
  async findById(id) {
    const collection = await col();
    const qr = await collection.findOne({ _id: new ObjectId(id) });
    return normalize(qr);
  },

  /**
   * Get all QR codes for a user
   */
  async findByUserId(userId, { page = 1, limit = 50 } = {}) {
    const collection = await col();
    const [items, total] = await Promise.all([
      collection.find({ userId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      collection.countDocuments({ userId }),
    ]);
    return { items: items.map(normalize), total, page, limit };
  },

  /**
   * Get all QR codes
   */
  async findAll({ page = 1, limit = 50, status = null } = {}) {
    const collection = await col();
    const query = status ? { status } : {};
    
    const [items, total] = await Promise.all([
      collection.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      collection.countDocuments(query),
    ]);
    return { items: items.map(normalize), total, page, limit };
  },

  /**
   * Update QR code status
   */
  async updateStatus(id, status) {
    const collection = await col();
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );
    const updated = await collection.findOne({ _id: new ObjectId(id) });
    return normalize(updated);
  },

  /**
   * Increment scan count
   */
  async incrementScans(ref) {
    const collection = await col();
    await collection.updateOne(
      { ref },
      { 
        $inc: { scans: 1 },
        $set: { updatedAt: new Date() }
      }
    );
  },

  /**
   * Record a successful payment against the QR code
   */
  async recordPayment(ref, amount) {
    const collection = await col();
    await collection.updateOne(
      { ref },
      { 
        $inc: { 
          payments: 1,
          totalAmount: amount
        },
        $set: { updatedAt: new Date() }
      }
    );
  },

  /**
   * Delete QR code
   */
  async delete(id) {
    const collection = await col();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  },

  /**
   * Get QR code statistics
   */
  async getStats(userId) {
    const collection = await col();
    const query = userId ? { userId } : {};
    
    const [total, active, stats] = await Promise.all([
      collection.countDocuments(query),
      collection.countDocuments({ ...query, status: 'active' }),
      collection.aggregate([
        { $match: query },
        { 
          $group: { 
            _id: null, 
            totalScans: { $sum: '$scans' },
            totalPayments: { $sum: '$payments' },
            totalAmount: { $sum: '$totalAmount' }
          } 
        },
      ]).toArray(),
    ]);

    const s = stats[0] || { totalScans: 0, totalPayments: 0, totalAmount: 0 };
    
    return {
      total,
      active,
      totalScans: s.totalScans,
      totalPayments: s.totalPayments,
      totalAmount: s.totalAmount,
    };
  },
};

export default QRCodeModel;
