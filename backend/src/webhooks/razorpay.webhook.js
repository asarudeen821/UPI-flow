import crypto from 'crypto';
import env from '../config/env.js';
import { handlePaymentSuccess, handlePaymentFailure } from '../modules/payment/payment.service.js';
import logger from '../utils/logger.js';

export async function handleWebhook(req, res) {
  const signature = req.headers['x-razorpay-signature'];
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(req.body) // raw Buffer — must use express.raw() for this route
    .digest('hex');

  if (signature !== expected) {
    logger.warn('Webhook: invalid signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString());
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { event: eventName, payload } = event;
  const entity = payload?.payment?.entity || payload?.order?.entity || {};

  try {
    if (eventName === 'payment.captured') {
      const updated = await handlePaymentSuccess(entity.order_id, entity.id);
      // Emit real-time event if Socket.io is attached
      req.app.get('io')?.emit('payment-success', { orderId: entity.order_id, payment: updated });
    } else if (eventName === 'payment.failed') {
      await handlePaymentFailure(entity.order_id);
      req.app.get('io')?.emit('payment-failed', { orderId: entity.order_id });
    }
  } catch (err) {
    logger.error(`Webhook processing error: ${err.message}`);
    return res.status(500).json({ error: 'Internal error' });
  }

  res.json({ status: 'ok' });
}
