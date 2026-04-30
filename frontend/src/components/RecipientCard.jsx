/**
 * Recipient Card Component
 * Displays a single recipient with quick pay action
 */

import { User, Smartphone, Wallet, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const CATEGORY_COLORS = {
  family: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  friends: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  bills: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  business: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
}

const CATEGORY_LABELS = {
  family: 'Family',
  friends: 'Friends',
  bills: 'Bills',
  business: 'Business',
  other: 'Other'
}

export default function RecipientCard({ 
  recipient, 
  onPay, 
  onEdit, 
  onDelete,
  showActions = true 
}) {
  const isUPI = recipient.payment_method === 'upi_id'
  const categoryColor = CATEGORY_COLORS[recipient.category] || CATEGORY_COLORS.other
  const categoryLabel = CATEGORY_LABELS[recipient.category] || 'Other'

  function handlePayClick(e) {
    e.stopPropagation()
    onPay?.(recipient)
  }

  function handleEditClick(e) {
    e.stopPropagation()
    onEdit?.(recipient)
  }

  function handleDeleteClick(e) {
    e.stopPropagation()
    onDelete?.(recipient)
  }

  return (
    <Card className="group hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Left: Avatar + Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Avatar */}
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${categoryColor} flex-shrink-0`}>
              {isUPI ? (
                <Wallet className="h-5 w-5" />
              ) : (
                <Smartphone className="h-5 w-5" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {recipient.nickname}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${categoryColor}`}>
                  {categoryLabel}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {recipient.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                {isUPI ? recipient.upi_id : recipient.mobile_number}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Last Amount (if available) */}
            {recipient.last_amount && (
              <div className="hidden sm:block text-right mr-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Last paid</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  ₹{recipient.last_amount.toLocaleString('en-IN')}
                </p>
              </div>
            )}

            {/* Quick Pay Button */}
            <Button
              onClick={handlePayClick}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Pay
            </Button>

            {/* Actions Menu */}
            {showActions && (
              <div className="relative group/menu">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[120px] opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10">
                  <button
                    onClick={handleEditClick}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Usage Stats */}
        {recipient.usage_count > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>
              Paid {recipient.usage_count} time{recipient.usage_count !== 1 ? 's' : ''}
            </span>
            {recipient.last_used && (
              <span>
                Last used: {new Date(recipient.last_used).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
