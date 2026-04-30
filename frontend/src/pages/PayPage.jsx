import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle, QrCode, XCircle } from 'lucide-react'

import QRCodeComp from '@/components/QRCode'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PaymentLinkService, TransactionAPI, WebhookService, buildUPIString } from '@/api/backend.js'
import { usePaymentSound } from '@/hooks/usePaymentSound'

export default function PayPage() {
  const { slug } = useParams()
  const [link, setLink] = useState(null)
  const [error, setError] = useState(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const { playSuccess } = usePaymentSound({
    selector: null,
    transactionKey: success?.transaction_id || success?.id || slug,
  })

  useEffect(() => {
    let active = true

    async function loadLink() {
      try {
        const result = await PaymentLinkService.getBySlug(slug)
        if (!active) return
        if (result.success) {
          setLink(result.data)
          if (result.data.amount) {
            setAmount(String(result.data.amount))
          }
        } else {
          setError(result.error)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message)
        }
      }
    }

    loadLink()
    return () => {
      active = false
    }
  }, [slug])

  useEffect(() => {
    if (!success) return
    playSuccess()
  }, [success, playSuccess])

  const qrValue = useMemo(() => {
    if (!link) return ''
    return buildUPIString({
      upiId: link.upi_id,
      name: link.recipient_name,
      amount: link.amount || amount || null,
      note: link.description,
      transactionRef: link.slug,
    })
  }, [amount, link])

  async function handlePay(event) {
    event.preventDefault()
    if (!amount || Number.parseFloat(amount) <= 0) return
    setLoading(true)
    try {
      const result = await TransactionAPI.create({
        payment_method: 'upi_id',
        upi_id: link.upi_id,
        recipient_name: link.recipient_name,
        amount: Number.parseFloat(amount),
        note: link.description || '',
        status: 'success',
      })
      if (result.success) {
        await PaymentLinkService.recordUse(slug)
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Link Unavailable</h2>
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
            <p className="text-sm text-gray-500 dark:text-gray-400">Rs. {success.amount} sent to {link.recipient_name}</p>
            <p className="font-mono text-xs text-gray-400">Txn: {success.transaction_id || success.id}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!link) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Pay {link.recipient_name}</CardTitle>
          {link.description && <p className="text-sm text-gray-500">{link.description}</p>}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {qrValue && (
            <div className="flex flex-col items-center gap-2">
              <QRCodeComp value={qrValue} />
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
              <Label>Amount (INR) *</Label>
              <Input
                type="number"
                min="1"
                placeholder="Enter amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                readOnly={Boolean(link.amount)}
              />
            </div>
            <Button type="submit" disabled={loading || !amount} className="w-full">
              {loading ? 'Processing...' : `Pay Rs. ${amount || '0'}`}
            </Button>
          </form>
          <p className="text-center text-xs text-gray-400">Secured by UPI Flow Pay - RBI compliant</p>
        </CardContent>
      </Card>
    </div>
  )
}
