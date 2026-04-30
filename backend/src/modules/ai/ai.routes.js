import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from './ai.controller.js';

const router = Router();

// Stricter limiter for AI endpoints — protects OpenAI quota
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many AI requests. Please wait a moment.' },
});

router.use(aiLimiter);

// Phase 1 — Safe & Powerful
// GET  /api/ai/status            — check if AI is enabled (frontend gates AI UI on this)
router.get('/status', controller.getStatus);

// POST /api/ai/form              — no-code payment form generator
router.post('/form', controller.generateForm);

// POST /api/ai/merchant          — merchant assistant (intent detection)
router.post('/merchant', controller.merchantAssist);

// POST /api/ai/merchant/execute  — execute the action returned by merchant assistant
router.post('/merchant/execute', controller.executeMerchantAction);

// Phase 2 — Analytics & Support
// POST /api/ai/analytics         — explain a stats object passed by caller
router.post('/analytics', controller.analyzeMetrics);

// GET  /api/ai/analytics/auto    — fetch live DB stats + run AI insights automatically
router.get('/analytics/auto', controller.autoAnalytics);

// POST /api/ai/support           — customer support bot (multi-turn via history[])
router.post('/support', controller.supportReply);

// POST /api/ai/support/stream    — streaming support bot for real-time responses
router.post('/support/stream', controller.supportReplyStream);

// POST /api/ai/chat              — generic chat endpoint (routes to merchant or support based on context)
router.post('/chat', controller.genericChat);

// GET  /api/ai/insights          — quick insights alias
router.get('/insights', controller.getInsights);

// POST /api/ai/workflow          — workflow automation suggestions
router.post('/workflow', controller.suggestWorkflows);

// POST /api/ai/invoice           — invoice generator
router.post('/invoice', controller.generateInvoice);

// POST /api/ai/fraud             — fraud awareness advisory (read-only)
router.post('/fraud', controller.analyzeFraud);

// Phase 3 — Dynamic AI Configuration
// GET  /api/ai/config            — get current AI configuration status
router.get('/config', controller.getConfig);

// POST /api/ai/config            — configure AI at runtime (switch mock/real)
router.post('/config', controller.setConfig);

// POST /api/ai/config/test       — test AI connection (validate API key)
router.post('/config/test', controller.testConfig);

// ─────────────────────────────────────────────────────────────────────────────
// CHAT-TO-BUSINESS DASHBOARD — Unified Action Routes
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/ai/business/chat     — main unified chat endpoint (execute actions via chat)
router.post('/business/chat', controller.businessChat);

// GET  /api/ai/business/analytics — get analytics data
router.get('/business/analytics', controller.getBusinessAnalytics);

// POST /api/ai/business/suggestions — get AI business suggestions
router.post('/business/suggestions', controller.getBusinessSuggestions);

// POST /api/ai/business/notifications — summarize notifications
router.post('/business/notifications', controller.summarizeNotifications);

// ─────────────────────────────────────────────────────────────────────────────
// STORED DATA ROUTES — Retrieve data from MongoDB
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/ai/business/links — get all payment links
router.get('/business/links', controller.getPaymentLinks);

// GET /api/ai/business/qrcodes — get all QR codes
router.get('/business/qrcodes', controller.getQRCodes);

// GET /api/ai/business/invoices — get all invoices
router.get('/business/invoices', controller.getInvoices);

// GET /api/ai/business/stats — get comprehensive statistics
router.get('/business/stats', controller.getBusinessStats);

export default router;
