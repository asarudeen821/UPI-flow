/**
 * Gateway Factory
 * Creates appropriate gateway adapter based on configuration
 */

import { RazorpayAdapter } from './RazorpayAdapter.js';
import { StripeAdapter } from './StripeAdapter.js';
import { PayPalAdapter } from './PayPalAdapter.js';
import logger from '../utils/logger.js';

export class GatewayFactory {
  static adapters = new Map();
  
  /**
   * Get or create gateway adapter
   * @param {string} gatewayName - Gateway name (razorpay, stripe, paypal)
   * @param {Object} config - Gateway configuration
   * @returns {GatewayInterface} - Gateway adapter instance
   */
  static getAdapter(gatewayName, config) {
    const cacheKey = `${gatewayName}_${config.keyId || config.clientId || config.secretKey?.substr(0, 8)}`;
    
    // Return cached adapter if available
    if (this.adapters.has(cacheKey)) {
      return this.adapters.get(cacheKey);
    }
    
    let adapter;
    
    switch (gatewayName.toLowerCase()) {
      case 'razorpay':
        adapter = new RazorpayAdapter({
          keyId: config.RAZORPAY_KEY_ID,
          keySecret: config.RAZORPAY_KEY_SECRET,
          webhookSecret: config.RAZORPAY_WEBHOOK_SECRET
        });
        break;
        
      case 'stripe':
        adapter = new StripeAdapter({
          secretKey: config.STRIPE_SECRET_KEY,
          publishableKey: config.STRIPE_PUBLISHABLE_KEY,
          webhookSecret: config.STRIPE_WEBHOOK_SECRET
        });
        break;
        
      case 'paypal':
        adapter = new PayPalAdapter({
          PAYPAL_CLIENT_ID: config.PAYPAL_CLIENT_ID,
          PAYPAL_CLIENT_SECRET: config.PAYPAL_CLIENT_SECRET,
          PAYPAL_MODE: config.PAYPAL_MODE || 'sandbox',
          webhookId: config.PAYPAL_WEBHOOK_ID
        });
        break;
        
      default:
        throw new Error(`Unknown gateway: ${gatewayName}`);
    }
    
    // Cache the adapter
    this.adapters.set(cacheKey, adapter);
    logger.info(`Gateway adapter created: ${gatewayName}`);
    
    return adapter;
  }
  
  /**
   * Get all available gateways
   * @returns {Array<string>} - List of gateway names
   */
  static getAvailableGateways() {
    return ['razorpay', 'stripe', 'paypal'];
  }
  
  /**
   * Clear adapter cache (useful for testing)
   */
  static clearCache() {
    this.adapters.clear();
  }
}

export default GatewayFactory;
