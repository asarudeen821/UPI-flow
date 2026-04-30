import { Calendar, Clock, ArrowUpRight, ArrowDownLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const STATUS_CONFIG = {
  success: { 
    label: 'Success', 
    variant: 'success', 
    icon: CheckCircle 
  },
  failed: { 
    label: 'Failed', 
    variant: 'destructive', 
    icon: XCircle 
  },
  pending: { 
    label: 'Pending', 
    variant: 'secondary', 
    icon: AlertCircle 
  },
}

export default function TransactionCard({ transaction, onClick }) {
  if (!transaction) return null

  const isReceived = transaction.direction === 'received'
  const isSent = transaction.direction === 'sent'
  const statusConfig = STATUS_CONFIG[transaction.status] || STATUS_CONFIG.pending
  const StatusIcon = statusConfig.icon

  // Format date and time
  const formatDate = () => {
    const date = new Date(transaction.created_date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const isToday = date.toDateString() === today.toDateString()
    const isYesterday = date.toDateString() === yesterday.toDateString()

    if (isToday) {
      return {
        date: 'Today',
        time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        day: '',
        color: 'text-green-600',
      }
    } else if (isYesterday) {
      return {
        date: 'Yesterday',
        time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        day: '',
        color: 'text-blue-600',
      }
    } else {
      return {
        date: date.toLocaleDateString('en-IN', { 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric' 
        }),
        time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        day: date.toLocaleDateString('en-IN', { weekday: 'long' }),
        color: 'text-gray-600',
      }
    }
  }

  const formatDisplay = formatDate()

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left side - Icon and details */}
          <div className="flex items-start gap-3 flex-1">
            {/* Transaction Type Icon */}
            <div className={`p-2 rounded-full mt-0.5 ${
              isReceived ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
            }`}>
              {isReceived ? (
                <ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <ArrowUpRight className="h-4 w-4 text-red-500 dark:text-red-400" />
              )}
            </div>

            {/* Transaction Details */}
            <div className="flex flex-col gap-1 flex-1">
              {/* Name and badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {isReceived
                    ? (transaction.sender_name || transaction.recipient_name)
                    : transaction.recipient_name}
                </span>
                
                {/* Direction Badge */}
                <Badge variant={isReceived ? 'success' : 'destructive'} className="text-xs">
                  {isReceived ? 'Received' : 'Sent'}
                </Badge>

                {/* Status Badge */}
                <Badge variant={statusConfig.variant} className="text-xs flex items-center gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {statusConfig.label}
                </Badge>
              </div>

              {/* Payment Method */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {transaction.upi_id || transaction.mobile_number || 'N/A'}
                </span>
              </div>

              {/* Date and Time */}
              <div className="flex flex-wrap gap-3 text-xs">
                <span className={`font-medium ${formatDisplay.color} flex items-center gap-1`}>
                  <Calendar className="h-3 w-3" />
                  {formatDisplay.date}
                </span>
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDisplay.time}
                </span>
                {formatDisplay.day && (
                  <span className="text-gray-500 dark:text-gray-400 italic">
                    {formatDisplay.day}
                  </span>
                )}
              </div>

              {/* Note (if exists) */}
              {transaction.note && (
                <span className="text-xs italic text-gray-500 dark:text-gray-400 mt-1">
                  Note: {transaction.note}
                </span>
              )}

              {/* Transaction ID */}
              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                ID: {transaction.transaction_id}
              </span>
            </div>
          </div>

          {/* Right side - Amount */}
          <div className="flex flex-col items-end gap-2">
            {/* Amount with color coding */}
            <span className={`text-xl font-bold ${
              isReceived ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
            }`}>
              {isReceived ? '+' : '-'}₹{transaction.amount?.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
