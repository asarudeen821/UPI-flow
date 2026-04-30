/**
 * Multi-Gateway Engine
 * Razorpay, Cashfree, Stripe abstraction layer
 */

export const GATEWAYS = {
  RAZORPAY: 'razorpay',
  CASHFREE: 'cashfree',
  STRIPE: 'stripe',
}

const GATEWAY_CONFIG_KEY = 'gateway_config'

function getConfig() {
  try { return JSON.parse(localStorage.getItem(GATEWAY_CONFIG_KEY) || '{}') } catch { return {} }
}

export const GatewayService = {
  getActiveGateway() {
    return getConfig().active || GATEWAYS.RAZORPAY
  },

  setActiveGateway(gateway) {
    const config = getConfig()
    config.active = gateway
    localStorage.setItem(GATEWAY_CONFIG_KEY, JSON.stringify(config))
    return { success: true }
  },

  getGatewayConfig(gateway) {
    return getConfig()[gateway] || {}
  },

  saveGatewayConfig(gateway, cfg) {
    const config = getConfig()
    config[gateway] = { ...config[gateway], ...cfg }
    localStorage.setItem(GATEWAY_CONFIG_KEY, JSON.stringify(config))
    return { success: true }
  },

  getGatewayMeta() {
    return [
      {
        id: GATEWAYS.RAZORPAY,
        name: 'Razorpay',
        description: 'India\'s leading payment gateway',
        logo: '🟦',
        supported: ['UPI', 'Cards', 'Net Banking', 'Wallets'],
        fees: '2% per transaction',
        status: 'available',
      },
      {
        id: GATEWAYS.CASHFREE,
        name: 'Cashfree',
        description: 'Fast settlements, low fees',
        logo: '🟩',
        supported: ['UPI', 'Cards', 'Net Banking'],
        fees: '1.75% per transaction',
        status: 'available',
      },
      {
        id: GATEWAYS.STRIPE,
        name: 'Stripe',
        description: 'Global payments for international',
        logo: '🟪',
        supported: ['Cards', 'Wallets'],
        fees: '2.9% + ₹2 per transaction',
        status: 'coming_soon',
      },
    ]
  },

  /**
   * Route a payment through the active gateway
   * In production, replace with real SDK calls
   */
  async processPayment(transactionData) {
    const gateway = this.getActiveGateway()
    // Simulate gateway processing
    await new Promise((r) => setTimeout(r, 800))
    return {
      success: true,
      gateway,
      gateway_txn_id: `${gateway.toUpperCase()}_${Date.now()}`,
      data: { ...transactionData, status: 'success' },
    }
  },
}

export default GatewayService
