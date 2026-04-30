import { useEffect, useState } from 'react'
import { CheckCircle, UserPlus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useRecipients } from '@/lib/useRecipients'
import { sanitizeUpiId, sanitizeMobileNumber } from '@/api/backend.js'
import { usePaymentSound } from '@/hooks/usePaymentSound'

export default function PaymentSuccess({
  amount,
  recipient,
  recipientName,
  txnId,
  recipientId
}) {
  const { addRecipient } = useRecipients()
  const [showSaveForm, setShowSaveForm] = useState(!recipientId)
  const [saving, setSaving] = useState(false)
  const [nickname, setNickname] = useState('')
  const [category, setCategory] = useState('other')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const { playSuccess } = usePaymentSound({
    selector: null,
    playOnMount: true,
    transactionKey: txnId,
  })

  useEffect(() => {
    playSuccess()
  }, [playSuccess])

  async function handleSaveRecipient() {
    if (!nickname.trim()) return

    setSaving(true)
    setSaveError(null)

    try {
      // Determine payment method from recipient format
      const isUpi = recipient.includes('@')
      const recipientData = {
        name: recipientName,
        payment_method: isUpi ? 'upi_id' : 'mobile_number',
        upi_id: isUpi ? sanitizeUpiId(recipient) : undefined,
        mobile_number: isUpi ? undefined : sanitizeMobileNumber(recipient),
        nickname: nickname.trim(),
        category
      }

      const result = await addRecipient(recipientData)
      if (result.success) {
        setSaved(true)
        setShowSaveForm(false)
      } else {
        setSaveError(result.error || 'Failed to save recipient')
      }
    } catch (error) {
      console.error('Failed to save recipient:', error)
      setSaveError(error.message || 'Failed to save recipient')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Payment Successful!
        </h2>
        
        {amount && (
          <div className="flex flex-col gap-1">
            <p className="text-lg text-gray-600 dark:text-gray-400">
              ₹{amount} sent to{' '}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {recipientName}
              </span>
            </p>
            <p className="text-sm text-gray-500">{recipient}</p>
          </div>
        )}
        
        {txnId && (
          <p className="rounded-lg bg-gray-100 px-4 py-2 font-mono text-xs text-gray-500 dark:bg-gray-800">
            Txn ID: {txnId}
          </p>
        )}

        {(saved || recipientId) && (
          <div className="mt-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            Recipient is ready in your saved list for future payments.
          </div>
        )}

        {/* Save Recipient Option */}
        {!recipientId && showSaveForm && (
          <Card className="w-full mt-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  Save as Recipient?
                </h3>
              </div>
              
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Save this recipient for faster payments next time
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="nickname" className="text-xs">
                  Nickname
                </Label>
                <Input
                  id="nickname"
                  placeholder="e.g., Mom, Rent, Electricity"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs">
                  Category
                </Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="family">Family</option>
                  <option value="friends">Friends</option>
                  <option value="bills">Bills</option>
                  <option value="business">Business</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveForm(false)}
                  className="flex-1 text-xs"
                >
                  Skip
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveRecipient}
                  disabled={saving || !nickname.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs"
                >
                  {saving ? 'Saving...' : 'Save Recipient'}
                </Button>
              </div>

              {saved && (
                <p className="text-xs text-green-600 dark:text-green-400 text-center">
                  ✓ Recipient saved successfully!
                </p>
              )}

              {saveError && (
                <p className="text-xs text-red-600 dark:text-red-400 text-center">
                  ✕ {saveError}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-3 pt-4">
          {(saved || recipientId) && (
            <Link to="/recipients">
              <Button type="button" variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                View Recipients
              </Button>
            </Link>
          )}
          <Link
            to="/transactions"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            View Transactions
          </Link>
          <Link
            to="/payment"
            className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            New Payment
          </Link>
        </div>
      </div>
    </div>
  )
}
