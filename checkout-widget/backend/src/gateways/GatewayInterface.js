/**
 * Gateway Interface - Base Class
 * All payment gateways must implement this interface
 */

export class GatewayInterface {
  constructor(config) {
    if (new.target === GatewayInterface) {
      throw new Error('GatewayInterface is abstract and cannot be instantiated directly');
    }
    this.config = config;
    this.name = 'base';
  }
  
  /**
   * Create a payment order/session
   * @param {Object} data - Payment data
   * @returns {Promise<Object>} - Gateway order response
   */
  async createPayment(data) {
    throw new Error('Method "createPayment" must be implemented');
  }
  
  /**
   * Verify payment signature/response
   * @param {Object} data - Payment verification data
   * @returns {Promise<Object>} - Verification result
   */
  async verifyPayment(data) {
    throw new Error('Method "verifyPayment" must be implemented');
  }
  
  /**
   * Handle webhook event
   * @param {Object} req - Express request object
   * @returns {Promise<Object>} - Webhook processing result
   */
  async handleWebhook(req) {
    throw new Error('Method "handleWebhook" must be implemented');
  }
  
  /**
   * Refund a payment
   * @param {string} paymentId - Gateway payment ID
   * @param {number} amount - Refund amount
   * @returns {Promise<Object>} - Refund result
   */
  async refund(paymentId, amount) {
    throw new Error('Method "refund" must be implemented');
  }
  
  /**
   * Get payment status
   * @param {string} paymentId - Gateway payment ID
   * @returns {Promise<Object>} - Payment status
   */
  async getPaymentStatus(paymentId) {
    throw new Error('Method "getPaymentStatus" must be implemented');
  }
  
  /**
   * Normalize gateway response to common format
   * @param {Object} response - Gateway response
   * @returns {Object} - Normalized response
   */
  normalizeResponse(response) {
    throw new Error('Method "normalizeResponse" must be implemented');
  }
  
  /**
   * Get supported payment methods
   * @returns {Array<string>} - List of supported methods
   */
  getSupportedMethods() {
    return [];
  }
}

export default GatewayInterface;
