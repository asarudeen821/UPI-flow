/**
 * Payment Model
 * Core payment schema with gateway abstraction
 */

import { getCollection } from '../config/database.js';

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled'
};

export const PAYMENT_METHODS = {
  UPI: 'upi',
  CARD: 'card',
  WALLET: 'wallet',
  NETBANKING: 'netbanking',
  PAYPAL: 'paypal'
};

export class PaymentModel {
  static async create(paymentData) {
    const payments = getCollection('payments');
    
    const payment = {
      paymentId: paymentData.paymentId || `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId: paymentData.orderId,
      publicKey: paymentData.publicKey,
      amount: paymentData.amount,
      currency: paymentData.currency || 'INR',
      status: PAYMENT_STATUS.PENDING,
      gateway: paymentData.gateway,
      gatewayPaymentId: null,
      gatewayOrderId: null,
      paymentMethod: null,
      customer: {
        name: paymentData.customer?.name || '',
        email: paymentData.customer?.email || '',
        phone: paymentData.customer?.phone || ''
      },
      product: {
        name: paymentData.product?.name || '',
        description: paymentData.product?.description || ''
      },
      metadata: paymentData.metadata || {},
      verified: false,
      verificationData: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const result = await payments.insertOne(payment);
    return { ...payment, _id: result.insertedId };
  }
  
  static async findByPaymentId(paymentId) {
    const payments = getCollection('payments');
    return await payments.findOne({ paymentId });
  }
  
  static async findByOrderId(orderId) {
    const payments = getCollection('payments');
    return await payments.findOne({ orderId });
  }
  
  static async updateStatus(paymentId, status, additionalData = {}) {
    const payments = getCollection('payments');
    
    const updateData = {
      status,
      updatedAt: new Date().toISOString(),
      ...additionalData
    };
    
    await payments.updateOne(
      { paymentId },
      { $set: updateData }
    );
    
    return await this.findByPaymentId(paymentId);
  }
  
  static async markVerified(paymentId, verificationData) {
    const payments = getCollection('payments');
    
    await payments.updateOne(
      { paymentId },
      {
        $set: {
          verified: true,
          verificationData,
          updatedAt: new Date().toISOString()
        }
      }
    );
    
    return await this.findByPaymentId(paymentId);
  }
  
  static async getStats(publicKey, days = 7) {
    const payments = getCollection('payments');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const pipeline = [
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
    ];
    
    return await payments.aggregate(pipeline).toArray();
  }
  
  static async getRecentPayments(publicKey, limit = 10) {
    const payments = getCollection('payments');
    
    return await payments.find({ publicKey })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }
}

export default PaymentModel;
