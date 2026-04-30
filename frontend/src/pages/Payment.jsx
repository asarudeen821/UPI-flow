import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Users, Zap } from 'lucide-react'

import MobilePaymentForm from '@/components/MobilePaymentForm'
import PaymentSuccess from '@/components/PaymentSuccess'
import UPIPaymentForm from '@/components/UPIPaymentForm'
import { TransactionAPI } from '@/api/backend.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import useSocket from '@/hooks/useSocket'
import { usePaymentSound } from '@/hooks/usePaymentSound'
import { useRecipients } from '@/lib/useRecipients'

const MODES = [
  { label: 'UPI ID', value: 'upi_id' },
  { label: 'Mobile', value: 'mobile_number' },
]

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function Payment() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { updateRecipientUsage } = useRecipients()
  const { emitPaymentComplete, emitPaymentInitiate } = useSocket()
  const { playInitiated, playSuccess } = usePaymentSound({ playOnMount: false })
  const [mode, setMode] = useState('upi_id')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [prefilledData, setPrefilledData] = useState(null)
  const [recipientId, setRecipientId] = useState(null)
  const [smartUpi, setSmartUpi] = useState('')
  const [smartAmount, setSmartAmount] = useState('')
  const [smartError, setSmartError] = useState(null)
  const [smartLoading, setSmartLoading] = useState(false)

  useEffect(() => {
    const modeParam = searchParams.get('mode')
    const upiId = searchParams.get('upi_id')
    const mobile = searchParams.get('mobile_number')
    const name = searchParams.get('name')
    const recipientIdParam = searchParams.get('recipientId')

    if (modeParam && MODES.find((item) => item.value === modeParam)) {
      setMode(modeParam)
    }

    if (upiId || mobile || name) {
      setPrefilledData({
        upi_id: upiId,
        mobile_number: mobile,
        recipient_name: name,
      })
    }

    if (recipientIdParam) {
      setRecipientId(recipientIdParam)
    }
  }, [searchParams])

  async function handlePaymentSubmit(formData) {
    setLoading(true)
    setError(null)
    setStatusMessage('Creating transaction...')
    let createdTransaction = null

    try {
      const createdResult = await TransactionAPI.create({
        ...formData,
        recipientId: recipientId || undefined,
      })

      if (!createdResult.success || !createdResult.data) {
        throw new Error(createdResult.error || 'Payment failed. Please try again.')
      }

      createdTransaction = createdResult.data
      emitPaymentInitiate(createdTransaction)
      playInitiated() // Play sound when payment is initiated
      setStatusMessage('Processing payment...')

      await wait(900)

      const updatedResult = await TransactionAPI.updateStatus(createdTransaction.id, 'success')
      if (!updatedResult.success || !updatedResult.data) {
        throw new Error(updatedResult.error || 'Payment processing failed.')
      }

      emitPaymentComplete(updatedResult.data)
      playSuccess() // Play success sound when payment completes

      if (recipientId) {
        await updateRecipientUsage(recipientId, formData.amount)
      }

      setSuccess({
        amount: updatedResult.data.amount || formData.amount,
        recipient:
          updatedResult.data.upi_id ||
          updatedResult.data.mobile_number ||
          formData.upi_id ||
          formData.mobile_number,
        recipientName: updatedResult.data.recipient_name || formData.recipient_name,
        txnId: updatedResult.data.transaction_id || updatedResult.data.id,
        recipientId,
      })
    } catch (err) {
      if (createdTransaction?.id) {
        await TransactionAPI.updateStatus(createdTransaction.id, 'failed').catch((err) => {
          console.error('Failed to update transaction status to failed:', err)
        })
      }
      setError(err.message || 'Payment failed. Please try again.')
    } finally {
      setStatusMessage('')
      setLoading(false)
    }
  }

  async function handleSmartPay() {
    setSmartError(null)
    const cleanUpi = (smartUpi || '').toLowerCase().trim()
    const amt = Number.parseFloat(smartAmount)

    if (!cleanUpi || !cleanUpi.includes('@')) {
      setSmartError('Enter a valid UPI ID (e.g., name@bank)')
      return
    }
    if (!amt || Number.isNaN(amt) || amt <= 0) {
      setSmartError('Enter a valid amount')
      return
    }

    setSmartLoading(true)
    try {
      const result = await TransactionAPI.create({
        payment_method: 'upi_id',
        upi_id: cleanUpi,
        recipient_name: 'Smart UPI Recipient',
        amount: amt,
        note: 'Smart Pay',
        status: 'success',
      })
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Payment failed. Please try again.')
      }
      emitPaymentComplete(result.data)
      playSuccess() // Play success sound for smart pay
      setSuccess({
        amount: result.data.amount,
        recipient: result.data.upi_id,
        recipientName: result.data.recipient_name,
        txnId: result.data.transaction_id || result.data.id,
        recipientId: null,
      })
    } catch (err) {
      setSmartError(err.message || 'Payment failed. Please try again.')
    } finally {
      setSmartLoading(false)
    }
  }

  if (success) {
    return <PaymentSuccess {...success} />
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm dark:border-blue-800 dark:bg-blue-950">
        <div className="mb-3 flex items-center gap-2">
          <img src="/icons/smartpay.svg" alt="Smart Pay" className="h-6 w-6" />
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Smart UPI Pay</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">Send money in one quick step</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1.1fr_0.9fr_auto]">
          <input
            type="text"
            placeholder="UPI ID (e.g., name@bank)"
            value={smartUpi}
            onChange={(e) => setSmartUpi(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 px-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <input
            type="number"
            min="1"
            step="0.01"
            placeholder="Amount (₹)"
            value={smartAmount}
            onChange={(e) => setSmartAmount(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 px-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={handleSmartPay}
            disabled={smartLoading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            <Zap className="h-4 w-4" />
            {smartLoading ? 'Sending...' : 'Pay Now'}
          </button>
        </div>
        {smartError && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            {smartError}
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send Money via UPI</CardTitle>
          <p className="text-sm text-gray-500">
            Choose a payment method and fill in the details
          </p>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-1 rounded-lg border p-1">
              {MODES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setMode(item.value)
                    setError(null)
                  }}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                    mode === item.value
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/recipients')}
              className="text-xs"
            >
              <Users className="mr-1 h-3.5 w-3.5" />
              Saved Recipients
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
              {error}
            </div>
          )}

          {loading && statusMessage && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
              {statusMessage}
            </div>
          )}

          {mode === 'upi_id' ? (
            <UPIPaymentForm
              key={`upi-${prefilledData?.upi_id || ''}-${prefilledData?.recipient_name || ''}`}
              onSubmit={handlePaymentSubmit}
              loading={loading}
              prefilledData={prefilledData}
            />
          ) : (
            <MobilePaymentForm
              key={`mobile-${prefilledData?.mobile_number || ''}-${prefilledData?.recipient_name || ''}`}
              onSubmit={handlePaymentSubmit}
              loading={loading}
              prefilledData={prefilledData}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
