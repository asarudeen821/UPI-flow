/**
 * Payment Link Service - Connected to Backend MongoDB
 * Generates shareable payment links with expiry, tracking, and QR
 */

import { PaymentLinkService as BackendPaymentLinkService } from '../backend.js'

function formatDate(isoString) {
  if (!isoString) return { date: '', day: '', time: '' }
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return { date: '', day: '', time: '' }
  return {
    date: d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
    day: d.toLocaleDateString('en-IN', { weekday: 'long' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
  }
}

function generateSlug(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((b) => chars[b % chars.length])
    .join('')
}

export const PaymentLinkService = {
  async create({ amount, description, recipientName, upiId, expiresInHours = 24, maxUses = null, isPermanent = false }) {
    try {
      console.log('[PaymentLinkService] Creating link with params:', {
        amount,
        description,
        recipientName,
        upiId,
        expiresInHours,
        maxUses,
        isPermanent,
      })

      const result = await BackendPaymentLinkService.create({
        amount: amount ? parseFloat(amount) : null,
        description: description || '',
        recipientName: recipientName || '',
        upiId: upiId || '',
        expiresInHours: isPermanent ? null : expiresInHours,
        maxUses: isPermanent ? null : maxUses,
        isPermanent,
      })

      console.log('[PaymentLinkService] Backend create result:', result)

      if (result.success && result.data) {
        // Normalize backend response to match frontend expectations
        const link = {
          id: result.data.id,
          slug: result.data.slug,
          url: result.data.url,
          amount: result.data.amount,
          description: result.data.description,
          recipient_name: result.data.recipient_name,
          upi_id: result.data.upi_id,
          created_at: result.data.created_at,
          is_permanent: result.data.is_permanent,
          expires_at: result.data.expires_at,
          max_uses: result.data.max_uses,
          use_count: result.data.use_count || 0,
          is_active: result.data.is_active,
          status: result.data.status,
          formatted_date: result.data.formatted_date,
          formatted_day: result.data.formatted_day,
          formatted_time: result.data.formatted_time,
        }
        console.log('[PaymentLinkService] Normalized link:', link)
        console.log('[PaymentLinkService] URL:', link.url)
        return { success: true, data: link }
      }

      return result
    } catch (error) {
      console.error('[PaymentLinkService] Create error:', error)
      return { success: false, error: error.message || 'Failed to create payment link' }
    }
  },

  async list() {
    try {
      const result = await BackendPaymentLinkService.list()
      console.log('[PaymentLinkService] List result:', result)

      if (result.success && result.data) {
        // Backend now returns: { items: [...], total, page, limit }
        const linkData = result.data.items || result.data
        const links = linkData.map(link => {
          const normalized = {
            id: link.id,
            slug: link.slug,
            url: link.url,
            amount: link.amount,
            description: link.description,
            recipient_name: link.recipient_name,
            upi_id: link.upi_id,
            created_at: link.created_at,
            is_permanent: link.is_permanent || false,
            expires_at: link.expires_at || null,
            max_uses: link.max_uses || null,
            use_count: link.use_count || 0,
            is_active: link.is_active,
            status: link.status,
            formatted_date: link.formatted_date,
            formatted_day: link.formatted_day,
            formatted_time: link.formatted_time,
          }
          console.log('[PaymentLinkService] Normalized link item:', normalized)
          return normalized
        })
        return { success: true, data: links }
      }

      return result
    } catch (error) {
      console.error('[PaymentLinkService] List error:', error)
      return { success: false, error: error.message || 'Failed to fetch payment links', data: [] }
    }
  },

  async getBySlug(slug) {
    try {
      const result = await BackendPaymentLinkService.getBySlug(slug)
      
      if (result.success && result.data) {
        const link = {
          id: result.data.id,
          slug: result.data.slug,
          url: result.data.url,
          amount: result.data.amount,
          description: result.data.description,
          recipient_name: result.data.recipientName,
          upi_id: result.data.upiId,
          created_at: result.data.createdAt,
          is_permanent: result.data.isPermanent || false,
          expires_at: result.data.expiresAt || null,
          max_uses: result.data.maxUses || null,
          use_count: result.data.clicks || 0,
          is_active: result.data.status === 'active',
        }
        
        // Check expiration for non-permanent links
        if (!link.is_permanent && link.expires_at && new Date(link.expires_at) < new Date()) {
          return { success: false, error: 'Payment link has expired' }
        }
        
        if (!link.is_active) {
          return { success: false, error: 'Payment link is inactive' }
        }
        
        if (!link.is_permanent && link.max_uses && link.use_count >= link.max_uses) {
          return { success: false, error: 'Payment link has reached maximum uses' }
        }
        
        return { success: true, data: link }
      }
      
      return { success: false, error: result.error || 'Payment link not found' }
    } catch (error) {
      console.error('[PaymentLinkService] GetBySlug error:', error)
      return { success: false, error: error.message || 'Failed to fetch payment link' }
    }
  },

  async recordUse(slug) {
    try {
      return await BackendPaymentLinkService.recordUse(slug)
    } catch (error) {
      console.error('[PaymentLinkService] RecordUse error:', error)
      return { success: false, error: error.message }
    }
  },

  async deactivate(id) {
    try {
      return await BackendPaymentLinkService.deactivate(id)
    } catch (error) {
      console.error('[PaymentLinkService] Deactivate error:', error)
      return { success: false, error: error.message || 'Failed to deactivate link' }
    }
  },

  async delete(id) {
    try {
      return await BackendPaymentLinkService.delete(id)
    } catch (error) {
      console.error('[PaymentLinkService] Delete error:', error)
      return { success: false, error: error.message || 'Failed to delete payment link' }
    }
  },
}

export default PaymentLinkService
