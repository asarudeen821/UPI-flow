import { ObjectId } from 'mongodb';
import { getDatabase } from '../../db/mongo.js';

function normalize(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  
  // Format date and time for better analysis
  const createdAt = rest.createdAt instanceof Date ? rest.createdAt : new Date(rest.createdAt);
  const formattedDate = createdAt.toLocaleDateString('en-IN', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
  const formattedDay = createdAt.toLocaleDateString('en-IN', { 
    weekday: 'long' 
  });
  const formattedTime = createdAt.toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  const formattedDateTime = createdAt.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  return {
    ...rest,
    id: _id.toString(),
    createdAt: createdAt.toISOString(),
    updatedAt: rest.updatedAt instanceof Date ? rest.updatedAt.toISOString() : rest.updatedAt,
    // Formatted date/time for display and analysis
    formattedDate,
    formattedDay,
    formattedTime,
    formattedDateTime,
  };
}

async function col() {
  const db = await getDatabase();
  const c = db.collection('payment_links');
  
  // Create indexes for efficient queries
  await c.createIndex({ slug: 1 }, { unique: true });
  await c.createIndex({ userId: 1, createdAt: -1 });
  await c.createIndex({ status: 1, createdAt: -1 });
  await c.createIndex({ upiId: 1 });
  
  return c;
}

export const PaymentLinkModel = {
  /**
   * Create a new payment link
   */
  async create({
    userId,
    amount,
    currency = 'INR',
    description,
    recipientName,
    upiId,
    slug,
    expiresInHours = 24,
    maxUses = null,
    isPermanent = false,
    source = 'chat', // 'chat', 'ui', 'api'
  }) {
    const collection = await col();
    const generatedSlug = slug || `link_${Date.now().toString(36)}`;
    const doc = {
      userId: userId || 'anonymous',
      amount,
      currency,
      description: description || '',
      recipientName: recipientName || 'Merchant',
      upiId: upiId || '',
      slug: generatedSlug,
      url: `http://localhost:3000/pay/${generatedSlug}`,
      status: 'active', // active, inactive, expired
      source,
      isPermanent,
      expiresAt: isPermanent ? null : new Date(Date.now() + (expiresInHours || 24) * 3600000),
      maxUses: isPermanent ? null : maxUses,
      clicks: 0,
      payments: 0,
      totalAmount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(doc);
    return normalize({ ...doc, _id: result.insertedId });
  },

  /**
   * Find payment link by slug
   */
  async findBySlug(slug) {
    const collection = await col();
    const link = await collection.findOne({ slug });
    return normalize(link);
  },

  /**
   * Find payment link by ID
   */
  async findById(id) {
    const collection = await col();
    const link = await collection.findOne({ _id: new ObjectId(id) });
    return normalize(link);
  },

  /**
   * Get all payment links for a user
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
   * Get all payment links (admin)
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
   * Update link status
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
   * Increment click count
   */
  async incrementClicks(slug) {
    const collection = await col();
    await collection.updateOne(
      { slug },
      { 
        $inc: { clicks: 1 },
        $set: { updatedAt: new Date() }
      }
    );
  },

  /**
   * Record a successful payment against the link
   */
  async recordPayment(slug, amount) {
    const collection = await col();
    await collection.updateOne(
      { slug },
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
   * Delete payment link
   */
  async delete(id) {
    const collection = await col();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  },

  /**
   * Get payment link statistics
   */
  async getStats(userId) {
    const collection = await col();
    const query = userId ? { userId } : {};
    
    const [total, active, inactive, stats] = await Promise.all([
      collection.countDocuments(query),
      collection.countDocuments({ ...query, status: 'active' }),
      collection.countDocuments({ ...query, status: 'inactive' }),
      collection.aggregate([
        { $match: query },
        { 
          $group: { 
            _id: null, 
            totalClicks: { $sum: '$clicks' },
            totalPayments: { $sum: '$payments' },
            totalAmount: { $sum: '$totalAmount' }
          } 
        },
      ]).toArray(),
    ]);

    const s = stats[0] || { totalClicks: 0, totalPayments: 0, totalAmount: 0 };
    
    return {
      total,
      active,
      inactive,
      totalClicks: s.totalClicks,
      totalPayments: s.totalPayments,
      totalAmount: s.totalAmount,
    };
  },
};

export default PaymentLinkModel;
