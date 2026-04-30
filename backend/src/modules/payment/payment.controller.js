import * as paymentService from './payment.service.js';

export async function createPayment(req, res, next) {
  try {
    const { amount, currency, userId, recipientName, upiId, note } = req.body;
    const idempotencyKey = req.headers['idempotency-key'];
    const result = await paymentService.createCheckoutSession({
      amount,
      currency,
      userId,
      idempotencyKey,
      recipientName,
      upiId,
      note,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getUserTransactions(req, res, next) {
  try {
    const { userId } = req.params;
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 20;
    const result = await paymentService.getTransactionsByUser(userId, { page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function confirmPayment(req, res, next) {
  try {
    const { orderId } = req.params;
    const { paymentId } = req.body;
    const result = await paymentService.confirmPayment(orderId, paymentId);
    req.app.get('io')?.emit('payment-success', { orderId, payment: result });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getPaymentStatus(req, res, next) {
  try {
    const { orderId } = req.params;
    const result = await paymentService.getOrderStatus(orderId);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
