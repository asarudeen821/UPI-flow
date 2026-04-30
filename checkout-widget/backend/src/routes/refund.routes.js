/**
 * Refund Routes
 * Handle refund operations
 */

import { Router } from 'express';
import { createRefund, getRefund, getPaymentRefunds, getRefundStats } from '../services/refund.service.js';
import { asyncHandler } from '../middlewares/error.middleware.js';
import Joi from 'joi';

const router = Router();

// Refund creation schema
const refundSchema = Joi.object({
  paymentId: Joi.string().required(),
  amount: Joi.number().positive().optional(),
  reason: Joi.string().max(500).optional(),
  publicKey: Joi.string().required().min(10)
});

/**
 * POST /api/refunds/create
 * Create a new refund
 */
router.post('/create',
  asyncHandler(async (req, res) => {
    const { error, value } = refundSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }
    
    const result = await createRefund(value);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * GET /api/refunds/:refundId
 * Get refund details
 */
router.get('/:refundId',
  asyncHandler(async (req, res) => {
    const result = await getRefund(req.params.refundId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  })
);

/**
 * GET /api/refunds/payment/:paymentId
 * Get all refunds for a payment
 */
router.get('/payment/:paymentId',
  asyncHandler(async (req, res) => {
    const result = await getPaymentRefunds(req.params.paymentId);
    res.json(result);
  })
);

/**
 * GET /api/refunds/stats
 * Get refund statistics
 */
router.get('/stats',
  asyncHandler(async (req, res) => {
    const { publicKey, days = 30 } = req.query;
    const result = await getRefundStats(publicKey, parseInt(days));
    res.json(result);
  })
);

export default router;
