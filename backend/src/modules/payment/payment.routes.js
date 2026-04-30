import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import * as controller from './payment.controller.js';
import { optionalAuth } from '../../middlewares/auth.middleware.js';
import {
  validateConfirmPayment,
  validateCreateOrder,
  validateOrderId,
  validateUserId,
} from './payment.validation.js';

const router = Router();
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many payment requests. Please slow down.' },
});

// Public endpoints (no auth required)
router.post('/create', paymentLimiter, validateCreateOrder, controller.createPayment);
router.post('/upi-link', paymentLimiter, validateCreateOrder, controller.createPayment);

// Protected endpoints (auth required)
router.get('/user/:userId', validateUserId, optionalAuth, controller.getUserTransactions);
router.post(
  '/:orderId/confirm',
  paymentLimiter,
  validateOrderId,
  validateConfirmPayment,
  optionalAuth,
  controller.confirmPayment
);
router.get('/:orderId/status', validateOrderId, optionalAuth, controller.getPaymentStatus);

export default router;
