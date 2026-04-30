import { request } from './apiClient'

export const paymentAPI = {
  async createPaymentSession(payload) {
    try {
      const headers = {}
      if (payload.idempotencyKey) {
        headers['Idempotency-Key'] = payload.idempotencyKey
      }
      
      return await request('/api/payments/create', {
        method: 'POST',
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        body: JSON.stringify({
          amount: payload.amount,
          currency: payload.currency || 'INR',
          userId: payload.userId || 'demo-user',
          recipientName: payload.recipientName,
          upiId: payload.upiId,
          note: payload.note || '',
        }),
      })
    } catch (error) {
      console.error('Failed to create payment session:', error)
      return {
        success: false,
        error: error.message || 'Unable to create payment session'
      }
    }
  },

  async confirmPayment(orderId, paymentId) {
    try {
      return await request(`/api/payments/${orderId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ paymentId }),
      })
    } catch (error) {
      console.error('Failed to confirm payment:', error)
      return {
        success: false,
        error: error.message || 'Unable to confirm payment'
      }
    }
  },

  async getPaymentStatus(orderId) {
    try {
      return await request(`/api/payments/${orderId}/status`)
    } catch (error) {
      console.error('Failed to get payment status:', error)
      return {
        success: false,
        error: error.message || 'Unable to get payment status'
      }
    }
  },
}
