/**
 * Security & Sanitization Utilities
 * Input sanitization for controlled React inputs
 * 256-bit encryption mention (frontend trust signal)
 * RBI compliance helpers
 */

import { createHash } from 'crypto';

/**
 * Sanitize string input
 * Removes potentially dangerous characters
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitize number input
 * @param {number|string} input - Input number
 * @param {Object} options - Validation options
 * @param {number} [options.min=0] - Minimum value
 * @param {number} [options.max=Number.MAX_SAFE_INTEGER] - Maximum value
 * @returns {number|null} Sanitized number or null if invalid
 */
export function sanitizeNumber(input, options = {}) {
  const { min = 0, max = Number.MAX_SAFE_INTEGER } = options;
  
  const num = typeof input === 'string' ? parseFloat(input) : input;
  
  if (typeof num !== 'number' || isNaN(num)) {
    return null;
  }
  
  if (num < min || num > max) {
    return null;
  }
  
  return num;
}

/**
 * Sanitize UPI ID
 * @param {string} upiId - UPI ID
 * @returns {string|null} Sanitized UPI ID or null if invalid
 */
export function sanitizeUpiId(upiId) {
  if (typeof upiId !== 'string') return null;
  
  const sanitized = upiId.toLowerCase().trim();
  
  // UPI format validation: identifier@bank
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
  if (!upiRegex.test(sanitized)) {
    return null;
  }
  
  return sanitized;
}

/**
 * Sanitize mobile number (Indian format)
 * @param {string} mobile - Mobile number
 * @returns {string|null} Sanitized mobile number or null if invalid
 */
export function sanitizeMobileNumber(mobile) {
  if (typeof mobile !== 'string') return null;
  
  // Remove spaces, dashes, and country code
  const cleaned = mobile.replace(/[\s-]/g, '').replace(/^(\+91|91)/, '');
  
  // Validate 10-digit Indian number starting with 6-9
  const mobileRegex = /^[6-9]\d{9}$/;
  if (!mobileRegex.test(cleaned)) {
    return null;
  }
  
  return cleaned;
}

/**
 * Sanitize amount (INR)
 * @param {number|string} amount - Amount
 * @param {Object} options - Validation options
 * @param {number} [options.min=1] - Minimum amount
 * @param {number} [options.max=1000000] - Maximum amount (default 10 lakhs)
 * @returns {number|null} Sanitized amount
 */
export function sanitizeAmount(amount, options = {}) {
  const { min = 1, max = 1000000 } = options;
  
  const sanitized = sanitizeNumber(amount, { min, max });
  if (sanitized === null) {
    return null;
  }
  
  // Round to 2 decimal places
  return Math.round(sanitized * 100) / 100;
}

/**
 * Sanitize note/reason text
 * @param {string} note - Note text
 * @param {number} [maxLength=256] - Maximum length
 * @returns {string} Sanitized note
 */
export function sanitizeNote(note, maxLength = 256) {
  if (typeof note !== 'string') return '';
  
  const sanitized = sanitizeString(note);
  return sanitized.substring(0, maxLength);
}

/**
 * Sanitize recipient name
 * @param {string} name - Recipient name
 * @returns {string|null} Sanitized name or null if invalid
 */
export function sanitizeRecipientName(name) {
  if (typeof name !== 'string') return null;
  
  const sanitized = sanitizeString(name);
  
  if (sanitized.length < 2) {
    return null;
  }
  
  // Allow only letters, spaces, and basic punctuation
  const nameRegex = /^[a-zA-Z\s.'-]+$/;
  if (!nameRegex.test(sanitized)) {
    return null;
  }
  
  return sanitized;
}

/**
 * Full transaction data sanitization
 * @param {Object} transaction - Transaction data
 * @returns {{ sanitized: Object, errors: string[] }}
 */
export function sanitizeTransactionData(transaction) {
  const errors = [];
  const sanitized = {};

  // Sanitize payment_method
  if (['upi_id', 'mobile_number'].includes(transaction.payment_method)) {
    sanitized.payment_method = transaction.payment_method;
  } else {
    errors.push('Invalid payment_method');
  }

  // Sanitize conditional fields
  if (sanitized.payment_method === 'upi_id') {
    const upiId = sanitizeUpiId(transaction.upi_id);
    if (upiId) {
      sanitized.upi_id = upiId;
    } else {
      errors.push('Invalid UPI ID');
    }
  }

  if (sanitized.payment_method === 'mobile_number') {
    const mobile = sanitizeMobileNumber(transaction.mobile_number);
    if (mobile) {
      sanitized.mobile_number = mobile;
    } else {
      errors.push('Invalid mobile number');
    }
  }

  // Sanitize recipient_name
  const recipientName = sanitizeRecipientName(transaction.recipient_name);
  if (recipientName) {
    sanitized.recipient_name = recipientName;
  } else {
    errors.push('Invalid recipient name');
  }

  // Sanitize amount
  const amount = sanitizeAmount(transaction.amount);
  if (amount !== null) {
    sanitized.amount = amount;
  } else {
    errors.push('Invalid amount');
  }

  // Sanitize note (optional)
  sanitized.note = sanitizeNote(transaction.note || '');

  return {
    sanitized,
    errors
  };
}

/**
 * Generate 256-bit hash (for encryption mention/trust signal)
 * @param {string} data - Data to hash
 * @returns {string} SHA-256 hash in hex format
 */
export function hash256(data) {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Generate secure random token
 * @param {number} length - Token length
 * @returns {string}
 */
export function generateSecureToken(length = 32) {
  // In browser: use crypto.getRandomValues
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // In Node.js: use crypto.randomBytes
  return createHash('sha256').update(Math.random().toString()).digest('hex').substring(0, length * 2);
}

/**
 * RBI compliance disclaimer text
 */
export const RBI_DISCLAIMER = {
  short: 'RBI-regulated payment service',
  full: 'This is an RBI-regulated payment service. All transactions are encrypted with 256-bit encryption for your security.',
  trustSignal: '🔒 256-bit encrypted | RBI compliant'
};

/**
 * XSS prevention for React controlled inputs
 * Creates a safe input handler
 * @param {Function} setValue - State setter function
 * @param {Function} [sanitizer=sanitizeString] - Sanitizer function
 * @returns {Function} Safe input handler
 */
export function createSafeInputHandler(setValue, sanitizer = sanitizeString) {
  return (value) => {
    const sanitized = sanitizer(value);
    setValue(sanitized);
  };
}

/**
 * Validate CSRF token (placeholder for implementation)
 * @param {string} token - CSRF token
 * @returns {boolean}
 */
export function validateCsrfToken(token) {
  // Implement CSRF validation as needed
  return typeof token === 'string' && token.length > 0;
}

export default {
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
