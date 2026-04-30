import * as aiService from './ai.service.js';
import * as businessChatService from './ai.business-chat.service.js';
import * as qrService from '../qr/qr.service.js';
import * as linkService from '../paymentlink/paymentlink.service.js';
import * as paymentService from '../payment/payment.service.js';
import * as paymentFormService from '../paymentform/paymentform.service.js';
import { isMockMode } from './ai.client.js';
import logger from '../../utils/logger.js';

function mockExecuteResult(action, params) {
  const ref = `MOCK_${Date.now().toString(36).toUpperCase()}`;
  switch (action) {
    case 'generate_qr':
      return {
        id: ref,
        ref,
        upi_id: params?.upiId || 'merchant@upi',
        recipient_name: params?.recipientName || 'Merchant',
        amount: params?.amount || null,
        qr_image_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${params?.upiId || 'merchant@upi'}&format=png`,
        upi_string: `upi://pay?pa=${params?.upiId || 'merchant@upi'}&cu=INR`,
        is_active: true,
        mock: true,
      };
    case 'create_payment_link':
      return {
        id: ref,
        slug: ref.toLowerCase(),
        url: `http://localhost:3000/pay/${ref.toLowerCase()}`,
        amount: params?.amount || null,
        description: params?.description || '',
        recipient_name: params?.recipientName || 'Merchant',
        upi_id: params?.upiId || 'merchant@upi',
        is_active: true,
        mock: true,
      };
    case 'create_payment_page':
      return {
        order: { id: ref, amount: params?.amount, currency: params?.currency || 'INR', status: 'created' },
        gatewayOrder: { id: `order_${ref}`, amount: params?.amount, currency: 'INR', provider: 'mock' },
        upiLink: `upi://pay?pa=${params?.upiId || 'merchant@upi'}&am=${params?.amount}&cu=INR`,
        mock: true,
      };
    case 'show_analytics':
      return {
        summary: 'Mock analytics: your platform is performing well.',
        insights: ['Transaction volume is steady', 'Peak hours: 6–9 PM', 'Mobile payments: 78%'],
        suggestions: ['Add quick payment options', 'Send payment reminders', 'Enable auto-settlement'],
        mock: true,
      };
    default:
      return { mock: true };
  }
}

function aiUnavailable(res, err) {
  logger.warn(`AI unavailable: ${err.message}`);
  return res.status(503).json({ success: false, error: err.message });
}

// GET /api/ai/status — frontend calls this to decide whether to show AI UI
export function getStatus(req, res) {
  const status = aiService.getAIStatus();
  res.json({
    success: true,
    data: status,
  });
}

// POST /api/ai/form — generate payment form config from natural language
export async function generateForm(req, res, next) {
  try {
    const { prompt, save, upiId, recipientName } = req.body;
    if (!prompt) return res.status(422).json({ success: false, error: 'prompt is required' });
    
    // Generate form config from AI
    const formConfig = await aiService.generateForm(prompt);
    
    // If save is true, save to database and generate QR
    if (save) {
      const form = await paymentFormService.createForm({
        title: formConfig.title,
        description: formConfig.description,
        currency: formConfig.currency,
        fields: formConfig.fields,
        quickAmounts: formConfig.quickAmounts,
        allowCustomAmount: formConfig.allowCustomAmount,
        upiId: upiId || null,
        recipientName: recipientName || formConfig.title,
      });

      // Generate QR code if UPI ID provided
      let qrCode = null;
      if (upiId) {
        qrCode = await qrService.createQR({
          upiId,
          recipientName: recipientName || formConfig.title,
          note: `Payment for ${formConfig.title}`,
        });
      }

      res.json({ 
        success: true, 
        data: { 
          ...formConfig,
          formId: form.id,
          slug: form.slug,
          qrCode 
        } 
      });
      return;
    }
    
    res.json({ success: true, data: formConfig });
  } catch (err) {
    if (err.message.includes('OPENAI_API_KEY')) return aiUnavailable(res, err);
    next(err);
  }
}

// POST /api/ai/merchant — detect merchant intent, return action + params
export async function merchantAssist(req, res, next) {
  try {
    const { message, context } = req.body;
    if (!message) return res.status(422).json({ success: false, error: 'message is required' });
    const { history, ...ctx } = context || {};
    const result = await aiService.merchantAssist(message, ctx, history || []);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('OPENAI_API_KEY')) return aiUnavailable(res, err);
    next(err);
  }
}

// POST /api/ai/merchant/execute — execute the action returned by merchant assistant
export async function executeMerchantAction(req, res, next) {
  try {
    const { action, params } = req.body;
    if (!action) return res.status(422).json({ success: false, error: 'action is required' });

    // In mock mode, return simulated results without calling real services
    if (isMockMode()) {
      return res.json({ success: true, action, data: mockExecuteResult(action, params) });
    }

    let result;
    switch (action) {
      case 'generate_qr':
        if (!params?.upiId) return res.status(422).json({ success: false, error: 'upiId required for generate_qr' });
        result = await qrService.createQR(params);
        break;

      case 'create_payment_link':
        if (!params?.upiId) return res.status(422).json({ success: false, error: 'upiId required for create_payment_link' });
        result = await linkService.createLink({
          ...params,
          baseUrl: `${req.protocol}://${req.get('host')}`,
        });
        break;

      case 'create_payment_page': {
        const { amount, currency, userId, recipientName, upiId, note } = params || {};
        if (!amount) return res.status(422).json({ success: false, error: 'amount required for create_payment_page' });
        result = await paymentService.createCheckoutSession({ amount, currency, userId, recipientName, upiId, note });
        break;
      }

      case 'show_analytics':
        result = await aiService.autoAnalyzeFromDB();
        break;

      default:
        return res.status(422).json({ success: false, error: `Unknown action: ${action}` });
    }

    res.json({ success: true, action, data: result });
  } catch (err) {
    if (err.message.includes('OPENAI_API_KEY')) return aiUnavailable(res, err);
    next(err);
  }
}

// POST /api/ai/analytics — explain a stats object passed by caller
export async function analyzeMetrics(req, res, next) {
  try {
    const { stats } = req.body;
    if (!stats || typeof stats !== 'object') {
      return res.status(422).json({ success: false, error: 'stats object is required' });
    }
    const result = await aiService.analyzeMetrics(stats);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('OPENAI_API_KEY')) return aiUnavailable(res, err);
    next(err);
  }
}

// GET /api/ai/analytics/auto — fetch live DB stats + run AI insights automatically
export async function autoAnalytics(req, res, next) {
  try {
    const result = await aiService.autoAnalyzeFromDB();
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('OPENAI_API_KEY')) return aiUnavailable(res, err);
    next(err);
  }
}

// POST /api/ai/support — customer support bot with multi-turn conversation history
export async function supportReply(req, res, next) {
  try {
    const { message, transactionContext, transactionId, history } = req.body;
    if (!message) return res.status(422).json({ success: false, error: 'message is required' });

    // Fetch real transaction data from DB if transactionId provided
    let resolvedContext = transactionContext || null;
    if (transactionId && !resolvedContext) {
      try {
        const { getDatabase } = await import('../../db/mongo.js');
        const db = await getDatabase();
        const txn = await db.collection('transactions').findOne({ transaction_id: transactionId })
          || await db.collection('payments').findOne({ transaction_id: transactionId });
        if (txn) resolvedContext = txn;
      } catch { /* non-critical — proceed without context */ }
    }

    const result = await aiService.supportReply(message, resolvedContext, history || []);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('OPENAI_API_KEY')) return aiUnavailable(res, err);
    next(err);
  }
}

// POST /api/ai/support/stream — streaming support bot for real-time responses
export async function supportReplyStream(req, res, next) {
  try {
    const { message, transactionContext, history } = req.body;
    if (!message) return res.status(422).json({ success: false, error: 'message is required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send thinking indicator immediately so UI feels responsive
    res.write(`data: ${JSON.stringify({ type: 'thinking', content: 'Thinking...' })}\n\n`);

    const result = await aiService.supportReply(message, transactionContext || null, history || []);

    // Stream reply word by word at a natural pace (30ms per word)
    const words = result.reply.split(' ');
    for (const word of words) {
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: word + ' ' })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    res.write(`data: ${JSON.stringify({ type: 'complete', data: result })}\n\n`);
    res.end();
  } catch (err) {
    if (err.message.includes('OPENAI_API_KEY')) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
      return;
    }
    next(err);
  }
}

// POST /api/ai/chat — generic chat: routes to merchant or support based on context.role
export async function genericChat(req, res, next) {
  try {
    const { message, context } = req.body;
    if (!message) return res.status(422).json({ success: false, error: 'message is required' });

    // Safety guard — AI must never process payments
    if (context?.action === 'PROCESS_PAYMENT') {
      return res.status(403).json({ success: false, error: 'AI cannot process payments' });
    }

    let result;
    if (context?.role === 'support') {
      result = await aiService.supportReply(message, context.transactionContext || null, context.history || []);
      result.action = result.escalate ? 'SUPPORT_QUERY' : 'none';
    } else {
      result = await aiService.merchantAssist(message, context || {});
    }

    res.json({ success: true, data: { reply: result.reply, action: result.action, params: result.params || {} } });
  } catch (err) {
    if (err.message.includes('OPENAI_API_KEY')) return aiUnavailable(res, err);
    next(err);
  }
}

// GET /api/ai/insights — quick insights alias for auto analytics
export async function getInsights(req, res, next) {
  try {
    const result = await aiService.autoAnalyzeFromDB();
    res.json({ success: true, insights: result.insights, summary: result.summary, suggestions: result.suggestions });
  } catch (err) {
    if (err.message.includes('OPENAI_API_KEY')) return aiUnavailable(res, err);
    next(err);
  }
}

// POST /api/ai/workflow — workflow automation suggestions
export async function suggestWorkflows(req, res, next) {
  try {
    const { context } = req.body;
    const result = await aiService.suggestWorkflows(context || {});
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('OPENAI_API_KEY')) return aiUnavailable(res, err);
    next(err);
  }
}

// POST /api/ai/invoice — invoice generator
export async function generateInvoice(req, res, next) {
  try {
    const { details } = req.body;
    if (!details || typeof details !== 'object') {
      return res.status(422).json({ success: false, error: 'details object is required' });
    }
    const result = await aiService.generateInvoice(details);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('OPENAI_API_KEY')) return aiUnavailable(res, err);
    next(err);
  }
}

// POST /api/ai/fraud — fraud awareness advisory (never blocks transactions)
export async function analyzeFraud(req, res, next) {
  try {
    const { transactionData } = req.body;
    if (!transactionData || typeof transactionData !== 'object') {
      return res.status(422).json({ success: false, error: 'transactionData object is required' });
    }
    const result = await aiService.analyzeFraudRisk(transactionData);
    res.json({ success: true, data: result, advisory: true });
  } catch (err) {
    if (err.message.includes('OPENAI_API_KEY')) return aiUnavailable(res, err);
    next(err);
  }
}

// ─── AI Configuration Endpoints (Dynamic Mode Switching) ─────────────────────

// GET /api/ai/config — Get current AI configuration
export function getConfig(req, res) {
  try {
    const config = aiService.getAIConfig();
    res.json({
      success: true,
      data: {
        mockMode: config.mockMode,
        hasApiKey: config.hasApiKey,
        model: config.model,
        apiKeyConfigured: config.apiKeyConfigured,
        runtimeConfigured: config.runtimeConfigured,
        available: config.available
      }
    });
  } catch (err) {
    logger.error('Error getting AI config:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/ai/config — Configure AI at runtime (switch between mock/real/SLM)
export async function setConfig(req, res) {
  try {
    const { apiKey, model, forceMock, forceSLM } = req.body;

    // Validate API key format if provided (basic check)
    if (apiKey && !forceMock && !forceSLM) {
      if (!apiKey.startsWith('sk-') && !apiKey.startsWith('Bearer ')) {
        logger.warn('Invalid API key format provided');
        // Don't reject - let the test connection validate it
      }
    }

    const result = aiService.configureAI({ apiKey, model, forceMock, forceSLM });

    res.json({
      success: true,
      data: result,
      message: result.slmMode
        ? 'AI switched to SLM mode (Small Language Model)'
        : result.mockMode
        ? 'AI switched to MOCK mode'
        : 'AI switched to REAL mode'
    });
  } catch (err) {
    logger.error('Error configuring AI:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/ai/config/test — Test AI connection
export async function testConfig(req, res) {
  try {
    const result = await aiService.testAIConnection();
    res.json({
      success: result.success,
      data: result
    });
  } catch (err) {
    logger.error('Error testing AI connection:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      data: { mode: 'unknown' }
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT-TO-BUSINESS DASHBOARD — Unified Action Endpoints
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/ai/business/chat — Main unified chat endpoint
export async function businessChat(req, res, next) {
  try {
    const { message, context, history, userId: bodyUserId } = req.body;
    if (!message) return res.status(422).json({ success: false, error: 'message is required' });

    // Get userId from multiple sources (priority: body > query > context > default)
    const userId = bodyUserId || req.query.userId || context?.userId || req.user?.id || 'anonymous';
    
    logger.info(`Business chat from user: ${userId}`);

    // Parse intent from message
    const intent = await businessChatService.businessChat(message, { 
      ...context, 
      userId,
      baseUrl: `${req.protocol}://${req.get('host')}`,
    }, history || []);
    
    logger.info(`Business chat intent: ${JSON.stringify(intent)}`);
    
    // If SLM already executed the action (result is embedded), return directly
    if (intent.executed && intent.result) {
      return res.json({
        success: true,
        data: {
          reply: intent.reply,
          action: intent.action,
          confidence: intent.confidence || 0.95,
          result: intent.result,
          executed: true,
          slm: intent.slm || false,
        }
      });
    }

    // If no action needed, just return the reply
    if (!intent.action || intent.action === 'none') {
      return res.json({
        success: true,
        data: {
          reply: intent.reply,
          action: 'none',
          confidence: intent.confidence
        }
      });
    }

    // Execute the detected action (lowered confidence threshold to 0.3 for better detection)
    if (intent.confidence < 0.3 || intent.action === 'awaiting_upi_for_qr' || intent.action === 'awaiting_upi_for_link') {
      return res.json({
        success: true,
        data: {
          reply: intent.reply,
          action: 'none',
          confidence: intent.confidence
        }
      });
    }

    // Execute the detected action
    let result;
    switch (intent.action) {
      case 'generate_payment_link':
        result = await executePaymentLink(intent.params, userId);
        break;
      case 'generate_qr_code':
        result = await executeQRCode(intent.params, userId);
        break;
      case 'create_payment_page':
        result = await executePaymentPage(intent.params, userId);
        break;
      case 'show_analytics':
        result = await executeAnalytics(intent.params, userId);
        break;
      case 'search_payments':
        result = await executeSearch(intent.params, userId);
        break;
      case 'generate_invoice':
        result = await executeInvoice(intent.params, context, userId);
        break;
      case 'explain_fraud':
        result = await executeFraudExplanation(intent.params, userId);
        break;
      default:
        return res.json({
          success: true,
          data: {
            reply: intent.reply,
            action: 'none',
            confidence: intent.confidence
          }
        });
    }

    res.json({
      success: true,
      data: {
        reply: intent.reply,
        action: intent.action,
        confidence: intent.confidence,
        result: result
      }
    });
  } catch (err) {
    if (err.message.includes('OPENAI_API_KEY')) return aiUnavailable(res, err);
    logger.error('Business chat error:', err);
    next(err);
  }
}

// Execute: Payment Link Generation
async function executePaymentLink(params, userId = 'anonymous') {
  const result = await linkService.createLink({
    ...params,
    baseUrl: 'http://localhost:3000',
    userId,
    source: 'chat', // Mark as created from chat
  });
  return { ...result, executed: true, stored: true };
}

// Execute: QR Code Generation
async function executeQRCode(params, userId = 'anonymous') {
  if (!params.upiId) {
    // Use default UPI ID if not provided
    params.upiId = 'merchant@upi';
  }

  const result = await qrService.createQR({
    ...params,
    userId,
    source: 'chat', // Mark as created from chat
  });
  return { ...result, executed: true, stored: true };
}

// Execute: Payment Page
async function executePaymentPage(params, userId = 'anonymous') {
  const result = await paymentService.createCheckoutSession({
    ...params,
    userId,
  });
  return { ...result, executed: true, stored: true };
}

// Execute: Analytics
async function executeAnalytics(params, userId = 'anonymous') {
  const timeRange = params?.timeRange || 'week';
  const analytics = await businessChatService.getAnalytics(timeRange);
  
  // If there's a specific question, answer it
  if (params?.question) {
    const qa = await businessChatService.analyticsQA(params.question, analytics);
    return { ...analytics, qa };
  }
  
  // Generate insights
  const insights = await businessChatService.generateBusinessInsights(analytics);
  return { ...analytics, insights, executed: true };
}

// Execute: Search
async function executeSearch(params, userId = 'anonymous') {
  const searchParams = await businessChatService.parseSearchQuery(params.query || '');
  const results = await businessChatService.searchPayments(searchParams.filters);
  return { ...results, query: searchParams.reply, executed: true };
}

// Execute: Invoice
async function executeInvoice(params, context, userId = 'anonymous') {
  const invoiceDetails = await businessChatService.extractInvoiceDetails(
    params.message || '',
    context?.history || []
  );
  
  const { InvoiceModel } = await import('../invoice/invoice.model.js');
  
  // Create invoice in MongoDB
  const invoice = await InvoiceModel.create({
    userId,
    customerName: invoiceDetails.customerName || 'Customer',
    customerEmail: invoiceDetails.customerEmail || 'customer@example.com',
    items: invoiceDetails.items || [],
    subtotal: invoiceDetails.subtotal || 0,
    tax: invoiceDetails.tax || 0,
    totalAmount: invoiceDetails.totalAmount || 0,
    notes: invoiceDetails.notes || '',
    dueDate: invoiceDetails.dueDate,
    source: 'chat',
  });
  
  return { invoice, executed: true, stored: true };
}

// Execute: Fraud Explanation
async function executeFraudExplanation(params, userId = 'anonymous') {
  const transactionData = params.transaction || {};
  const explanation = await businessChatService.explainFraud(transactionData);
  return { ...explanation, executed: true };
}

// GET /api/ai/business/analytics — Get analytics data
export async function getBusinessAnalytics(req, res, next) {
  try {
    const { timeRange = 'week' } = req.query;
    const analytics = await businessChatService.getAnalytics(timeRange);
    res.json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
}

// POST /api/ai/business/suggestions — Get AI suggestions
export async function getBusinessSuggestions(req, res, next) {
  try {
    const { context } = req.body;
    const suggestions = await businessChatService.generateAutoSuggestions(context || {});
    res.json({ success: true, data: suggestions });
  } catch (err) {
    next(err);
  }
}

// POST /api/ai/business/notifications — Summarize notifications
export async function summarizeNotifications(req, res, next) {
  try {
    const { notifications } = req.body;
    const summary = await businessChatService.summarizeNotifications(notifications || []);
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STORED DATA ENDPOINTS — Retrieve data from MongoDB
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/ai/business/links — Get all payment links from MongoDB
export async function getPaymentLinks(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const userId = req.query.userId || null;
    
    const result = await linkService.listLinks(userId, parseInt(page), parseInt(limit));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// GET /api/ai/business/qrcodes — Get all QR codes from MongoDB
export async function getQRCodes(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const userId = req.query.userId || null;
    
    const result = await qrService.listQRs(userId, parseInt(page), parseInt(limit));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// GET /api/ai/business/invoices — Get all invoices from MongoDB
export async function getInvoices(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const userId = req.query.userId || null;
    
    const { InvoiceModel } = await import('../invoice/invoice.model.js');
    const result = userId 
      ? await InvoiceModel.findByUserId(userId, { page: parseInt(page), limit: parseInt(limit) })
      : await InvoiceModel.findAll({ page: parseInt(page), limit: parseInt(limit) });
    
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// GET /api/ai/business/stats — Get comprehensive statistics from MongoDB
export async function getBusinessStats(req, res, next) {
  try {
    const userId = req.query.userId || null;
    
    const { InvoiceModel } = await import('../invoice/invoice.model.js');
    
    const [linkStats, qrStats, invoiceStats, analytics] = await Promise.all([
      linkService.getLinkStats(userId),
      qrService.getQRStats(userId),
      InvoiceModel.getStats(userId),
      businessChatService.getAnalytics('week'),
    ]);
    
    res.json({
      success: true,
      data: {
        links: linkStats,
        qrcodes: qrStats,
        invoices: invoiceStats,
        analytics,
      }
    });
  } catch (err) {
    next(err);
  }
}
