import express from 'express';
import rateLimit from 'express-rate-limit';

import { errorMiddleware } from './middlewares/error.middleware.js';
import paymentRoutes from './modules/payment/payment.routes.js';
import linkRoutes from './modules/paymentlink/paymentlink.routes.js';
import qrRoutes from './modules/qr/qr.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import transactionRoutes from './modules/transaction/transaction.routes.js';
import paymentFormRoutes from './modules/paymentform/paymentform.routes.js';
import { handleWebhook } from './webhooks/razorpay.webhook.js';
import logger from './utils/logger.js';

const app = express();
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many API requests. Please try again shortly.' },
});

app.use('/api/webhooks/razorpay', express.raw({ type: 'application/json' }), handleWebhook);
app.use(express.json());
app.use(apiLimiter);
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Idempotency-Key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use('/api/payments', paymentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/links', linkRoutes);
app.use('/api/payment-forms', paymentFormRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use(errorMiddleware);

export default app;
