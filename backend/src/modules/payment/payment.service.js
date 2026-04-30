import { TransactionAPI } from '../../api/base44Client.js';
import { createRazorpayOrder } from '../../gateways/razorpay.gateway.js';
import { generateUPILink } from '../../utils/upi.js';
import withIdempotency from '../../utils/idempotency.js';
import logger from '../../utils/logger.js';
import { PaymentModel, PaymentStatus } from './payment.model.js';

function randomPaymentId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(16).slice(2, 8)}`;
}

async function mirrorSuccessfulPayment(payment, paymentId) {
  if (!payment?.upiId || payment.transactionRecordId) {
    return payment?.transactionRecordId || null;
  }

  const result = await TransactionAPI.create({
    payment_method: 'upi_id',
    upi_id: payment.upiId,
    recipient_name: payment.recipientName,
    amount: payment.amount,
    note: payment.note || `Order ${payment.orderId}`,
    status: PaymentStatus.SUCCESS,
    transaction_id: paymentId || randomPaymentId('txn'),
  });

  return result.success ? result.data?.id || result.data?.transaction_id || null : null;
}

export async function createOrder({
  amount,
  currency = 'INR',
  userId,
  idempotencyKey,
  recipientName,
  upiId,
  note,
}) {
  const run = async () => {
    const razorpayOrder = await createRazorpayOrder(amount, currency);
    const payment = await PaymentModel.create({
      orderId: razorpayOrder.id,
      amount,
      currency,
      userId,
      recipientName,
      upiId,
      note,
      gateway: razorpayOrder.provider || 'razorpay',
      receipt: razorpayOrder.receipt || null,
    });
    logger.info(`Order created: ${razorpayOrder.id} for INR ${amount}`);
    return { razorpayOrder, payment };
  };

  return idempotencyKey ? withIdempotency(idempotencyKey, run) : run();
}

export async function createCheckoutSession({
  amount,
  currency = 'INR',
  userId,
  idempotencyKey,
  recipientName,
  upiId,
  note,
}) {
  const { razorpayOrder, payment } = await createOrder({
    amount,
    currency,
    userId,
    idempotencyKey,
    recipientName,
    upiId,
    note,
  });

  return {
    order: payment,
    gatewayOrder: razorpayOrder,
    upiLink: generateUPILink({
      upiId,
      amount,
      orderId: razorpayOrder.id,
      recipientName,
      note,
    }),
  };
}

export async function getTransactionsByUser(userId, options) {
  return PaymentModel.findByUserId(userId, options);
}

export async function handlePaymentSuccess(orderId, paymentId) {
  const existing = await PaymentModel.findByOrderId(orderId);
  if (!existing) {
    throw new Error(`Payment not found for order ${orderId}`);
  }

  if (existing.status === PaymentStatus.SUCCESS) {
    return existing;
  }

  const transactionRecordId = await mirrorSuccessfulPayment(existing, paymentId);
  const payment = await PaymentModel.updateStatus(
    orderId,
    PaymentStatus.SUCCESS,
    paymentId,
    transactionRecordId
  );
  logger.info(`Payment SUCCESS: orderId=${orderId} paymentId=${paymentId}`);
  return payment;
}

export async function handlePaymentFailure(orderId) {
  const payment = await PaymentModel.updateStatus(orderId, PaymentStatus.FAILED);
  logger.warn(`Payment FAILED: orderId=${orderId}`);
  return payment;
}

export async function confirmPayment(orderId, paymentId = randomPaymentId('pay')) {
  return handlePaymentSuccess(orderId, paymentId);
}

export async function getOrderStatus(orderId) {
  return PaymentModel.findByOrderId(orderId);
}
