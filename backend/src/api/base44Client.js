 import { ObjectId } from 'mongodb';
import config from '../config/index.js';
import { getDatabase, pingDatabase } from '../db/mongo.js';
import {
  createTransaction,
  generateTransactionId,
  TransactionStatus
} from '../Entities/Transaction.js';
import {
  createRecipient,
  generateRecipientId,
  sanitizeRecipient,
  updateRecipientUsage
} from '../Entities/Recipient.js';

function toPublicTransaction(document) {
  if (!document) {
    return null;
  }

  const { _id, ...rest } = document;
  return {
    ...rest,
    id: _id.toString()
  };
}

function toPublicRecipient(document) {
  if (!document) {
    return null;
  }

  const { _id, ...rest } = document;
  return {
    ...rest,
    id: _id.toString()
  };
}

async function getTransactionsCollection() {
  const db = await getDatabase();
  return db.collection('transactions');
}

/**
 * Transaction API Operations
 */
export const TransactionAPI = {
  /**
   * Create a new payment transaction
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>} Created transaction
   */
  async create(transactionData) {
    try {
      const collection = await getTransactionsCollection();
      const baseTransaction = createTransaction({
        ...transactionData,
        status: transactionData.status || TransactionStatus.PENDING
      });
      const now = new Date().toISOString();
      const document = {
        ...baseTransaction,
        transaction_id: transactionData.transaction_id || generateTransactionId(),
        created_date: now,
        updated_date: now,
        created_by: config.auth.demoUserEmail
      };

      const result = await collection.insertOne(document);
      const created = await collection.findOne({ _id: result.insertedId });
      return { success: true, data: toPublicTransaction(created) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * List transactions with pagination and sorting
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=20] - Items per page
   * @param {string} [options.sortBy='created_date'] - Sort field
   * @param {string} [options.order='desc'] - Sort order (asc/desc)
   * @param {string} [options.status] - Filter by status
   * @returns {Promise<Object>} Paginated transaction list
   */
  async list(options = {}) {
    try {
      const collection = await getTransactionsCollection();
      const {
        page = 1,
        limit = 20,
        sortBy = 'created_date',
        order = 'desc',
        status
      } = options;

      const query = {
        sort: { [sortBy]: order === 'desc' ? -1 : 1 },
        skip: (page - 1) * limit,
        limit: parseInt(limit)
      };

      if (status) {
        query.where = { status };
      }

      const [items, total] = await Promise.all([
        collection
          .find(query.where || {})
          .sort(query.sort)
          .skip(query.skip)
          .limit(query.limit)
          .toArray(),
        collection.countDocuments(query.where || {})
      ]);

      return {
        success: true,
        data: items.map(toPublicTransaction),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get a single transaction by ID
   * @param {string} id - Transaction ID
   * @returns {Promise<Object>} Transaction details
   */
  async getById(id) {
    try {
      const collection = await getTransactionsCollection();
      const result = await collection.findOne({ _id: new ObjectId(id) });
      return { success: true, data: toPublicTransaction(result) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get transaction by transaction_id (unique reference)
   * @param {string} transactionId - Unique transaction reference
   * @returns {Promise<Object>} Transaction details
   */
  async getByTransactionId(transactionId) {
    try {
      const collection = await getTransactionsCollection();
      const result = await collection.findOne({ transaction_id: transactionId });
      return { success: true, data: toPublicTransaction(result) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Update transaction status
   * @param {string} id - Transaction ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated transaction
   */
  async updateStatus(id, status) {
    try {
      const collection = await getTransactionsCollection();
      await collection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status,
            updated_date: new Date().toISOString()
          }
        }
      );
      const result = await collection.findOne({ _id: new ObjectId(id) });
      return { success: true, data: toPublicTransaction(result) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

/**
 * Auth API Operations
 */
export const AuthAPI = {
  /**
   * Get current authenticated user
   * @returns {Promise<Object>} User details
   */
  async me() {
    try {
      return {
        success: true,
        data: {
          id: 'demo-user',
          email: config.auth.demoUserEmail,
          name: config.auth.demoUserName,
          created_date: new Date().toISOString()
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Logout current session
   * @returns {Promise<Object>} Logout result
   */
  async logout() {
    try {
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get OAuth login redirect URL
   * @param {string} [redirectUri] - Post-login redirect URI
   * @returns {string} OAuth redirect URL
   */
  getLoginRedirectUrl(redirectUri) {
    return redirectUri || '/';
  },

  /**
   * Check if user is registered
   * @returns {Promise<boolean>}
   */
  async isUserRegistered() {
    try {
      const result = await this.me();
      return result.success;
    } catch {
      return false;
    }
  },

  /**
   * Check public settings for app-level access control
   * @returns {Promise<Object>} Public settings
   */
  async getPublicSettings() {
    try {
      return {
        success: true,
        data: {
          app_name: 'PayApp',
          rbi_compliant: true,
          encryption: '256-bit',
          currency: config.payment.currency
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

/**
 * Recipient API Operations
 */
export const RecipientAPI = {
  /**
   * Create a new recipient
   * @param {Object} recipientData - Recipient data
   * @returns {Promise<Object>} Created recipient
   */
  async create(recipientData) {
    try {
      // Use mock SDK if available (browser), otherwise MongoDB
      if (typeof window !== 'undefined' && window.base44) {
        const result = await window.base44.entities.Recipient.create(recipientData);
        return { success: true, data: result };
      }

      // MongoDB fallback
      const db = await getDatabase();
      const collection = db.collection('recipients');
      const sanitized = sanitizeRecipient(recipientData);
      const recipient = createRecipient(sanitized);
      const now = new Date().toISOString();
      const document = {
        ...recipient,
        recipient_id: recipient.recipient_id || generateRecipientId(),
        created_date: now,
        updated_date: now,
        created_by: config.auth.demoUserEmail
      };
      const result = await collection.insertOne(document);
      return {
        success: true,
        data: { ...document, id: result.insertedId.toString() }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * List recipients with filtering and sorting
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=50] - Items per page
   * @param {string} [options.sortBy='last_used'] - Sort field
   * @param {string} [options.order='desc'] - Sort order (asc/desc)
   * @param {string} [options.category] - Filter by category
   * @param {string} [options.search] - Search query
   * @returns {Promise<Object>} Paginated recipient list
   */
  async list(options = {}) {
    try {
      // Use mock SDK if available (browser)
      if (typeof window !== 'undefined' && window.base44) {
        const {
          page = 1,
          limit = 50,
          sortBy = 'last_used',
          order = 'desc',
          category,
          search
        } = options;

        const query = {
          sort: { [sortBy]: order === 'desc' ? -1 : 1 },
          skip: (page - 1) * limit,
          limit: parseInt(limit)
        };

        if (category) {
          query.where = { category };
        }

        if (search) {
          query.search = search;
        }

        const result = await window.base44.entities.Recipient.list(query);
        return {
          success: true,
          data: result.items,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: result.total
          }
        };
      }

      // MongoDB fallback
      const db = await getDatabase();
      const collection = db.collection('recipients');
      
      const page = options.page || 1;
      const limit = options.limit || 50;
      const query = { created_by: config.auth.demoUserEmail };
      if (options.category && options.category !== 'all') {
        query.category = options.category;
      }

      if (options.search) {
        query.$or = [
          { name: { $regex: options.search, $options: 'i' } },
          { nickname: { $regex: options.search, $options: 'i' } },
          { upi_id: { $regex: options.search, $options: 'i' } },
          { mobile_number: { $regex: options.search, $options: 'i' } }
        ];
      }

      const sortBy = options.sortBy || 'last_used';
      const sortOrder = options.order === 'asc' ? 1 : -1;

      const recipients = await collection
        .find(query)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      const total = await collection.countDocuments(query);

      return {
        success: true,
        data: recipients.map(toPublicRecipient),
        pagination: {
          page,
          limit,
          total
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get a single recipient by ID
   * @param {string} id - Recipient ID
   * @returns {Promise<Object>} Recipient details
   */
  async getById(id) {
    try {
      // Use mock SDK if available (browser)
      if (typeof window !== 'undefined' && window.base44) {
        const result = await window.base44.entities.Recipient.get({ id });
        return { success: true, data: result };
      }

      // MongoDB fallback
      const db = await getDatabase();
      const collection = db.collection('recipients');
      const result = await collection.findOne({ 
        _id: new ObjectId(id),
        created_by: config.auth.demoUserEmail 
      });
      return { success: true, data: toPublicRecipient(result) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get recipient by recipient_id (unique reference)
   * @param {string} recipientId - Unique recipient reference
   * @returns {Promise<Object>} Recipient details
   */
  async getByRecipientId(recipientId) {
    try {
      // Use mock SDK if available (browser)
      if (typeof window !== 'undefined' && window.base44) {
        const result = await window.base44.entities.Recipient.getByRecipientId(recipientId);
        return { success: true, data: result };
      }

      // MongoDB fallback
      const db = await getDatabase();
      const collection = db.collection('recipients');
      const result = await collection.findOne({ 
        recipient_id: recipientId,
        created_by: config.auth.demoUserEmail 
      });
      return { success: true, data: toPublicRecipient(result) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Update recipient
   * @param {string} id - Recipient ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated recipient
   */
  async update(id, data) {
    try {
      // Use mock SDK if available (browser)
      if (typeof window !== 'undefined' && window.base44) {
        const result = await window.base44.entities.Recipient.update({ id }, data);
        return { success: true, data: result };
      }

      // MongoDB fallback
      const db = await getDatabase();
      const collection = db.collection('recipients');
      await collection.updateOne(
        { _id: new ObjectId(id), created_by: config.auth.demoUserEmail },
        {
          $set: {
            ...sanitizeRecipient(data),
            updated_date: new Date().toISOString()
          }
        }
      );
      const updated = await collection.findOne({ _id: new ObjectId(id) });
      return { success: true, data: toPublicRecipient(updated) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete recipient
   * @param {string} id - Recipient ID
   * @returns {Promise<Object>} Delete result
   */
  async delete(id) {
    try {
      // Use mock SDK if available (browser)
      if (typeof window !== 'undefined' && window.base44) {
        const result = await window.base44.entities.Recipient.delete({ id });
        return result;
      }

      // MongoDB fallback
      const db = await getDatabase();
      const collection = db.collection('recipients');
      const result = await collection.deleteOne({ 
        _id: new ObjectId(id),
        created_by: config.auth.demoUserEmail 
      });
      return { success: result.deletedCount > 0 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Update recipient usage statistics (called after successful payment)
   * @param {string} id - Recipient ID
   * @param {number} [amount] - Amount paid
   * @returns {Promise<Object>} Updated recipient
   */
  async updateUsage(id, amount) {
    try {
      const get_result = await this.getById(id);
      if (!get_result.success || !get_result.data) {
        return { success: false, error: 'Recipient not found' };
      }

      const updated = updateRecipientUsage(get_result.data, amount);
      return await this.update(id, updated);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

/**
 * Health check for Base44 connection
 * @returns {Promise<Object>}
 */
export async function healthCheck() {
  try {
    await pingDatabase();
    return {
      status: 'connected',
      database: 'mongodb',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export default {
  TransactionAPI,
  AuthAPI,
  RecipientAPI,
  healthCheck
};
