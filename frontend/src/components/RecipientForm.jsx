import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { sanitizeUpiId, sanitizeMobileNumber, validateRecipient } from '@/api/backend.js'

const CATEGORIES = [
  { value: 'family', label: 'Family' },
  { value: 'friends', label: 'Friends' },
  { value: 'bills', label: 'Bills' },
  { value: 'business', label: 'Business' },
  { value: 'other', label: 'Other' }
]

const PAYMENT_METHODS = [
  { label: 'UPI ID', value: 'upi_id' },
  { label: 'Mobile Number', value: 'mobile_number' }
]

export default function RecipientForm({ 
  recipient, 
  onSubmit, 
  onCancel,
  loading = false 
}) {
  const [paymentMethod, setPaymentMethod] = useState(recipient?.payment_method || 'upi_id')
  const [name, setName] = useState(recipient?.name || '')
  const [upiId, setUpiId] = useState(recipient?.upi_id || '')
  const [mobileNumber, setMobileNumber] = useState(recipient?.mobile_number || '')
  const [nickname, setNickname] = useState(recipient?.nickname || '')
  const [category, setCategory] = useState(recipient?.category || 'other')
  const [errors, setErrors] = useState([])

  function handleNumberChange(value) {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 10) {
      setMobileNumber(digits)
    }
  }

  function validateForm() {
    const newErrors = []

    // Validate name
    if (!name || name.trim().length < 2) {
      newErrors.push('Please enter recipient name (min 2 characters)')
    }

    // Validate payment method fields
    if (paymentMethod === 'upi_id') {
      const sanitized = sanitizeUpiId(upiId)
      if (!sanitized) {
        newErrors.push('Please enter a valid UPI ID (e.g., name@upi)')
      }
    } else {
      const sanitized = sanitizeMobileNumber(mobileNumber)
      if (!sanitized) {
        newErrors.push('Please enter a valid 10-digit mobile number')
      }
    }

    // Validate nickname
    if (!nickname || nickname.trim().length < 2) {
      newErrors.push('Please enter a nickname (min 2 characters)')
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const formData = {
      name: name.trim(),
      payment_method: paymentMethod,
      upi_id: paymentMethod === 'upi_id' ? sanitizeUpiId(upiId) : undefined,
      mobile_number: paymentMethod === 'mobile_number' ? sanitizeMobileNumber(mobileNumber) : undefined,
      nickname: nickname.trim(),
      category
    }

    // Validate with backend validator
    const validation = validateRecipient(formData)
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }

    onSubmit(formData)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Method Selector */}
          <div className="flex rounded-lg border p-1 w-fit gap-1">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => { setPaymentMethod(m.value); setErrors([]) }}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  paymentMethod === m.value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Recipient Name *</Label>
            <Input
              id="name"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* UPI ID / Mobile Number */}
          <div className="space-y-1.5">
            <Label htmlFor="contact">
              {paymentMethod === 'upi_id' ? 'UPI ID' : 'Mobile Number'} *
            </Label>
            {paymentMethod === 'upi_id' ? (
              <Input
                id="contact"
                placeholder="name@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value.toLowerCase())}
                className="lowercase"
                required
              />
            ) : (
              <Input
                id="contact"
                type="tel"
                placeholder="9876543210"
                value={mobileNumber}
                onChange={(e) => handleNumberChange(e.target.value)}
                maxLength={10}
                required
              />
            )}
          </div>

          {/* Nickname */}
          <div className="space-y-1.5">
            <Label htmlFor="nickname">Nickname *</Label>
            <Input
              id="nickname"
              placeholder="e.g., Mom, Rent, Electricity"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">
              Quick reference name for this recipient
            </p>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

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

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Saving...' : (recipient ? 'Update' : 'Add')} Recipient
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
