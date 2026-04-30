/**
 * Stripe Gateway Adapter
 * International payments, cards, and digital wallets
 */

import crypto from 'crypto';
import axios from 'axios';
import { GatewayInterface } from './GatewayInterface.js';
import logger from '../utils/logger.js';

export class StripeAdapter extends GatewayInterface {
  constructor(config) {
    super(config);
    this.name = 'stripe';
    this.baseUrl = 'https://api.stripe.com/v1';
    this.auth = config.secretKey;
  }
  
  getSupportedMethods() {
    return ['card', 'wallet', 'alipay', 'wechat'];
  }
  
  /**
   * Create Stripe Payment Intent
   */
  async createPayment(data) {
    try {
      const paymentIntentData = new URLSearchParams({
        amount: Math.round(data.amount * 100), // Convert to cents
        currency: (data.currency || 'USD').toLowerCase(),
        payment_intent_data: JSON.stringify({
          description: data.product?.description || '',
          metadata: {
            publicKey: data.publicKey,
            paymentId: data.paymentId,
            orderId: data.orderId,
            productName: data.product?.name || ''
          }
        }),
        automatic_payment_methods: JSON.stringify({ enabled: true })
      });
      
      if (data.customer?.email) {
        paymentIntentData.append('receipt_email', data.customer.email);
      }
      
      const response = await axios.post(
        `${this.baseUrl}/payment_intents`,
        paymentIntentData,
        {
          headers: {
            'Authorization': `Bearer ${this.auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      logger.info(`Stripe PaymentIntent created: ${response.data.id}`);
      
      return {
        success: true,
        data: {
          paymentIntentId: response.data.id,
          clientSecret: response.data.client_secret,
          amount: response.data.amount / 100,
          currency: response.data.currency,
          publishableKey: this.config.publishableKey,
          paymentMethods: response.data.payment_method_types
        }
      };
    } catch (error) {
      logger.error('Stripe createPayment error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to create Stripe payment'
      };
    }
  }
  
  /**
   * Verify Stripe Payment
   */
  async verifyPayment(data) {
    try {
      const { paymentIntentId } = data;
      
      const response = await axios.get(
        `${this.baseUrl}/payment_intents/${paymentIntentId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.auth}`
          }
        }
      );
      
      const paymentIntent = response.data;
      
      if (paymentIntent.status !== 'succeeded') {
        return {
          success: false,
          error: `Payment status: ${paymentIntent.status}`,
          verified: false
        };
      }
      
      logger.info(`Stripe payment verified: ${paymentIntentId}`);
      
      return {
        success: true,
        verified: true,
        data: this.normalizeResponse(paymentIntent)
      };
    } catch (error) {
      logger.error('Stripe verifyPayment error:', error.response?.data || error.message);
      return {
        success: false,
        error: 'Payment verification failed',
        verified: false
      };
    }
  }
  
  /**
   * Handle Stripe Webhook
   */
  async handleWebhook(req) {
    try {
      const signature = req.headers['stripe-signature'];
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      
      // Verify webhook signature
      const parts = signature.split(',');
      let timestamp = '';
      let signatureValue = '';
      
      for (const part of parts) {
        const [key, value] = part.split('=');
        if (key === 't') timestamp = value;
        if (key === 'v1') signatureValue = value;
      }
      
      const signedPayload = `${timestamp}.${body}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(signedPayload)
        .digest('hex');
      
      if (signatureValue !== expectedSignature) {
        logger.warn('Stripe webhook signature verification failed');
        return {
          success: false,
          error: 'Invalid webhook signature',
          statusCode: 400
        };
      }
      
      // Check timestamp tolerance (5 minutes)
      const eventTime = new Date(timestamp * 1000);
      const now = new Date();
      if (Math.abs(now - eventTime) > 5 * 60 * 1000) {
        logger.warn('Stripe webhook timestamp outside tolerance');
        return {
          success: false,
          error: 'Webhook timestamp too old',
          statusCode: 400
        };
      }
      
      const event = JSON.parse(body);
      logger.info(`Stripe webhook received: ${event.type}`);
      
      // Process different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          return {
            success: true,
            event: 'payment.success',
            data: {
              paymentId: paymentIntent.id,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              status: 'success',
              method: paymentIntent.payment_method_types?.[0] || 'card',
              email: paymentIntent.receipt_email,
              captured: true,
              timestamp: new Date(paymentIntent.created * 1000).toISOString()
            }
          };
          
        case 'payment_intent.payment_failed':
          const failedIntent = event.data.object;
          return {
            success: true,
            event: 'payment.failed',
            data: {
              paymentId: failedIntent.id,
              status: 'failed',
              error: {
                code: failedIntent.last_payment_error?.code,
                description: failedIntent.last_payment_error?.message
              },
              timestamp: new Date(failedIntent.created * 1000).toISOString()
            }
          };
          
        case 'charge.refunded':
          const charge = event.data.object;
          return {
            success: true,
            event: 'payment.refunded',
            data: {
              paymentId: charge.payment_intent,
              amount: charge.amount_refunded / 100,
              status: 'refunded',
              timestamp: new Date(charge.created * 1000).toISOString()
            }
          };
          
        default:
          logger.info(`Unhandled Stripe event: ${event.type}`);
          return {
            success: true,
            event: event.type,
            data: event.data.object
          };
      }
    } catch (error) {
      logger.error('Stripe webhook error:', error.message);
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
      const refundData = new URLSearchParams({
        payment_intent: paymentId,
        amount: Math.round(amount * 100),
        reason: 'requested_by_customer'
      });
      
      const response = await axios.post(
        `${this.baseUrl}/refunds`,
        refundData,
        {
          headers: {
            'Authorization': `Bearer ${this.auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      logger.info(`Stripe refund created: ${response.data.id}`);
      
      return {
        success: true,
        data: {
          refundId: response.data.id,
          amount: response.data.amount / 100,
          status: response.data.status
        }
      };
    } catch (error) {
      logger.error('Stripe refund error:', error.response?.data || error.message);
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
        `${this.baseUrl}/payment_intents/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.auth}`
          }
        }
      );
      
      return {
        success: true,
        data: this.normalizeResponse(response.data)
      };
    } catch (error) {
      logger.error('Stripe getPaymentStatus error:', error.response?.data || error.message);
      return {
        success: false,
        error: 'Failed to get payment status'
      };
    }
  }
  
  /**
   * Normalize Stripe Response
   */
  normalizeResponse(paymentIntent) {
    return {
      status: paymentIntent.status === 'succeeded' ? 'success' : paymentIntent.status === 'requires_payment_method' ? 'failed' : 'pending',
      transactionId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      gateway: 'stripe',
      method: paymentIntent.payment_method_types?.[0] || 'card',
      email: paymentIntent.receipt_email,
      captured: paymentIntent.status === 'succeeded',
      timestamp: new Date(paymentIntent.created * 1000).toISOString()
    };
  }
}

export default StripeAdapter;
