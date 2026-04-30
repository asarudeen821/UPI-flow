/**
 * MongoDB Database Connection
 */

import { MongoClient } from 'mongodb';
import logger from '../utils/logger.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/checkout-widget';

let client;
let db;

export async function connectDB() {
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db();
    
    logger.info('✅ MongoDB connected successfully');
    
    // Create indexes for performance
    await createIndexes();
    
    return db;
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export async function createIndexes() {
  try {
    const payments = db.collection('payments');
    const transactions = db.collection('transactions');
    const webhookLogs = db.collection('webhook_logs');
    const configs = db.collection('configs');
    
    // Payments indexes
    await payments.createIndex({ paymentId: 1 }, { unique: true });
    await payments.createIndex({ orderId: 1 }, { unique: true });
    await payments.createIndex({ status: 1, createdAt: -1 });
    await payments.createIndex({ gateway: 1, status: 1 });
    await payments.createIndex({ publicKey: 1, createdAt: -1 });
    
    // Transactions indexes
    await transactions.createIndex({ transactionId: 1 }, { unique: true });
    await transactions.createIndex({ paymentId: 1 });
    await transactions.createIndex({ status: 1, createdAt: -1 });
    
    // Webhook logs indexes
    await webhookLogs.createIndex({ eventId: 1 }, { unique: true });
    await webhookLogs.createIndex({ timestamp: -1 });
    await webhookLogs.createIndex({ gateway: 1, event: 1 });
    
    // Configs indexes
    await configs.createIndex({ publicKey: 1 }, { unique: true });
    await configs.createIndex({ active: 1 });
    
    logger.info('✅ Database indexes created');
  } catch (error) {
    logger.error('Error creating indexes:', error);
  }
}

export function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return db;
}

export function getCollection(name) {
  const db = getDB();
  return db.collection(name);
}

export async function closeDB() {
  if (client) {
    await client.close();
    logger.info('MongoDB connection closed');
  }
}

export default {
  connectDB,
  getDB,
  getCollection,
  closeDB
};
