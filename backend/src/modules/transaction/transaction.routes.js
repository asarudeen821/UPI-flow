import { Router } from 'express';
import * as historyController from './transactionHistory.controller.js';
import * as transactionController from './transaction.controller.js';

const router = Router();

// New enhanced transaction endpoints
router.post('/', transactionController.createTransaction);
router.get('/analytics/:userId', transactionController.getAnalytics);
router.get('/timeline', transactionController.getTimeline);
router.get('/stats', transactionController.getStats);
router.get('/search', transactionController.searchTransactions);

// Transaction History endpoints (enhanced with date/time/day)
router.get('/history', historyController.getTransactionHistory);
router.get('/history/timeline', historyController.getTransactionTimeline);
router.get('/history/stats', historyController.getTransactionStats);
router.get('/history/:id', historyController.getTransactionDetails);

// Existing transaction endpoints
router.get('/', transactionController.getAllTransactions);
router.get('/:id', transactionController.getTransactionById);
router.patch('/:id/status', transactionController.updateTransactionStatus);

export default router;
