/**
 * Refund Service
 * Handle payment refunds across all gateways
 */

import GatewayFactory from '../gateways/GatewayFactory.js';
import PaymentModel from '../models/Payment.js';
import { getCollection } from '../config/database.js';
import logger from '../utils/logger.js';

export const REFUND_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed'
};

/**
 * Create a refund
 */
export async function createRefund(data) {
  try {
    const { paymentId, amount, reason, publicKey } = data;
    
    // Get payment from DB
    const payment = await PaymentModel.findByPaymentId(paymentId);
    
    if (!payment) {
      return {
        success: false,
        error: 'Payment not found'
      };
    }
    
    // Verify payment belongs to this publicKey
    if (payment.publicKey !== publicKey) {
      return {
        success: false,
        error: 'Unauthorized'
      };
    }
    
    // Check if payment is successful
    if (payment.status !== 'success') {
      return {
        success: false,
        error: 'Can only refund successful payments'
      };
    }
    
    // Check if already refunded
    if (payment.status === 'refunded') {
      return {
        success: false,
        error: 'Payment already refunded'
      };
    }
    
    // Validate refund amount
    const refundAmount = amount || payment.amount;
    if (refundAmount > payment.amount) {
      return {
        success: false,
        error: 'Refund amount cannot exceed payment amount'
      };
    }
    
    // Get gateway config
    const configCollection = getCollection('configs');
    const config = await configCollection.findOne({ publicKey, active: true });
    
    if (!config) {
      return {
        success: false,
        error: 'Gateway configuration not found'
      };
    }
    
    // Get gateway adapter
    const adapter = GatewayFactory.getAdapter(payment.gateway, config.gatewayConfig);
    
    // Process refund through gateway
    const refundResult = await adapter.refund(payment.gatewayPaymentId, refundAmount);
    
    if (!refundResult.success) {
      return refundResult;
    }
    
    // Create refund record in DB
    const refunds = getCollection('refunds');
    const refund = {
      refundId: refundResult.data.refundId || `ref_${Date.now()}`,
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      publicKey,
      amount: refundAmount,
      originalAmount: payment.amount,
      currency: payment.currency,
      gateway: payment.gateway,
      gatewayRefundId: refundResult.data.refundId,
      status: REFUND_STATUS.SUCCESS,
      reason: reason || 'Customer requested refund',
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString()
    };
    
    await refunds.insertOne(refund);
    
    // Update payment status
    if (refundAmount === payment.amount) {
      await PaymentModel.updateStatus(payment.paymentId, 'refunded', {
        refundId: refund.refundId,
        refundAmount
      });
    }
    
    logger.info(`Refund created: ${refund.refundId} for payment: ${payment.paymentId}`);
    
    return {
      success: true,
      data: refund
    };
  } catch (error) {
    logger.error('Create refund error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create refund'
    };
  }
}

/**
 * Get refund by ID
 */
export async function getRefund(refundId) {
  try {
    const refunds = getCollection('refunds');
    const refund = await refunds.findOne({ refundId });
    
    if (!refund) {
      return {
        success: false,
        error: 'Refund not found'
      };
    }
    
    return {
      success: true,
      data: refund
    };
  } catch (error) {
    logger.error('Get refund error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get refunds for a payment
 */
export async function getPaymentRefunds(paymentId) {
  try {
    const refunds = getCollection('refunds');
    const paymentRefunds = await refunds.find({ paymentId }).toArray();
    
    return {
      success: true,
      data: paymentRefunds
    };
  } catch (error) {
    logger.error('Get payment refunds error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get refund statistics
 */
export async function getRefundStats(publicKey, days = 30) {
  try {
    const refunds = getCollection('refunds');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const stats = await refunds.aggregate([
      {
        $match: {
          publicKey,
          createdAt: { $gte: startDate.toISOString() }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]).toArray();
    
    return {
      success: true,
      data: {
        total: {
          count: stats.reduce((sum, s) => sum + s.count, 0),
          amount: stats.reduce((sum, s) => sum + s.totalAmount, 0)
        },
        byStatus: stats.reduce((acc, s) => {
          acc[s._id] = { count: s.count, amount: s.totalAmount };
          return acc;
        }, {})
      }
    };
  } catch (error) {
    logger.error('Get refund stats error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  createRefund,
  getRefund,
  getPaymentRefunds,
  getRefundStats
};
