/**
 * Razorpay Gateway Adapter
 * Primary gateway for UPI, Cards, Wallets in India
 */

import crypto from 'crypto';
import axios from 'axios';
import { GatewayInterface } from './GatewayInterface.js';
import logger from '../utils/logger.js';

export class RazorpayAdapter extends GatewayInterface {
  constructor(config) {
    super(config);
    this.name = 'razorpay';
    this.baseUrl = 'https://api.razorpay.com/v1';
    this.auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64');
  }
  
  getSupportedMethods() {
    return ['upi', 'card', 'wallet', 'netbanking'];
  }
  
  /**
   * Create Razorpay Order
   */
  async createPayment(data) {
    try {
      const orderData = {
        amount: Math.round(data.amount * 100), // Convert to paise
        currency: data.currency || 'INR',
        receipt: data.orderId,
        notes: {
          publicKey: data.publicKey,
          paymentId: data.paymentId,
          productName: data.product?.name || ''
        }
      };
      
      const response = await axios.post(
        `${this.baseUrl}/orders`,
        orderData,
        {
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      logger.info(`Razorpay order created: ${response.data.id}`);
      
      return {
        success: true,
        data: {
          orderId: response.data.id,
          amount: response.data.amount / 100,
          currency: response.data.currency,
          keyId: this.config.keyId,
          prefilled: {
            name: data.customer?.name,
            email: data.customer?.email,
            contact: data.customer?.phone
          },
          notes: data.metadata
        }
      };
    } catch (error) {
      logger.error('Razorpay createPayment error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.description || 'Failed to create Razorpay order'
      };
    }
  }
  
  /**
   * Verify Razorpay Payment Signature
   */
  async verifyPayment(data) {
    try {
      const { orderId, paymentId, signature } = data;
      
      // Generate expected signature
      const body = orderId + '|' + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', this.config.keySecret)
        .update(body.toString())
        .digest('hex');
      
      const isValid = expectedSignature === signature;
      
      if (!isValid) {
        logger.warn('Razorpay signature verification failed');
        return {
          success: false,
          error: 'Invalid payment signature',
          verified: false
        };
      }
      
      // Fetch payment details from Razorpay
      const paymentResponse = await axios.get(
        `${this.baseUrl}/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Basic ${this.auth}`
          }
        }
      );
      
      const payment = paymentResponse.data;
      
      // Validate amount
      if (payment.amount !== Math.round(data.amount * 100)) {
        return {
          success: false,
          error: 'Amount mismatch',
          verified: false
        };
      }
      
      // Validate status
      if (payment.status !== 'captured') {
        return {
          success: false,
          error: `Payment status: ${payment.status}`,
          verified: false
        };
      }
      
      logger.info(`Razorpay payment verified: ${paymentId}`);
      
      return {
        success: true,
        verified: true,
        data: this.normalizeResponse(payment)
      };
    } catch (error) {
      logger.error('Razorpay verifyPayment error:', error.response?.data || error.message);
      return {
        success: false,
        error: 'Payment verification failed',
        verified: false
      };
    }
  }
  
  /**
   * Handle Razorpay Webhook
   */
  async handleWebhook(req) {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      
      // Verify webhook signature
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(body.toString())
        .digest('hex');
      
      if (signature !== expectedSignature) {
        logger.warn('Razorpay webhook signature verification failed');
        return {
          success: false,
          error: 'Invalid webhook signature',
          statusCode: 400
        };
      }
      
      const event = JSON.parse(body);
      const payload = event.payload;
      
      logger.info(`Razorpay webhook received: ${event.event}`);
      
      // Process different event types
      switch (event.event) {
        case 'payment.captured':
          return {
            success: true,
            event: 'payment.success',
            data: {
              paymentId: payload.payment.entity.id,
              orderId: payload.payment.entity.order_id,
              amount: payload.payment.entity.amount / 100,
              currency: payload.payment.entity.currency,
              status: 'success',
              method: payload.payment.entity.method,
              email: payload.payment.entity.email,
              contact: payload.payment.entity.contact,
              captured: true,
              timestamp: new Date(payload.payment.entity.created_at * 1000).toISOString()
            }
          };
          
        case 'payment.failed':
          return {
            success: true,
            event: 'payment.failed',
            data: {
              paymentId: payload.payment.entity.id,
              orderId: payload.payment.entity.order_id,
              status: 'failed',
              error: {
                code: payload.payment.entity.error?.code,
                description: payload.payment.entity.error?.description,
                source: payload.payment.entity.error?.source
              },
              timestamp: new Date(payload.payment.entity.created_at * 1000).toISOString()
            }
          };
          
        case 'order.paid':
          return {
            success: true,
            event: 'order.paid',
            data: {
              orderId: payload.order.entity.id,
              amount: payload.order.entity.amount / 100,
              status: 'paid',
              timestamp: new Date(payload.order.entity.created_at * 1000).toISOString()
            }
          };
          
        default:
          logger.info(`Unhandled Razorpay event: ${event.event}`);
          return {
            success: true,
            event: event.event,
            data: payload
          };
      }
    } catch (error) {
      logger.error('Razorpay webhook error:', error.message);
      return {
        success: false,
        error: 'Webhook processing failed',
        statusCode: 500
      };
    }
  }
  
  /**
   * Refund Payment
   */
  async refund(paymentId, amount) {
    try {
      const refundData = {
        payment_id: paymentId,
        amount: Math.round(amount * 100),
        speed: 'normal',
        notes: {
          reason: 'Refund requested'
        }
      };
      
      const response = await axios.post(
        `${this.baseUrl}/refunds`,
        refundData,
        {
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      logger.info(`Razorpay refund created: ${response.data.id}`);
      
      return {
        success: true,
        data: {
          refundId: response.data.id,
          amount: response.data.amount / 100,
          status: response.data.status
        }
      };
    } catch (error) {
      logger.error('Razorpay refund error:', error.response?.data || error.message);
      return {
        success: false,
        error: 'Refund failed'
      };
    }
  }
  
  /**
   * Get Payment Status
   */
  async getPaymentStatus(paymentId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Basic ${this.auth}`
          }
        }
      );
      
      return {
        success: true,
        data: this.normalizeResponse(response.data)
      };
    } catch (error) {
      logger.error('Razorpay getPaymentStatus error:', error.response?.data || error.message);
      return {
        success: false,
        error: 'Failed to get payment status'
      };
    }
  }
  
  /**
   * Normalize Razorpay Response
   */
  normalizeResponse(payment) {
    return {
      status: payment.status === 'captured' ? 'success' : payment.status === 'failed' ? 'failed' : 'pending',
      transactionId: payment.id,
      amount: payment.amount / 100,
      currency: payment.currency,
      gateway: 'razorpay',
      method: payment.method,
      email: payment.email,
      contact: payment.contact,
      captured: payment.captured || false,
      timestamp: new Date(payment.created_at * 1000).toISOString()
    };
  }
}

export default RazorpayAdapter;
