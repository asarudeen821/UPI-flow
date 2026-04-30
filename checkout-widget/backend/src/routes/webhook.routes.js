/**
 * Webhook Routes
 * Handle incoming webhooks from payment gateways
 */

import { Router } from 'express';
import { processWebhook } from '../services/webhook.service.js';
import { asyncHandler } from '../middlewares/error.middleware.js';

const router = Router();

/**
 * POST /api/webhooks/:gateway
 * Universal webhook endpoint for all gateways
 */
router.post('/:gateway',
  asyncHandler(async (req, res) => {
    const { gateway } = req.params;
    
    // Validate gateway
    const supportedGateways = ['razorpay', 'stripe']; // , 'paypal'
    if (!supportedGateways.includes(gateway.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Unsupported gateway: ${gateway}`
      });
    }
    
    // Process webhook
    const result = await processWebhook(gateway, req);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        event: result.event,
        processed: true
      });
    } else {
      res.status(result.statusCode || 400).json({
        success: false,
        error: result.error
      });
    }
  })
);

export default router;
