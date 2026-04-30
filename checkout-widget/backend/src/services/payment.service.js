/**
 * Payment Service
 * Core payment orchestration logic
 */

import GatewayFactory from '../gateways/GatewayFactory.js';
import PaymentModel from '../models/Payment.js';
import { getCollection } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Create a new payment
 */
export async function createPayment(data) {
  try {
    const { publicKey, gateway = 'razorpay', ...paymentData } = data;
    
    // Get gateway config
    const configCollection = getCollection('configs');
    const config = await configCollection.findOne({ publicKey, active: true });
    
    if (!config) {
      return {
        success: false,
        error: 'Invalid or inactive public key'
      };
    }
    
    // Get gateway adapter
    const adapter = GatewayFactory.getAdapter(gateway, config.gatewayConfig);
    
    // Create payment record in DB
    const payment = await PaymentModel.create({
      ...paymentData,
      publicKey,
      gateway
    });
    
    // Create order with gateway
    const gatewayResult = await adapter.createPayment({
      ...paymentData,
      paymentId: payment.paymentId,
      orderId: payment.orderId
    });
    
    if (!gatewayResult.success) {
      // Update payment status to failed
      await PaymentModel.updateStatus(payment.paymentId, 'failed', {
        gatewayError: gatewayResult.error
      });
      
      return gatewayResult;
    }
    
    // Update payment with gateway order ID
    await PaymentModel.updateStatus(payment.paymentId, 'pending', {
      gatewayOrderId: gatewayResult.data.orderId || gatewayResult.data.paymentIntentId
    });
    
    logger.info(`Payment created: ${payment.paymentId}`);
    
    return {
      success: true,
      data: {
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        ...gatewayResult.data
      }
    };
  } catch (error) {
    logger.error('Create payment error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create payment'
    };
  }
}

/**
 * Verify payment
 */
export async function verifyPayment(data) {
  try {
    const { gateway, ...verificationData } = data;
    
    // Get payment from DB
    const payment = await PaymentModel.findByPaymentId(verificationData.paymentId);
    
    if (!payment) {
      return {
        success: false,
        error: 'Payment not found'
      };
    }
    
    // Get gateway config
    const configCollection = getCollection('configs');
    const config = await configCollection.findOne({ publicKey: payment.publicKey, active: true });
    
    if (!config) {
      return {
        success: false,
        error: 'Gateway configuration not found'
      };
    }
    
    // Get gateway adapter
    const adapter = GatewayFactory.getAdapter(gateway, config.gatewayConfig);
    
    // Verify with gateway
    const result = await adapter.verifyPayment({
      ...verificationData,
      amount: payment.amount
    });
    
    if (result.success && result.verified) {
      // Mark payment as verified in DB
      await PaymentModel.markVerified(payment.paymentId, result.data);
      await PaymentModel.updateStatus(payment.paymentId, 'success');
    }
    
    return result;
  } catch (error) {
    logger.error('Verify payment error:', error);
    return {
      success: false,
      error: error.message || 'Payment verification failed',
      verified: false
    };
  }
}

/**
 * Get payment status
 */
export async function getPaymentStatus(paymentId) {
  try {
    const payment = await PaymentModel.findByPaymentId(paymentId);
    
    if (!payment) {
      return {
        success: false,
        error: 'Payment not found'
      };
    }
    
    return {
      success: true,
      data: {
        paymentId: payment.paymentId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        gateway: payment.gateway,
        verified: payment.verified,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
      }
    };
  } catch (error) {
    logger.error('Get payment status error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get available payment methods
 */
export async function getPaymentMethods() {
  try {
    const configCollection = getCollection('configs');
    const configs = await configCollection.find({ active: true }).toArray();
    
    const methods = new Set();
    
    for (const config of configs) {
      try {
        const adapter = GatewayFactory.getAdapter(config.gateway, config.gatewayConfig);
        const supportedMethods = adapter.getSupportedMethods();
        supportedMethods.forEach(m => methods.add(m));
      } catch (error) {
        logger.warn(`Failed to get methods for ${config.gateway}:`, error.message);
      }
    }
    
    return {
      success: true,
      data: {
        methods: Array.from(methods),
        gateways: configs.map(c => c.gateway)
      }
    };
  } catch (error) {
    logger.error('Get payment methods error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  createPayment,
  verifyPayment,
  getPaymentStatus,
  getPaymentMethods
};
