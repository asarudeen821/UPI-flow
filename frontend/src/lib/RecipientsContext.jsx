/**
 * Recipients Context
 * React Context for managing recipients state globally
 * Uses mock data when backend is unavailable
 */

import { useEffect, useState } from 'react'

import { RecipientAPI } from '@/api/backend.js'
import { RECIPIENT_CATEGORIES, RecipientsContext } from './recipients-context'

const MOCK_RECIPIENTS = [
  {
    id: 'mock_1',
    name: 'Mom',
    payment_method: 'upi_id',
    upi_id: '9876543210@oksbi',
    nickname: 'Mom',
    category: 'family',
    last_amount: 5000,
    last_used: new Date().toISOString(),
    usage_count: 25,
    recipient_id: 'RCPMOM123',
  },
  {
    id: 'mock_2',
    name: 'Electricity Board',
    payment_method: 'upi_id',
    upi_id: 'electricity@paytm',
    nickname: 'Electricity',
    category: 'bills',
    last_amount: 1200,
    last_used: new Date().toISOString(),
    usage_count: 12,
    recipient_id: 'RCPELEC456',
  },
  {
    id: 'mock_3',
    name: 'John Doe',
    payment_method: 'mobile_number',
    mobile_number: '9876543210',
    nickname: 'John',
    category: 'friends',
    last_amount: 500,
    last_used: new Date().toISOString(),
    usage_count: 8,
    recipient_id: 'RCPJOHN789',
  },
]

export function RecipientsProvider({ children }) {
  const [recipients, setRecipients] = useState(MOCK_RECIPIENTS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, total: MOCK_RECIPIENTS.length, limit: 50 })

  useEffect(() => {
    fetchRecipients()
  }, [])

  async function fetchRecipients(options = {}) {
    setLoading(true)
    setError(null)

    try {
      const result = await RecipientAPI.list({
        page: 1,
        limit: 50,
        sortBy: 'last_used',
        order: 'desc',
        ...options,
      })

      if (result.success && result.data) {
        setRecipients(result.data)
        setPagination(result.pagination || { page: 1, total: result.data.length, limit: 50 })
        setError(null)
      } else {
        setRecipients(MOCK_RECIPIENTS)
        setPagination({ page: 1, total: MOCK_RECIPIENTS.length, limit: 50 })
        setError(null)
      }
    } catch (err) {
      console.error('Failed to fetch recipients:', err)
      setRecipients(MOCK_RECIPIENTS)
      setPagination({ page: 1, total: MOCK_RECIPIENTS.length, limit: 50 })
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  async function addRecipient(recipientData) {
    setLoading(true)
    setError(null)

    try {
      const result = await RecipientAPI.create(recipientData)
      if (result.success && result.data) {
        setRecipients((previous) => [result.data, ...previous])
        return { success: true, data: result.data }
      }
    } catch {
      // Fall back to local mock insertion below.
    } finally {
      setLoading(false)
    }

    const newRecipient = {
      ...recipientData,
      id: `mock_${Date.now()}`,
      recipient_id: `RCP${Date.now()}`,
      last_used: new Date().toISOString(),
      usage_count: 0,
    }
    setRecipients((previous) => [newRecipient, ...previous])
    return { success: true, data: newRecipient }
  }

  async function updateRecipient(id, data) {
    setLoading(true)
    setError(null)

    try {
      const result = await RecipientAPI.update(id, data)
      if (result.success && result.data) {
        setRecipients((previous) => previous.map((recipient) => (recipient.id === id ? result.data : recipient)))
        return { success: true, data: result.data }
      }
    } catch {
      // Fall back to local update below.
    } finally {
      setLoading(false)
    }

    const updated = { ...recipients.find((recipient) => recipient.id === id), ...data }
    setRecipients((previous) => previous.map((recipient) => (recipient.id === id ? updated : recipient)))
    return { success: true, data: updated }
  }

  async function deleteRecipient(id) {
    setLoading(true)
    setError(null)

    try {
      const result = await RecipientAPI.delete(id)
      if (result.success) {
        setRecipients((previous) => previous.filter((recipient) => recipient.id !== id))
        return { success: true }
      }
    } catch {
      // Fall back to local delete below.
    } finally {
      setLoading(false)
    }

    setRecipients((previous) => previous.filter((recipient) => recipient.id !== id))
    return { success: true }
  }

  async function updateRecipientUsage(id, amount) {
    try {
      await RecipientAPI.updateUsage(id, amount).catch((err) => {
        console.error('Failed to update recipient usage via API:', err)
      })

      setRecipients((previous) =>
        previous.map((recipient) => {
          if (recipient.id !== id) {
            return recipient
          }

          return {
            ...recipient,
            last_used: new Date().toISOString(),
            usage_count: (recipient.usage_count || 0) + 1,
            last_amount: amount || recipient.last_amount,
          }
        })
      )
      return { success: true }
    } catch (errorValue) {
      console.error('Failed to update recipient usage:', errorValue)
      return { success: false, error: errorValue.message }
    }
  }

  function getRecipientById(id) {
    return recipients.find((recipient) => recipient.id === id) || null
  }

  function getRecipientsByCategory(category) {
    if (category === 'all') return recipients
    return recipients.filter((recipient) => recipient.category === category)
  }

  function searchRecipients(query) {
    if (!query.trim()) return recipients
    const searchLower = query.toLowerCase()
    return recipients.filter(
      (recipient) =>
        recipient.name.toLowerCase().includes(searchLower) ||
        recipient.nickname.toLowerCase().includes(searchLower) ||
        (recipient.upi_id && recipient.upi_id.toLowerCase().includes(searchLower)) ||
        (recipient.mobile_number && recipient.mobile_number.includes(searchLower))
    )
  }

  const value = {
    recipients,
    loading,
    error,
    pagination,
    fetchRecipients,
    addRecipient,
    updateRecipient,
    deleteRecipient,
    updateRecipientUsage,
    getRecipientById,
    getRecipientsByCategory,
    searchRecipients,
    categories: RECIPIENT_CATEGORIES,
  }

  return <RecipientsContext.Provider value={value}>{children}</RecipientsContext.Provider>
}
