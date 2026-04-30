import { MongoClient } from 'mongodb';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let clientPromise;
let initialized = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000; // 2 seconds

async function ensureIndexes(db) {
  if (initialized) {
    return;
  }

  try {
    const transactions = db.collection('transactions');
    await transactions.createIndex({ transaction_id: 1 }, { unique: true });
    await transactions.createIndex({ status: 1, created_date: -1 });
    await transactions.createIndex({ created_date: -1 });
    await transactions.createIndex({ user_id: 1, created_date: -1 });
    await transactions.createIndex({ recipient_id: 1 });
    await transactions.createIndex({ upi_id: 1 });
    
    initialized = true;
    logger.info('MongoDB indexes created successfully');
  } catch (error) {
    logger.error('Error creating MongoDB indexes:', error.message);
    throw error;
  }
}

export async function getMongoClient() {
  if (!clientPromise) {
    const client = new MongoClient(config.mongo.uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true,
    });

    clientPromise = client.connect().catch((error) => {
      logger.error('MongoDB connection failed:', {
        message: error.message,
        code: error.code,
        attempts: reconnectAttempts,
      });
      
      // Reset promise to allow retry
      clientPromise = null;
      
      // Increment reconnect attempts
      reconnectAttempts++;
      
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        logger.error('Max MongoDB reconnection attempts reached');
        throw new Error('Unable to connect to MongoDB after multiple attempts');
      }
      
      throw error;
    });
  }

  return clientPromise;
}

export async function getDatabase() {
  try {
    const client = await getMongoClient();
    const database = client.db(config.mongo.dbName);
    await ensureIndexes(database);
    reconnectAttempts = 0; // Reset on success
    return database;
  } catch (error) {
    logger.error('Failed to get database:', error.message);
    throw error;
  }
}

export async function pingDatabase() {
  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    logger.error('MongoDB ping failed:', error.message);
    throw error;
  }
}

// Export for monitoring
export function getConnectionStatus() {
  return {
    connected: clientPromise !== null,
    initialized,
    reconnectAttempts,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
  };
}
