/**
 * QR Code Service - Connected to Backend MongoDB
 * Dynamic QR generation with expiry, metadata, and tracking
 */

import { QRService as BackendQRService } from '../backend.js'

/**
 * Generates a UPI deep-link string for QR encoding
 */
export function buildUPIString({ upiId, name, amount, note, transactionRef }) {
  const params = new URLSearchParams()
  params.set('pa', upiId)
  if (name) params.set('pn', name)
  if (amount) params.set('am', String(amount))
  if (note) params.set('tn', note)
  if (transactionRef) params.set('tr', transactionRef)
  params.set('cu', 'INR')
  return `upi://pay?${params.toString()}`
}

/**
 * Generates a QR code data URL using the QR Server API (no npm needed)
 */
export function getQRImageUrl(data, size = 200) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=png&margin=10`
}

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

export const QRService = {
  async create({ upiId, recipientName, amount, note, expiresInHours = 24, orderId = null, isPermanent = false }) {
    try {
      console.log('[QRService] Creating QR with params:', { upiId, recipientName, amount, expiresInHours, isPermanent })
      
      const result = await BackendQRService.create({
        upiId,
        recipientName,
        amount: amount ? parseFloat(amount) : null,
        note: note || '',
        orderId,
        expiresInHours: isPermanent ? null : expiresInHours,
        isPermanent,
      })

      console.log('[QRService] Backend create result:', result)

      if (result.success && result.data) {
        // Normalize backend response to match frontend expectations
        const qr = {
          id: result.data.id,
          ref: result.data.ref,
          upi_id: result.data.upi_id,
          recipient_name: result.data.recipient_name,
          amount: result.data.amount,
          note: result.data.note,
          order_id: result.data.order_id,
          upi_string: result.data.upi_string,
          qr_image_url: result.data.qr_image_url,
          created_at: result.data.created_at,
          is_permanent: result.data.is_permanent,
          expires_at: result.data.expires_at,
          scan_count: result.data.scan_count || 0,
          is_active: result.data.is_active,
          status: result.data.status,
          formatted_date: result.data.formatted_date,
          formatted_day: result.data.formatted_day,
          formatted_time: result.data.formatted_time,
        }
        console.log('[QRService] Normalized QR:', qr)
        console.log('[QRService] UPI String:', qr.upi_string)
        return { success: true, data: qr }
      }

      return result
    } catch (error) {
      console.error('[QRService] Create error:', error)
      return { success: false, error: error.message || 'Failed to create QR code' }
    }
  },

  async list() {
    try {
      const result = await BackendQRService.list()
      console.log('[QRService] List result:', result)

      if (result.success && result.data) {
        // Backend now returns: { items: [...], total, page, limit }
        const qrData = result.data.items || result.data
        const qrs = qrData.map(qr => {
          const normalized = {
            id: qr.id,
            ref: qr.ref,
            upi_id: qr.upi_id,
            recipient_name: qr.recipient_name,
            amount: qr.amount,
            note: qr.note,
            upi_string: qr.upi_string,
            qr_image_url: qr.qr_image_url,
            created_at: qr.created_at,
            is_permanent: qr.is_permanent || false,
            expires_at: qr.expires_at || null,
            scan_count: qr.scan_count || 0,
            is_active: qr.is_active,
            status: qr.status,
            formatted_date: qr.formatted_date,
            formatted_day: qr.formatted_day,
            formatted_time: qr.formatted_time,
          }
          console.log('[QRService] Normalized QR item:', normalized)
          return normalized
        })
        return { success: true, data: qrs }
      }

      return result
    } catch (error) {
      console.error('[QRService] List error:', error)
      return { success: false, error: error.message || 'Failed to fetch QR codes', data: [] }
    }
  },

  async getById(ref) {
    try {
      console.log('[QRService] Getting QR by ref:', ref)
      const result = await BackendQRService.get(ref)
      console.log('[QRService] Get by ID result:', result)

      if (result.success && result.data) {
        const qr = {
          id: result.data.id,
          ref: result.data.ref,
          upi_id: result.data.upi_id,
          recipient_name: result.data.recipient_name,
          amount: result.data.amount,
          note: result.data.note,
          upi_string: result.data.upi_string,
          qr_image_url: result.data.qr_image_url,
          created_at: result.data.created_at,
          is_permanent: result.data.is_permanent || false,
          expires_at: result.data.expires_at || null,
          scan_count: result.data.scan_count || 0,
          is_active: result.data.is_active,
          status: result.data.status,
          formatted_date: result.data.formatted_date,
          formatted_day: result.data.formatted_day,
          formatted_time: result.data.formatted_time,
        }

        // Check expiration for non-permanent QR codes
        if (!qr.is_permanent && qr.expires_at && new Date(qr.expires_at) < new Date()) {
          return { success: false, error: 'QR code has expired' }
        }

        if (!qr.is_active || qr.status === 'inactive') {
          return { success: false, error: 'QR code is inactive' }
        }

        return { success: true, data: qr }
      }

      return { success: false, error: result.error || 'QR code not found' }
    } catch (error) {
      console.error('[QRService] GetById error:', error)
      return { success: false, error: error.message || 'Failed to fetch QR code' }
    }
  },

  async recordScan(ref) {
    try {
      return await BackendQRService.recordScan(ref)
    } catch (error) {
      console.error('[QRService] RecordScan error:', error)
      return { success: false, error: error.message }
    }
  },

  async delete(id) {
    try {
      return await BackendQRService.delete(id)
    } catch (error) {
      console.error('[QRService] Delete error:', error)
      return { success: false, error: error.message || 'Failed to delete QR code' }
    }
  },
}

export default QRService
