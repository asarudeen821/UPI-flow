import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import UPIOptions, { POPULAR_UPI_APPS } from './UPIOptions'
import QuickAmounts from './QuickAmounts'
import PaymentSummary from './PaymentSummary'
import { sanitizeUpiId, sanitizeAmount, RBI_DISCLAIMER } from '@/api/backend.js'
import { AlertCircle, Info } from 'lucide-react'

export default function UPIPaymentForm({ onSubmit, loading, prefilledData }) {
  const [upiId, setUpiId] = useState(prefilledData?.upi_id || '')
  const [recipientName, setRecipientName] = useState(prefilledData?.recipient_name || '')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [upiApp, setUpiApp] = useState(prefilledData?.upi_app || '')
  const [showSummary, setShowSummary] = useState(false)
  const [errors, setErrors] = useState([])

  function handleUPIAppSelect(appSuffix) {
    const selectedApp = POPULAR_UPI_APPS.find((app) => `@${app.id}` === appSuffix)
    setUpiApp(selectedApp?.name || '')
    // If user has entered something, append the suffix
    if (upiId && !upiId.includes('@')) {
      setUpiId(upiId + appSuffix)
    } else if (!upiId) {
      // Pre-fill with common format
      setUpiId('mobile' + appSuffix)
    }
  }

  function validateForm() {
    const newErrors = []

    // Validate UPI ID
    const sanitizedUpi = sanitizeUpiId(upiId)
    if (!sanitizedUpi) {
      newErrors.push('Please enter a valid UPI ID (e.g., name@upi)')
    }

    // Validate recipient name
    if (!recipientName || recipientName.trim().length < 2) {
      newErrors.push('Please enter recipient name (min 2 characters)')
    }

    // Validate amount
    const sanitizedAmount = sanitizeAmount(amount, { min: 1, max: 1000000 })
    if (sanitizedAmount === null) {
      newErrors.push('Please enter a valid amount between ₹1 and ₹10,00,000')
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    
    if (!validateForm()) {
      setShowSummary(false)
      return
    }

    setShowSummary(true)
  }

  function handleConfirm() {
    const formData = {
      payment_method: 'upi_id',
      upi_id: sanitizeUpiId(upiId),
      recipient_name: recipientName.trim(),
      amount: sanitizeAmount(amount),
      note: note.trim(),
      upi_app: upiApp || undefined,
    }
    onSubmit(formData)
  }

  const summaryData = showSummary ? {
    upi_id: upiId,
    recipient_name: recipientName,
    amount: amount,
    note: note,
    upi_app: upiApp,
  } : null

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Preferred UPI App */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Choose UPI App <span className="text-gray-400 text-xs">(optional)</span>
        </Label>
        <select
          value={upiApp}
          onChange={(e) => {
            setUpiApp(e.target.value)
            setShowSummary(false)
          }}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <option value="">No preference</option>
          {POPULAR_UPI_APPS.map((app) => (
            <option key={app.id} value={app.name}>{app.name}</option>
          ))}
          <option value="Other">Other UPI app</option>
        </select>
      </div>

      {/* UPI ID Input */}
      <div className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="upiId" className="text-sm font-medium">
            UPI ID <span className="text-red-500">*</span>
          </Label>
          <Input
            id="upiId"
            placeholder="name@upi"
            value={upiId}
            onChange={(e) => {
              setUpiId(e.target.value.toLowerCase())
              setShowSummary(false)
            }}
            required
            className="lowercase"
          />
          <p className="text-xs text-gray-500">
            Example: 9876543210@oksbi, john@paytm
          </p>
        </div>

        {/* UPI App Quick Selection */}
        <UPIOptions onSelect={handleUPIAppSelect} />
      </div>

      {/* Recipient Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recipientName" className="text-sm font-medium">
          Recipient Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="recipientName"
          placeholder="Enter full name"
          value={recipientName}
          onChange={(e) => {
            setRecipientName(e.target.value)
            setShowSummary(false)
          }}
          required
        />
        <p className="text-xs text-gray-500">
          Verify the name before proceeding
        </p>
      </div>

      {/* Amount */}
      <div className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount" className="text-sm font-medium">
            Amount (₹) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="amount"
            type="number"
            min="1"
            max="1000000"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              setShowSummary(false)
            }}
            required
          />
        </div>

        {/* Quick Amounts */}
        <QuickAmounts onSelect={setAmount} currentAmount={amount} />
      </div>

      {/* Note (Optional) */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note" className="text-sm font-medium">
          Note <span className="text-gray-400">(optional)</span>
        </Label>
        <Input
          id="note"
          placeholder="What's this payment for?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {/* Payment Summary */}
      {showSummary && (
        <PaymentSummary data={summaryData} paymentMethod="upi_id" />
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 text-red-600" />
            <ul className="space-y-1 text-sm text-red-600 dark:text-red-400">
              {errors.map((err, i) => (
                <li key={i}>• {err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-50 py-2 dark:bg-gray-800">
        <Info className="h-4 w-4 text-gray-500" />
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {RBI_DISCLAIMER.trustSignal}
        </span>
      </div>

      {/* Submit Button */}
      {!showSummary ? (
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Review Payment'}
        </button>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowSummary(false)}
            className="w-full rounded-lg border border-gray-300 bg-white py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Edit Details
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="w-full rounded-lg bg-green-600 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Confirm & Pay ₹' + Number(amount).toFixed(2)}
          </button>
        </div>
      )}
    </form>
  )
}
