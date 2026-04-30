/**
 * Payment Backend - Main Entry Point
 * Powered by Base44
 *
 * Entities: Transaction
 * API Layer: @base44/sdk
 * Authentication: Token-based (JWT)
 * Security: RBI-compliant, 256-bit encryption
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Import modules for internal use
import {
  PaymentMethod,
  TransactionStatus,
  validateTransaction,
  generateTransactionId,
  createTransaction,
  sanitizeTransaction
} from './Entities/Transaction.js';

import {
  RecipientCategory,
  validateRecipient,
  generateRecipientId,
  createRecipient,
  sanitizeRecipient,
  updateRecipientUsage
} from './Entities/Recipient.js';

import {
  TransactionAPI,
  AuthAPI,
  RecipientAPI,
  healthCheck
} from './api/base44Client.js';

import {
  AuthError,
  initializeAuthFromUrl,
  getCurrentUser,
  isAuthenticated,
  checkUserRegistration,
  logout,
  getLoginRedirectUrl,
  redirectToLogin,
  getPublicSettings,
  requireAuth,
  getStoredToken,
  storeToken,
  clearToken
} from './auth/auth.js';

import {
  sanitizeString,
  sanitizeNumber,
  sanitizeUpiId,
  sanitizeMobileNumber,
  sanitizeAmount,
  sanitizeNote,
  sanitizeRecipientName,
  sanitizeTransactionData,
  hash256,
  generateSecureToken,
  RBI_DISCLAIMER,
  createSafeInputHandler,
  validateCsrfToken
} from './security/sanitization.js';

// Re-export all modules
export {
  PaymentMethod,
  TransactionStatus,
  validateTransaction,
  generateTransactionId,
  createTransaction,
  sanitizeTransaction
};

export {
  RecipientCategory,
  validateRecipient,
  generateRecipientId,
  createRecipient,
  sanitizeRecipient,
  updateRecipientUsage
};

export {
  TransactionAPI,
  AuthAPI,
  RecipientAPI,
  healthCheck
};

export {
  AuthError,
  initializeAuthFromUrl,
  getCurrentUser,
  isAuthenticated,
  checkUserRegistration,
  logout,
  getLoginRedirectUrl,
  redirectToLogin,
  getPublicSettings,
  requireAuth,
  getStoredToken,
  storeToken,
  clearToken
};

export {
  sanitizeString,
  sanitizeNumber,
  sanitizeUpiId,
  sanitizeMobileNumber,
  sanitizeAmount,
  sanitizeNote,
  sanitizeRecipientName,
  sanitizeTransactionData,
  hash256,
  generateSecureToken,
  RBI_DISCLAIMER,
  createSafeInputHandler,
  validateCsrfToken
};

/**
 * Backend Service Class
 * Combines all modules for easy usage
 */
export class PaymentBackend {
  constructor(options = {}) {
    this.options = {
      autoInitAuth: true,
      ...options
    };
  }

  /**
   * Initialize backend services
   */
  async init() {
    // Initialize authentication from URL if in browser
    if (typeof window !== 'undefined' && this.options.autoInitAuth) {
      await initializeAuthFromUrl();
    }

    // Perform health check
    const health = await healthCheck();
    return health;
  }

  /**
   * Create a new payment transaction
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>}
   */
  async createPayment(transactionData) {
    // Sanitize input
    const { sanitized, errors } = sanitizeTransactionData(transactionData);
    
    if (errors.length > 0) {
      return {
        success: false,
        errors
      };
    }

    // Validate transaction
    const validation = validateTransaction(sanitized);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors
      };
    }

    // Create transaction via Base44
    return await TransactionAPI.create(sanitized);
  }

  /**
   * Get payment history
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  async getPaymentHistory(options) {
    return await TransactionAPI.list(options);
  }

  /**
   * Get current user
   * @returns {Promise<Object|null>}
   */
  async getUser() {
    return await getCurrentUser();
  }

  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>}
   */
  async isUserAuthenticated() {
    return await isAuthenticated();
  }

  /**
   * Logout user
   * @returns {Promise<Object>}
   */
  async logoutUser() {
    return await logout();
  }

  /**
   * Get login redirect URL
   * @param {string} redirectUri
   * @returns {string}
   */
  getLoginUrl(redirectUri) {
    return getLoginRedirectUrl(redirectUri);
  }

  /**
   * Check RBI compliance settings
   * @returns {Promise<Object>}
   */
  async checkCompliance() {
    return await getPublicSettings();
  }
}

/**
 * Create backend instance
 * @param {Object} options
 * @returns {PaymentBackend}
 */
export function createBackend(options) {
  return new PaymentBackend(options);
}

export default {
  PaymentBackend,
  createBackend
};
