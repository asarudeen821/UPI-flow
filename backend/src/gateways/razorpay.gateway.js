import Razorpay from 'razorpay';
import env from '../config/env.js';

let _instance = null;

function getInstance() {
  if (!_instance) {
    _instance = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return _instance;
}

export async function createRazorpayOrder(amount, currency = 'INR', receipt) {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return {
      id: `order_mock_${Date.now()}`,
      amount: Math.round(amount * 100),
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      status: 'created',
      provider: 'mock',
    };
  }

  return getInstance().orders.create({
    amount: Math.round(amount * 100), // paise
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
  });
}

export default { createRazorpayOrder };
