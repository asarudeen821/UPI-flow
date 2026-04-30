/**
 * Payment Routes
 * Create, verify, and manage payments
 */

import { Router } from 'express';
import { createPayment, verifyPayment, getPaymentStatus, getPaymentMethods } from '../services/payment.service.js';
import { validatePaymentRequest, validateVerificationRequest } from '../middlewares/validation.middleware.js';
import { asyncHandler } from '../middlewares/error.middleware.js';

const router = Router();

/**
 * POST /api/payments/create
 * Create a new payment order
 */
router.post('/create',
  validatePaymentRequest,
  asyncHandler(async (req, res) => {
    const result = await createPayment(req.body);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * POST /api/payments/verify
 * Verify payment signature (client-side verification)
 */
router.post('/verify',
  validateVerificationRequest,
  asyncHandler(async (req, res) => {
    const result = await verifyPayment(req.body);
    
    if (result.success && result.verified) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * GET /api/payments/:paymentId/status
 * Get payment status
 */
router.get('/:paymentId/status',
  asyncHandler(async (req, res) => {
    const result = await getPaymentStatus(req.params.paymentId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  })
);

/**
 * GET /api/payments/methods
 * Get available payment methods
 */
router.get('/methods',
  asyncHandler(async (req, res) => {
    const result = await getPaymentMethods();
    res.json(result);
  })
);

export default router;
