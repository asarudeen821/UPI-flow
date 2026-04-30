/**
 * Backend Usage Examples
 * Copy and adapt these examples for your React components
 */

import {
  createBackend,
  PaymentMethod,
  TransactionStatus,
  sanitizeTransactionData,
  validateTransaction,
  RBI_DISCLAIMER
} from './backend.js';

// ============================================
// Example 1: Initialize Backend
// ============================================
export async function initBackendExample() {
  const backend = createBackend();
  const health = await backend.init();
  console.log('Backend health:', health);
  return backend;
}

// ============================================
// Example 2: Create a Payment (UPI)
// ============================================
export async function createUPIPayment(backend, upiId, recipientName, amount, note = '') {
  const result = await backend.createPayment({
    payment_method: PaymentMethod.UPI_ID,
    upi_id: upiId,
    recipient_name: recipientName,
    amount: amount,
    note: note
  });

  if (result.success) {
    console.log('Payment created:', result.data.transaction_id);
  } else {
    console.error('Payment failed:', result.errors);
  }

  return result;
}

// ============================================
// Example 3: Create a Payment (Mobile Number)
// ============================================
export async function createMobilePayment(backend, mobileNumber, recipientName, amount, note = '') {
  const result = await backend.createPayment({
    payment_method: PaymentMethod.MOBILE_NUMBER,
    mobile_number: mobileNumber,
    recipient_name: recipientName,
    amount: amount,
    note: note
  });

  if (result.success) {
    console.log('Payment created:', result.data.transaction_id);
  } else {
    console.error('Payment failed:', result.errors);
  }

  return result;
}

// ============================================
// Example 4: Get Payment History
// ============================================
export async function getPaymentHistory(backend, page = 1, limit = 20) {
  const result = await backend.getPaymentHistory({
    page,
    limit,
    sortBy: 'created_date',
    order: 'desc'
  });

  if (result.success) {
    console.log('Payments:', result.data);
    console.log('Pagination:', result.pagination);
  } else {
    console.error('Failed to fetch history:', result.error);
  }

  return result;
}

// ============================================
// Example 5: Filter by Status
// ============================================
export async function getPaymentsByStatus(backend, status) {
  const result = await backend.getPaymentHistory({
    status, // 'pending', 'success', or 'failed'
    page: 1,
    limit: 50
  });

  return result;
}

// ============================================
// Example 6: Authentication Check
// ============================================
export async function checkAuth(backend) {
  const isAuth = await backend.isUserAuthenticated();
  
  if (!isAuth) {
    console.log('User not authenticated');
    const loginUrl = backend.getLoginUrl(window.location.href);
    console.log('Redirect to login:', loginUrl);
    return { authenticated: false, loginUrl };
  }

  const user = await backend.getUser();
  console.log('Authenticated user:', user);
  return { authenticated: true, user };
}

// ============================================
// Example 7: Logout
// ============================================
export async function logoutUser(backend) {
  const result = await backend.logoutUser();
  if (result.success) {
    console.log('Logged out successfully');
  }
  return result;
}

// ============================================
// Example 8: Manual Validation & Sanitization
// ============================================
export function validateAndSanitizeExample(transactionData) {
  // First sanitize
  const { sanitized, errors: sanitizeErrors } = sanitizeTransactionData(transactionData);
  
  if (sanitizeErrors.length > 0) {
    return { valid: false, errors: sanitizeErrors };
  }

  // Then validate
  const validation = validateTransaction(sanitized);
  
  if (!validation.valid) {
    return { valid: false, errors: validation.errors };
  }

  return { valid: true, data: sanitized };
}

// ============================================
// Example 9: React Hook Pattern (for reference)
// ============================================
/*
// In your React component:
import { useEffect, useState } from 'react';
import { createBackend, PaymentMethod } from './api/backend.js';

function usePaymentBackend() {
  const [backend, setBackend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const bk = createBackend();
        await bk.init();
        setBackend(bk);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const createPayment = async (data) => {
    if (!backend) throw new Error('Backend not initialized');
    return await backend.createPayment(data);
  };

  const getHistory = async (options) => {
    if (!backend) throw new Error('Backend not initialized');
    return await backend.getPaymentHistory(options);
  };

  return { backend, loading, error, createPayment, getHistory };
}

// Usage in component:
function PaymentForm() {
  const { createPayment, loading, error } = usePaymentBackend();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await createPayment({
      payment_method: PaymentMethod.UPI_ID,
      upi_id: 'user@oksbi',
      recipient_name: 'John Doe',
      amount: 500,
      note: 'Test payment'
    });

    if (result.success) {
      alert('Payment successful!');
    } else {
      alert('Payment failed: ' + result.errors.join(', '));
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields *}/}
      <button type="submit">Pay Now</button>
    </form>
  );
}
*/

// ============================================
// Example 10: RBI Disclaimer Display
// ============================================
export function getRBIDisclaimer(type = 'full') {
  return RBI_DISCLAIMER[type] || RBI_DISCLAIMER.full;
}

/*
// In your React component:
import { getRBIDisclaimer } from './api/backend.js';

function PaymentDisclaimer() {
  return (
    <div className="disclaimer">
      <small>{getRBIDisclaimer('trustSignal')}</small>
      <p>{getRBIDisclaimer('full')}</p>
    </div>
  );
}
*/

export default {
  initBackendExample,
  createUPIPayment,
  createMobilePayment,
  getPaymentHistory,
  getPaymentsByStatus,
  checkAuth,
  logoutUser,
  validateAndSanitizeExample,
  getRBIDisclaimer
};
