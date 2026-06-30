import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import QuickAmounts from './QuickAmounts'
import PaymentSummary from './PaymentSummary'
import { sanitizeMobileNumber, sanitizeAmount, RBI_DISCLAIMER } from '@/api/backend.js'
import { AlertCircle, Info, Smartphone } from 'lucide-react'

export default function MobilePaymentForm({ onSubmit, loading, prefilledData }) {
  const [mobileNumber, setMobileNumber] = useState(prefilledData?.mobile_number || '')
  const [recipientName, setRecipientName] = useState(prefilledData?.recipient_name || '')
  const [amount, setAmount] = useState(prefilledData?.amount || '')
  const [note, setNote] = useState(prefilledData?.note || '')
  const [showSummary, setShowSummary] = useState(false)
  const [errors, setErrors] = useState([])

  function handleNumberChange(value) {
    // Only allow digits
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 10) {
      setMobileNumber(digits)
      setShowSummary(false)
    }
  }

  function validateForm() {
    const newErrors = []

    // Validate mobile number
    const sanitizedMobile = sanitizeMobileNumber(mobileNumber)
    if (!sanitizedMobile) {
      newErrors.push('Please enter a valid 10-digit Indian mobile number')
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
      payment_method: 'mobile_number',
      mobile_number: sanitizeMobileNumber(mobileNumber),
      recipient_name: recipientName.trim(),
      amount: sanitizeAmount(amount),
      note: note.trim()
    }
    onSubmit(formData)
  }

  const summaryData = showSummary ? {
    mobile_number: mobileNumber,
    recipient_name: recipientName,
    amount: amount,
    note: note
  } : null

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Mobile Number Input */}
      <div className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mobileNumber" className="text-sm font-medium">
            Mobile Number <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              id="mobileNumber"
              type="tel"
              placeholder="9876543210"
              value={mobileNumber}
              onChange={(e) => handleNumberChange(e.target.value)}
              required
              className="pl-9"
              maxLength={10}
            />
          </div>
          <p className="text-xs text-gray-500">
            Enter 10-digit Indian mobile number
          </p>
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
          <Info className="mt-0.5 h-4 w-4 text-blue-600" />
          <div className="text-xs text-blue-800 dark:text-blue-200">
            <p className="font-medium">Mobile Number UPI Payment</p>
            <p className="mt-1">
              The recipient must have UPI linked to this mobile number.
              Funds will be transferred to their bank account via UPI.
            </p>
          </div>
        </div>
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
        <PaymentSummary data={summaryData} paymentMethod="mobile_number" />
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
