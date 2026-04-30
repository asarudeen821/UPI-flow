import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CheckCircle2, Clock3, QrCode, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'

import QRCodeComp from '@/components/QRCode'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import useSocket from '@/hooks/useSocket'
import { usePaymentSound } from '@/hooks/usePaymentSound'
import {
  applyLivePaymentEvent,
  confirmOrder,
  createOrder,
  resetPaymentState,
} from '@/features/payment/paymentSlice'

const STATUS_META = {
  idle: { label: 'Idle', icon: Clock3, tone: 'text-gray-500' },
  pending: { label: 'Waiting for payment', icon: Clock3, tone: 'text-amber-600' },
  success: { label: 'Payment received', icon: CheckCircle2, tone: 'text-green-600' },
  failed: { label: 'Payment failed', icon: XCircle, tone: 'text-red-600' },
}

function createIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `idem_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`
}

function createPaymentIdentifier() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `pay_${crypto.randomUUID()}`
  }
  return `pay_${Math.random().toString(16).slice(2, 10)}`
}

export default function CreatePayment() {
  const dispatch = useDispatch()
  const { order, upiLink, loading, confirming, error, liveStatus, gatewayOrder } = useSelector(
    (state) => state.payment
  )
  const [form, setForm] = useState({
    amount: '500',
    recipientName: 'PayApp Merchant',
    upiId: 'merchant@upi',
    note: 'Order payment',
  })
  const [validationErrors, setValidationErrors] = useState([])

  useSocket()
  usePaymentSound({ transactionKey: order?.orderId }) // plays when liveStatus transitions pending -> success

  useEffect(() => {
    function handlePaymentEvent(event) {
      const payload = event.detail
      dispatch(applyLivePaymentEvent(payload))
    }

    window.addEventListener('payment:notification', handlePaymentEvent)
    return () => window.removeEventListener('payment:notification', handlePaymentEvent)
  }, [dispatch])

  const statusMeta = STATUS_META[liveStatus] || STATUS_META.idle
  const StatusIcon = statusMeta.icon

  function validateForm() {
    const errors = []
    
    if (!form.amount || Number.parseFloat(form.amount) <= 0) {
      errors.push('Amount must be greater than 0')
    }
    
    if (Number.parseFloat(form.amount) > 1000000) {
      errors.push('Amount cannot exceed ₹10,00,000')
    }
    
    if (!form.recipientName || form.recipientName.trim().length < 2) {
      errors.push('Recipient name must be at least 2 characters')
    }
    
    if (!form.upiId || !form.upiId.includes('@')) {
      errors.push('Valid UPI ID is required (e.g., name@upi)')
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    
    if (!validateForm()) {
      return
    }

    dispatch(
      createOrder({
        amount: Number.parseFloat(form.amount),
        recipientName: form.recipientName.trim(),
        upiId: form.upiId.trim().toLowerCase(),
        note: form.note.trim(),
        idempotencyKey: createIdempotencyKey(),
      })
    )
  }

  function handleConfirm() {
    if (!order?.orderId) return
    const paymentId = createPaymentIdentifier()
    dispatch(confirmOrder({ orderId: order.orderId, paymentId }))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create Live Payment</CardTitle>
          <p className="text-sm text-gray-500">
            Build a merchant checkout session, render a UPI QR, and watch payment status update in real time.
          </p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label>Amount (INR)</Label>
              <Input
                min="1"
                step="1"
                type="number"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Merchant Name</Label>
              <Input
                value={form.recipientName}
                onChange={(event) => setForm({ ...form, recipientName: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>UPI ID</Label>
              <Input
                value={form.upiId}
                onChange={(event) => setForm({ ...form, upiId: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Note</Label>
              <Input
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
              />
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-3">
              <Button disabled={loading} type="submit">
                {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                {loading ? 'Creating session...' : 'Generate QR Session'}
              </Button>
              <Button onClick={() => dispatch(resetPaymentState())} type="button" variant="outline">
                Reset
              </Button>
            </div>
          </form>

          {validationErrors.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <ul className="list-inside list-disc space-y-1">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${statusMeta.tone}`} />
            {statusMeta.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {upiLink ? (
            <>
              <QRCodeComp value={upiLink} />
              <div className="w-full space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Order</span>
                  <span className="font-mono text-xs">{order?.orderId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Gateway</span>
                  <span>{gatewayOrder?.provider || order?.gateway || 'mock'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-semibold text-blue-600">Rs. {order?.amount}</span>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
                  <div className="mb-1 font-medium text-gray-900">UPI Link</div>
                  <div className="break-all font-mono">{upiLink}</div>
                </div>
              </div>
              <div className="grid w-full gap-2">
                <Button
                  className="bg-green-600 text-white hover:bg-green-700"
                  disabled={!order?.orderId || confirming || liveStatus === 'success'}
                  onClick={handleConfirm}
                  type="button"
                >
                  {confirming ? 'Confirming...' : 'Simulate Success'}
                </Button>
              </div>
              <p className="flex items-center gap-2 text-xs text-gray-500">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                Same-host flow: backend creates the order, Socket.IO broadcasts the update, and Redux keeps UI state in sync.
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-center text-gray-400">
              <QrCode className="h-12 w-12" />
              <p className="text-sm">Create a payment session to render the live QR checkout.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
