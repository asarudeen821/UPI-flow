import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle, QrCode, XCircle } from 'lucide-react'

import QRCodeComp from '@/components/QRCode'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QRService, TransactionAPI, WebhookService, buildUPIString } from '@/api/backend.js'
import { usePaymentSound } from '@/hooks/usePaymentSound'

export default function QrPayPage() {
  const { ref } = useParams()
  const [qr, setQr] = useState(null)
  const [error, setError] = useState(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const { playSuccess } = usePaymentSound({
    selector: null,
    transactionKey: success?.transaction_id || success?.id || ref,
  })

  useEffect(() => {
    let active = true

    async function loadQR() {
      try {
        // Record scan when page loads
        await QRService.recordScan(ref)
        
        const result = await QRService.getById(ref)
        if (!active) return
        if (result.success) {
          setQr(result.data)
          if (result.data.amount) {
            setAmount(String(result.data.amount))
          }
        } else {
          setError(result.error)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'QR code not found')
        }
      }
    }

    loadQR()
    return () => {
      active = false
    }
  }, [ref])

  useEffect(() => {
    if (!success) return
    playSuccess()
  }, [success, playSuccess])

  const qrValue = useMemo(() => {
    if (!qr) return ''
    return buildUPIString({
      upiId: qr.upi_id,
      name: qr.recipient_name,
      amount: qr.amount || amount || null,
      note: qr.note,
      transactionRef: qr.ref,
    })
  }, [amount, qr])

  async function handlePay(event) {
    event.preventDefault()
    if (!amount || Number.parseFloat(amount) <= 0) return
    setLoading(true)
    try {
      const result = await TransactionAPI.create({
        payment_method: 'upi_id',
        upi_id: qr.upi_id,
        recipient_name: qr.recipient_name,
        amount: Number.parseFloat(amount),
        note: qr.note || '',
        status: 'success',
      })
      if (result.success) {
        await WebhookService.emit('payment.success', result.data)
        setSuccess(result.data)
      }
    } catch (payError) {
      setError(payError.message)
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <XCircle className="h-14 w-14 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">QR Code Unavailable</h2>
            <p className="text-sm text-gray-500">{error}</p>
            <Link to="/" className="text-sm text-blue-600 hover:underline">Go to UPI Flow Pay</Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <CheckCircle className="h-14 w-14 text-green-500" />
            <h2 className="text-xl font-bold">Payment Successful!</h2>
            <p className="text-gray-500">Rs. {success.amount} sent to {qr.recipient_name}</p>
            <p className="font-mono text-xs text-gray-400">Txn: {success.transaction_id || success.id}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!qr) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  // Check if QR is expired or inactive
  const isExpired = () => {
    if (qr.is_permanent) return false
    if (!qr.expires_at) return false
    if (qr.status === 'inactive' || qr.is_active === false) return true
    return new Date(qr.expires_at) < new Date()
  }

  if (isExpired()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <XCircle className="h-14 w-14 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">QR Code Expired</h2>
            <p className="text-sm text-gray-500">
              {qr.is_permanent 
                ? 'This QR code is no longer active'
                : `This QR code expired on ${new Date(qr.expires_at).toLocaleString('en-IN')}`
              }
            </p>
            <Link to="/" className="text-sm text-blue-600 hover:underline">Go to UPI Flow Pay</Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Pay {qr.recipient_name}</CardTitle>
          {qr.note && <p className="text-sm text-gray-500">{qr.note}</p>}
          <div className="flex items-center justify-center gap-2 pt-2">
            <Badge variant={qr.is_permanent ? 'success' : isExpired() ? 'destructive' : 'success'}>
              {qr.is_permanent ? 'Permanent' : isExpired() ? 'Expired' : 'Active'}
            </Badge>
            {qr.amount && <span className="text-lg font-bold text-blue-600">Rs. {qr.amount}</span>}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {qrValue && (
            <div className="flex flex-col items-center gap-2">
              <QRCodeComp value={qrValue} size={200} />
              <p className="flex items-center gap-1 text-xs text-gray-400">
                <QrCode className="h-3 w-3" /> Scan with any UPI app
              </p>
            </div>
          )}
          <div className="relative flex items-center gap-2">
            <div className="flex-1 border-t" />
            <span className="text-xs text-gray-400">or pay manually</span>
            <div className="flex-1 border-t" />
          </div>
          <form onSubmit={handlePay} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Amount (INR) {!qr.amount && '*'} {qr.amount && `(Rs. ${qr.amount})`}</Label>
              <Input
                type="number"
                min="1"
                placeholder={qr.amount ? `Enter ${qr.amount}` : 'Enter amount'}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                readOnly={Boolean(qr.amount)}
              />
            </div>
            <Button type="submit" disabled={loading || (!amount && !qr.amount)} className="w-full">
              {loading ? 'Processing...' : `Pay Rs. ${amount || qr.amount || '0'}`}
            </Button>
          </form>
          <div className="space-y-1 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>UPI ID:</span>
              <span className="font-mono">{qr.upi_id}</span>
            </div>
            <div className="flex justify-between">
              <span>Reference:</span>
              <span className="font-mono">{qr.ref}</span>
            </div>
            <div className="flex justify-between">
              <span>Scans:</span>
              <span>{qr.scan_count || 0}</span>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400">Secured by UPI Flow Pay - RBI compliant</p>
        </CardContent>
      </Card>
    </div>
  )
}

// Simple Badge component for status display
function Badge({ variant = 'default', children }) {
  const variants = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    destructive: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}
