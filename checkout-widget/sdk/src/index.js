/**
 * Checkout Widget SDK
 * Embeddable payment checkout widget
 * 
 * Usage:
 * <script src="https://cdn.yourdomain.com/checkout.js"></script>
 * <div id="checkout-widget"></div>
 * <script>
 *   Checkout.init({
 *     publicKey: 'pk_test_xxx',
 *     amount: 499,
 *     currency: 'INR',
 *     productName: 'Premium Plan'
 *   });
 * </script>
 */

import './styles/checkout.css';
import CheckoutWidget from './Checkout.js';

class CheckoutSDK {
  constructor() {
    this.instance = null;
    this.defaultConfig = {
      apiUrl: 'http://localhost:3001/api',
      socketUrl: 'http://localhost:3001',
      theme: 'light',
      language: 'en'
    };
  }
  
  /**
   * Initialize checkout widget
   * @param {Object} config - Configuration object
   */
  init(config) {
    if (!config.publicKey) {
      console.error('Checkout: publicKey is required');
      return;
    }
    
    if (!config.amount || config.amount <= 0) {
      console.error('Checkout: amount must be greater than 0');
      return;
    }
    
    const mergedConfig = {
      ...this.defaultConfig,
      ...config
    };
    
    // Find container
    const container = document.getElementById('checkout-widget');
    if (!container) {
      console.error('Checkout: Container element #checkout-widget not found');
      return;
    }
    
    // Clear existing instance
    container.innerHTML = '';
    
    // Create new instance
    this.instance = new CheckoutWidget(container, mergedConfig);
    this.instance.render();
    
    console.log('Checkout: Widget initialized successfully');
  }
  
  /**
   * Open checkout modal
   */
  open() {
    if (this.instance) {
      this.instance.open();
    } else {
      console.error('Checkout: Widget not initialized. Call Checkout.init() first.');
    }
  }
  
  /**
   * Close checkout modal
   */
  close() {
    if (this.instance) {
      this.instance.close();
    }
  }
  
  /**
   * Update checkout options
   * @param {Object} config - New configuration
   */
  update(config) {
    if (this.instance) {
      this.instance.updateConfig(config);
    }
  }
  
  /**
   * Destroy widget
   */
  destroy() {
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
    }
  }
  
  /**
   * Set event handlers
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (this.instance) {
      this.instance.on(event, callback);
    }
  }
}

// Export singleton instance
const Checkout = new CheckoutSDK();

export default Checkout;
