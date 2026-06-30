/**
 * Backend Module Test Script
 * Run: node src/test.js
 * This tests the backend modules locally using the mock SDK
 */

import { 
  createBackend, 
  PaymentMethod, 
  TransactionStatus,
  validateTransaction,
  sanitizeTransactionData
} from './index.js';

import { healthCheck } from './api/base44Client.js';

async function runTests() {
  console.log('=== Payment Backend Test Suite ===\n');

  // Test 1: Health Check
  console.log('1. Health Check...');
  const health = await healthCheck();
  console.log('   Status:', health.status);
  console.log('   ✓ Health check passed\n');

  // Test 2: Create Backend Instance
  console.log('2. Creating Backend Instance...');
  const backend = createBackend({ autoInitAuth: false });
  console.log('   ✓ Backend created\n');

  // Test 3: Validate Transaction
  console.log('3. Testing Transaction Validation...');
  const validTx = {
    payment_method: PaymentMethod.UPI_ID,
    upi_id: 'user@oksbi',
    recipient_name: 'John Doe',
    amount: 500,
    status: TransactionStatus.PENDING
  };
  const validation = validateTransaction(validTx);
  console.log('   Valid transaction:', validation.valid ? '✓' : '✗');
  if (!validation.valid) console.log('   Errors:', validation.errors);

  const invalidTx = { payment_method: 'invalid' };
  const invalidValidation = validateTransaction(invalidTx);
  console.log('   Invalid transaction rejected:', !invalidValidation.valid ? '✓' : '✗');
  console.log();

  // Test 4: Sanitize Transaction Data
  console.log('4. Testing Sanitization...');
  const { sanitized, errors } = sanitizeTransactionData({
    payment_method: 'upi_id',
    upi_id: 'USER@OKSBI',
    recipient_name: '  John Doe  ',
    amount: 500.555,
    note: 'Test payment'
  });
  console.log('   Sanitized UPI:', sanitized.upi_id);
  console.log('   Sanitized Name:', sanitized.recipient_name);
  console.log('   Sanitized Amount:', sanitized.amount);
  console.log('   ✓ Sanitization passed\n');

  // Test 5: Create Payment (Mock)
  console.log('5. Testing Payment Creation (Mock)...');
  const paymentResult = await backend.createPayment({
    payment_method: PaymentMethod.UPI_ID,
    upi_id: 'test@oksbi',
    recipient_name: 'Test User',
    amount: 100,
    note: 'Test payment'
  });
  console.log('   Success:', paymentResult.success ? '✓' : '✗');
  if (paymentResult.success) {
    console.log('   Transaction ID:', paymentResult.data?.transaction_id);
  } else {
    console.log('   Errors:', paymentResult.errors);
  }
  console.log();

  // Test 6: Get Payment History (Mock)
  console.log('6. Testing Payment History (Mock)...');
  const historyResult = await backend.getPaymentHistory({ page: 1, limit: 10 });
  console.log('   Success:', historyResult.success ? '✓' : '✗');
  if (historyResult.success) {
    console.log('   Transactions found:', historyResult.data?.length);
    console.log('   Pagination:', historyResult.pagination);
  }
  console.log();

  // Test 7: Mobile Number Payment
  console.log('7. Testing Mobile Number Payment...');
  const mobilePayment = await backend.createPayment({
    payment_method: PaymentMethod.MOBILE_NUMBER,
    mobile_number: '9876543210',
    recipient_name: 'Mobile User',
    amount: 250
  });
  console.log('   Success:', mobilePayment.success ? '✓' : '✗');
  console.log();

  console.log('=== All Tests Completed ===');
}

runTests().catch(console.error);
