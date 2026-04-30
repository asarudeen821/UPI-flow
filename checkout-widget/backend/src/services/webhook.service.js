/**
 * Webhook Service
 * Process incoming webhooks with security and idempotency
 */

import GatewayFactory from '../gateways/GatewayFactory.js';
import PaymentModel from '../models/Payment.js';
import { getCollection } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Process webhook from payment gateway
 */
export async function processWebhook(gateway, req) {
  const eventId = req.headers['x-razorpay-signature'] || 
                  req.headers['stripe-signature'] || 
                  `manual_${Date.now()}`;
  
  // Check idempotency - prevent duplicate processing
  const webhookLogs = getCollection('webhook_logs');
  const existingLog = await webhookLogs.findOne({ eventId });
  
  if (existingLog) {
    logger.info(`Webhook already processed: ${eventId}`);
    return {
      success: true,
      event: existingLog.event,
      duplicate: true
    };
  }
  
  try {
    // Get gateway adapter
    const configCollection = getCollection('configs');
    const config = await configCollection.findOne({ 
      gateway, 
      active: true 
    });
    
    if (!config) {
      logger.warn(`No active config for gateway: ${gateway}`);
      return {
        success: false,
        error: 'Gateway not configured',
        statusCode: 400
      };
    }
    
    const adapter = GatewayFactory.getAdapter(gateway, config.gatewayConfig);
    
    // Process webhook through adapter
    const result = await adapter.handleWebhook(req);
    
    if (!result.success) {
      // Log failed webhook
      await webhookLogs.insertOne({
        eventId,
        gateway,
        event: 'unknown',
        status: 'failed',
        error: result.error,
        timestamp: new Date().toISOString()
      });
      
      return result;
    }
    
    // Log webhook event
    await webhookLogs.insertOne({
      eventId,
      gateway,
      event: result.event,
      status: 'success',
      data: result.data,
      timestamp: new Date().toISOString()
    });
    
    logger.info(`Webhook processed: ${gateway} - ${result.event}`);
    
    // Process payment update based on event
    if (result.event === 'payment.success') {
      await handlePaymentSuccess(result.data, gateway);
    } else if (result.event === 'payment.failed') {
      await handlePaymentFailed(result.data, gateway);
    } else if (result.event === 'payment.refunded') {
      await handlePaymentRefunded(result.data, gateway);
    }
    
    // Emit real-time event via Socket.IO
    const io = global.io;
    if (io && result.data?.paymentId) {
      io.to(`payment:${result.data.paymentId}`).emit('payment:update', {
        event: result.event,
        data: result.data
      });
    }
    
    return result;
  } catch (error) {
    logger.error('Webhook processing error:', error);
    
    // Log error
    await webhookLogs.insertOne({
      eventId,
      gateway,
      event: 'error',
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: false,
      error: error.message,
      statusCode: 500
    };
  }
}

/**
 * Handle successful payment webhook
 */
async function handlePaymentSuccess(data, gateway) {
  try {
    // Find payment by gateway order ID or payment ID
    let payment = await PaymentModel.findByPaymentId(data.paymentId);
    
    if (!payment && data.orderId) {
      payment = await PaymentModel.findByOrderId(data.orderId);
    }
    
    if (!payment) {
      logger.warn(`Payment not found for webhook: ${data.paymentId}`);
      return;
    }
    
    // Update payment status
    await PaymentModel.updateStatus(payment.paymentId, 'success', {
      gatewayPaymentId: data.paymentId,
      paymentMethod: data.method,
      customer: {
        ...payment.customer,
        email: data.email || payment.customer.email,
        phone: data.contact || payment.customer.phone
      },
      verified: true,
      verificationData: data
    });
    
    logger.info(`Payment marked as success: ${payment.paymentId}`);
    
    // Trigger automation (Zapier/Make)
    await triggerAutomation('payment.success', {
      paymentId: payment.paymentId,
      amount: payment.amount,
      currency: payment.currency,
      customer: payment.customer,
      product: payment.product
    });
    
  } catch (error) {
    logger.error('Handle payment success error:', error);
  }
}

/**
 * Handle failed payment webhook
 */
async function handlePaymentFailed(data, gateway) {
  try {
    let payment = await PaymentModel.findByPaymentId(data.paymentId);
    
    if (!payment && data.orderId) {
      payment = await PaymentModel.findByOrderId(data.orderId);
    }
    
    if (!payment) {
      return;
    }
    
    await PaymentModel.updateStatus(payment.paymentId, 'failed', {
      gatewayPaymentId: data.paymentId,
      gatewayError: data.error
    });
    
    logger.info(`Payment marked as failed: ${payment.paymentId}`);
    
  } catch (error) {
    logger.error('Handle payment failed error:', error);
  }
}

/**
 * Handle refunded payment webhook
 */
async function handlePaymentRefunded(data, gateway) {
  try {
    let payment = await PaymentModel.findByPaymentId(data.paymentId);
    
    if (!payment) {
      return;
    }
    
    await PaymentModel.updateStatus(payment.paymentId, 'refunded', {
      refundAmount: data.amount,
      refundId: data.refundId
    });
    
    logger.info(`Payment marked as refunded: ${payment.paymentId}`);
    
  } catch (error) {
    logger.error('Handle payment refunded error:', error);
  }
}

/**
 * Trigger external automation (Zapier/Make)
 */
async function triggerAutomation(event, data) {
  try {
    const automationUrl = process.env.AUTOMATION_WEBHOOK_URL;
    
    if (!automationUrl) {
      return;
    }
    
    const axios = (await import('axios')).default;
    
    await axios.post(automationUrl, {
      event,
      data,
      timestamp: new Date().toISOString()
    }, {
      timeout: 5000
    });
    
    logger.info(`Automation triggered: ${event}`);
  } catch (error) {
    logger.warn('Automation trigger failed:', error.message);
  }
}

export default {
  processWebhook,
  handlePaymentSuccess,
  handlePaymentFailed,
  handlePaymentRefunded
};
