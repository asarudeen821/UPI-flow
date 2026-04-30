import express from 'express';
import { getAnalyticsOverview } from './analytics.controller.js';

const router = express.Router();

/**
 * GET /api/analytics/overview
 * Get dashboard analytics overview
 * Query params:
 *  - days: Number of days for chart data (default: 7)
 *  - limit: Limit for top recipients (default: 5)
 */
router.get('/overview', getAnalyticsOverview);

export default router;
