/**
 * Quick Amount Selector Component
 * Predefined amount buttons for faster payment
 */

import { Button } from '@/components/ui/button'

const QUICK_AMOUNTS = [100, 500, 1000, 5000]

export default function QuickAmounts({ onSelect, currentAmount }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Quick Amounts
      </label>
      <div className="grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS.map((amount) => (
          <Button
            key={amount}
            type="button"
            variant={currentAmount === amount.toString() ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(amount.toString())}
            className={
              currentAmount === amount.toString()
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-gray-700'
            }
          >
            ₹{amount.toLocaleString('en-IN')}
          </Button>
        ))}
      </div>
    </div>
  )
}
