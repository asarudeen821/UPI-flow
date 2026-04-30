/**
 * Payment Summary Component
 * Displays payment details before confirmation
 */

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function PaymentSummary({ data, paymentMethod }) {
  if (!data) return null

  const isUPI = paymentMethod === 'upi_id'

  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            Payment Summary
          </h3>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Payment Method:</span>
            <Badge variant="secondary" className="capitalize">
              {isUPI ? 'UPI ID' : 'Mobile Number'}
            </Badge>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Recipient:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {data.recipient_name}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{isUPI ? 'UPI ID:' : 'Mobile:'}:</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">
              {data.upi_id || data.mobile_number}
            </span>
          </div>
          {isUPI && data.upi_app && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">UPI App:</span>
              <span className="text-gray-900 dark:text-gray-100">{data.upi_app}</span>
            </div>
          )}

          <div className="flex justify-between border-t border-blue-200 pt-2 dark:border-blue-800">
            <span className="text-gray-600 dark:text-gray-400">Amount:</span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              ₹{Number(data.amount).toFixed(2)}
            </span>
          </div>

          {data.note && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Note:</span>
              <span className="text-gray-700 dark:text-gray-300 italic">{data.note}</span>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-white/50 p-2 dark:bg-gray-800/50">
          <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" />
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Please verify all details before confirming. Once processed, this transaction cannot be reversed.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
