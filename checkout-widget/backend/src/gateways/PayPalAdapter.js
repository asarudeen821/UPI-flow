/**
 * PayPal Gateway Adapter
 * International payments via PayPal
 */

import crypto from 'crypto';
import axios from 'axios';
import { GatewayInterface } from './GatewayInterface.js';
import logger from '../utils/logger.js';

export class PayPalAdapter extends GatewayInterface {
  constructor(config) {
    super(config);
    this.name = 'paypal';
    this.baseUrl = config.PAYPAL_MODE === 'live' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';
    this.clientId = config.PAYPAL_CLIENT_ID;
    this.clientSecret = config.PAYPAL_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }
  
  getSupportedMethods() {
    return ['paypal', 'card', 'venmo'];
  }
  
  /**
   * Get OAuth 2.0 Access Token
   */
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }
    
    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        `${this.baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000);
      
      return this.accessToken;
    } catch (error) {
      logger.error('PayPal getAccessToken error:', error.response?.data || error.message);
      throw new Error('Failed to get PayPal access token');
    }
  }
  
  /**
   * Create PayPal Order
   */
  async createPayment(data) {
    try {
      const token = await this.getAccessToken();
      
      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: data.orderId,
          amount: {
            currency_code: data.currency || 'USD',
            value: data.amount.toFixed(2)
          },
          description: data.product?.description || '',
          custom_id: JSON.stringify({
            publicKey: data.publicKey,
            paymentId: data.paymentId,
            productName: data.product?.name || ''
          })
        }],
        application_context: {
          brand_name: data.product?.name || 'Merchant',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          return_url: `${process.env.FRONTEND_URL}/payment/success`,
          cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
        }
      };
      
      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders`,
        orderData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      logger.info(`PayPal order created: ${response.data.id}`);
      
      return {
        success: true,
        data: {
          orderId: response.data.id,
          amount: data.amount,
          currency: data.currency || 'USD',
          approvalUrl: response.data.links.find(l => l.rel === 'approve')?.href,
          actions: response.data.links.find(l => l.rel === 'self')?.href
        }
      };
    } catch (error) {
      logger.error('PayPal createPayment error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create PayPal order'
      };
    }
  }
  
  /**
   * Verify PayPal Payment
   */
  async verifyPayment(data) {
    try {
      const token = await this.getAccessToken();
      const { orderId } = data;
      
      const response = await axios.get(
        `${this.baseUrl}/v2/checkout/orders/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      const order = response.data;
      
      if (order.status !== 'COMPLETED') {
        return {
          success: false,
          error: `Payment status: ${order.status}`,
          verified: false
        };
      }
      
      logger.info(`PayPal payment verified: ${orderId}`);
      
      return {
        success: true,
        verified: true,
        data: this.normalizeResponse(order)
      };
    } catch (error) {
      logger.error('PayPal verifyPayment error:', error.response?.data || error.message);
      return {
        success: false,
        error: 'Payment verification failed',
        verified: false
      };
    }
  }
  
  /**
   * Handle PayPal Webhook
   */
  async handleWebhook(req) {
    try {
      const transmissionId = req.headers['paypal-transmission-id'];
      const transmissionTime = req.headers['paypal-transmission-time'];
      const certUrl = req.headers['paypal-cert-url'];
      const actualSignature = req.headers['paypal-transmission-sig'];
      const webhookId = this.config.webhookId;
      
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      
      // Verify webhook signature
      const verificationData = `${transmissionId}|${transmissionTime}|${webhookId}|${crypto.createHash('sha256').update(body).digest('hex')}`;
      
      // Download certificate and verify (simplified - in production, fetch and verify cert)
      const cryptoInterface = crypto.createVerify('SHA256withRSA');
      cryptoInterface.update(verificationData);
      cryptoInterface.end();
      
      // For production: verify with PayPal's verify webhook signature API
      const token = await this.getAccessToken();
      const verificationResponse = await axios.post(
        `${this.baseUrl}/v1/notifications/verify-webhook-signature`,
        {
          auth_algo: 'SHA256withRSA',
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: actualSignature,
          transmission_time: transmissionTime,
          webhook_id: webhookId,
          webhook_event: JSON.parse(body)
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (verificationResponse.data.verification_status !== 'SUCCESS') {
        logger.warn('PayPal webhook signature verification failed');
        return {
          success: false,
          error: 'Invalid webhook signature',
          statusCode: 400
        };
      }
      
      const event = JSON.parse(body);
      logger.info(`PayPal webhook received: ${event.event_type}`);
      
      // Process different event types
      switch (event.event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          return {
            success: true,
            event: 'payment.success',
            data: {
              paymentId: event.resource.id,
              orderId: event.resource.custom_id ? JSON.parse(event.resource.custom_id).paymentId : null,
              amount: parseFloat(event.resource.amount.value),
              currency: event.resource.amount.currency,
              status: 'success',
              method: 'paypal',
              email: event.resource.payer?.email_address,
              captured: true,
              timestamp: event.resource.update_time
            }
          };
          
        case 'PAYMENT.CAPTURE.DENIED':
        case 'PAYMENT.CAPTURE.FAILED':
          return {
            success: true,
            event: 'payment.failed',
            data: {
              paymentId: event.resource.id,
              status: 'failed',
              error: {
                description: event.resource.status_details?.reason
              },
              timestamp: event.resource.update_time
            }
          };
          
        case 'CHECKOUT.ORDER.APPROVED':
          return {
            success: true,
            event: 'order.approved',
            data: {
              orderId: event.resource.id,
              status: 'approved',
              timestamp: event.resource.update_time
            }
          };
          
        default:
          logger.info(`Unhandled PayPal event: ${event.event_type}`);
          return {
            success: true,
            event: event.event_type,
            data: event.resource
          };
      }
    } catch (error) {
      logger.error('PayPal webhook error:', error.response?.data || error.message);
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
      const token = await this.getAccessToken();
      
      const refundData = {
        amount: {
          value: amount.toFixed(2),
          currency_code: 'USD'
        }
      };
      
      const response = await axios.post(
        `${this.baseUrl}/v2/payments/captures/${paymentId}/refund`,
        refundData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      logger.info(`PayPal refund created: ${response.data.id}`);
      
      return {
        success: true,
        data: {
          refundId: response.data.id,
          amount: parseFloat(response.data.amount.value),
          status: response.data.status
        }
      };
    } catch (error) {
      logger.error('PayPal refund error:', error.response?.data || error.message);
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
      const token = await this.getAccessToken();
      
      const response = await axios.get(
        `${this.baseUrl}/v2/checkout/orders/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      return {
        success: true,
        data: this.normalizeResponse(response.data)
      };
    } catch (error) {
      logger.error('PayPal getPaymentStatus error:', error.response?.data || error.message);
      return {
        success: false,
        error: 'Failed to get payment status'
      };
    }
  }
  
  /**
   * Normalize PayPal Response
   */
  normalizeResponse(order) {
    return {
      status: order.status === 'COMPLETED' ? 'success' : order.status === 'FAILED' ? 'failed' : 'pending',
      transactionId: order.id,
      amount: parseFloat(order.purchase_units?.[0]?.amount?.value) || 0,
      currency: order.purchase_units?.[0]?.amount?.currency_code || 'USD',
      gateway: 'paypal',
      method: 'paypal',
      email: order.payer?.email_address,
      captured: order.status === 'COMPLETED',
      timestamp: order.update_time || order.create_time
    };
  }
}

export default PayPalAdapter;
