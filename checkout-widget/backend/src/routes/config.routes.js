/**
 * Config Routes
 * Get public configuration for SDK initialization
 */

import { Router } from 'express';
import { getPublicConfig } from '../services/config.service.js';
import { asyncHandler } from '../middlewares/error.middleware.js';

const router = Router();

/**
 * GET /api/config/public
 * Get public configuration for SDK
 */
router.get('/public',
  asyncHandler(async (req, res) => {
    const result = await getPublicConfig(req.query.publicKey);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  })
);

export default router;
