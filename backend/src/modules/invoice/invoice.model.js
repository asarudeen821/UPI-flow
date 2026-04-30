import { ObjectId } from 'mongodb';
import { getDatabase } from '../../db/mongo.js';

function normalize(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return {
    ...rest,
    id: _id.toString(),
    createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
    updatedAt: rest.updatedAt instanceof Date ? rest.updatedAt.toISOString() : rest.updatedAt,
  };
}

async function col() {
  const db = await getDatabase();
  const c = db.collection('invoices');
  
  // Create indexes
  await c.createIndex({ invoiceNumber: 1 }, { unique: true });
  await c.createIndex({ userId: 1, createdAt: -1 });
  await c.createIndex({ customerEmail: 1 });
  await c.createIndex({ status: 1 });
  
  return c;
}

export const InvoiceModel = {
  /**
   * Create a new invoice
   */
  async create({
    userId,
    invoiceNumber,
    customerName,
    customerEmail,
    items,
    subtotal,
    tax = 0,
    totalAmount,
    notes = '',
    dueDate,
    source = 'chat', // 'chat', 'ui', 'api'
  }) {
    const collection = await col();
    const doc = {
      userId: userId || 'anonymous',
      invoiceNumber: invoiceNumber || `INV_${Date.now().toString(36).toUpperCase()}`,
      customerName,
      customerEmail,
      items: items || [],
      subtotal,
      tax,
      totalAmount,
      notes,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'pending', // pending, paid, overdue, cancelled
      source,
      paidAmount: 0,
      payments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(doc);
    return normalize({ ...doc, _id: result.insertedId });
  },

  /**
   * Find invoice by invoice number
   */
  async findByInvoiceNumber(invoiceNumber) {
    const collection = await col();
    const invoice = await collection.findOne({ invoiceNumber });
    return normalize(invoice);
  },

  /**
   * Find invoice by ID
   */
  async findById(id) {
    const collection = await col();
    const invoice = await collection.findOne({ _id: new ObjectId(id) });
    return normalize(invoice);
  },

  /**
   * Get all invoices for a user
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
   * Get all invoices
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
   * Update invoice status
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
   * Record a payment against the invoice
   */
  async recordPayment(id, { amount, paymentMethod, transactionId }) {
    const collection = await col();
    const invoice = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!invoice) return null;
    
    const payment = {
      amount,
      paymentMethod: paymentMethod || 'upi',
      transactionId,
      paidAt: new Date(),
    };
    
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $push: { payments: payment },
        $inc: { paidAmount: amount },
        $set: { 
          updatedAt: new Date(),
          status: (invoice.paidAmount + amount) >= invoice.totalAmount ? 'paid' : 'pending'
        }
      }
    );
    
    const updated = await collection.findOne({ _id: new ObjectId(id) });
    return normalize(updated);
  },

  /**
   * Delete invoice
   */
  async delete(id) {
    const collection = await col();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  },

  /**
   * Get invoice statistics
   */
  async getStats(userId) {
    const collection = await col();
    const query = userId ? { userId } : {};
    
    const [total, pending, paid, overdue, stats] = await Promise.all([
      collection.countDocuments(query),
      collection.countDocuments({ ...query, status: 'pending' }),
      collection.countDocuments({ ...query, status: 'paid' }),
      collection.countDocuments({ ...query, status: 'overdue' }),
      collection.aggregate([
        { $match: query },
        { 
          $group: { 
            _id: null, 
            totalAmount: { $sum: '$totalAmount' },
            totalPaid: { $sum: '$paidAmount' },
            count: { $sum: 1 }
          } 
        },
      ]).toArray(),
    ]);

    const s = stats[0] || { totalAmount: 0, totalPaid: 0, count: 0 };
    
    return {
      total,
      pending,
      paid,
      overdue,
      totalAmount: s.totalAmount,
      totalPaid: s.totalPaid,
      totalPending: s.totalAmount - s.totalPaid,
    };
  },
};

export default InvoiceModel;
