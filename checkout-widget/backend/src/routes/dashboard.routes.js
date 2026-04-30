/**
 * Dashboard Routes
 * Analytics and metrics for payment dashboard
 */

import { Router } from 'express';
import { getDashboardStats, getRecentPayments, getGatewayBreakdown, getMethodUsage } from '../services/dashboard.service.js';
import { asyncHandler } from '../middlewares/error.middleware.js';

const router = Router();

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics
 */
router.get('/stats',
  asyncHandler(async (req, res) => {
    const { publicKey, days = 7 } = req.query;
    const result = await getDashboardStats(publicKey, parseInt(days));
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * GET /api/dashboard/recent
 * Get recent payments
 */
router.get('/recent',
  asyncHandler(async (req, res) => {
    const { publicKey, limit = 10 } = req.query;
    const result = await getRecentPayments(publicKey, parseInt(limit));
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * GET /api/dashboard/gateways
 * Get gateway-wise breakdown
 */
router.get('/gateways',
  asyncHandler(async (req, res) => {
    const { publicKey, days = 7 } = req.query;
    const result = await getGatewayBreakdown(publicKey, parseInt(days));
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * GET /api/dashboard/methods
 * Get payment method usage
 */
router.get('/methods',
  asyncHandler(async (req, res) => {
    const { publicKey, days = 7 } = req.query;
    const result = await getMethodUsage(publicKey, parseInt(days));
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

export default router;
