import { useState } from 'react'
import { X, Copy, Check, Download, Mail, MessageCircle, FileDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { downloadPDFReceipt } from '@/utils/receiptPDFGenerator'

const STATUS_CONFIG = {
  success: {
    label: 'Success',
    bgColor: 'bg-green-100 dark:bg-green-900',
    textColor: 'text-green-700 dark:text-green-300',
    borderColor: 'border-green-300 dark:border-green-700',
    icon: '✓'
  },
  failed: {
    label: 'Failed',
    bgColor: 'bg-red-100 dark:bg-red-900',
    textColor: 'text-red-700 dark:text-red-300',
    borderColor: 'border-red-300 dark:border-red-700',
    icon: '✕'
  },
  pending: {
    label: 'Pending',
    bgColor: 'bg-amber-100 dark:bg-amber-900',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-300 dark:border-amber-700',
    icon: '⏳'
  }
}

export default function TransactionReceipt({ transaction, onClose }) {
  const [copied, setCopied] = useState(null)
  const [downloadingPDF, setDownloadingPDF] = useState(false)

  if (!transaction) return null

  const status = STATUS_CONFIG[transaction.status] || STATUS_CONFIG.pending

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleDownloadPDF = async () => {
    try {
      setDownloadingPDF(true)
      await downloadPDFReceipt(transaction)
    } catch (error) {
      console.error('Failed to download PDF:', error)
      alert('Failed to generate PDF receipt. Please try again.')
    } finally {
      setDownloadingPDF(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    }
  }

  const dateInfo = formatDate(transaction.created_date)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg animate-in fade-in zoom-in duration-200">
        {/* Receipt Card */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
          {/* Header with Status */}
          <div className={`relative ${status.bgColor} ${status.textColor} px-6 py-4 border-b ${status.borderColor}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${status.textColor} bg-white dark:bg-gray-800 text-xl font-bold`}>
                  {status.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold">Payment Receipt</h3>
                  <p className="text-sm opacity-80">{status.label}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Receipt Content */}
          <div className="p-6">
            {/* Amount */}
            <div className="mb-6 text-center">
              <p className="text-sm mb-1 text-gray-500 dark:text-gray-400">
                {transaction.direction === 'received' ? 'Amount Received' : 'Amount Paid'}
              </p>
              <p className={`text-4xl font-bold ${transaction.direction === 'received' ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'}`}>
                {transaction.direction === 'received' ? '+' : ''}₹{transaction.amount}
              </p>
            </div>

            {/* Transaction Details */}
            <div className="space-y-4">
              {/* Transaction ID */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Transaction ID</span>
                  <button
                    onClick={() => handleCopy(transaction.transaction_id, 'txnId')}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {copied === 'txnId' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
                  {transaction.transaction_id}
                </p>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{dateInfo.date}</p>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Time</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{dateInfo.time}</p>
                </div>
              </div>

              {/* Recipient Details */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {transaction.direction === 'received' ? 'Received From' : 'Paid To'}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Name</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {transaction.direction === 'received'
                        ? (transaction.sender_name || transaction.recipient_name)
                        : transaction.recipient_name}
                    </span>
                  </div>
                  {transaction.upi_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">UPI ID</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                          {transaction.upi_id}
                        </span>
                        <button
                          onClick={() => handleCopy(transaction.upi_id, 'upi')}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {copied === 'upi' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  )}
                  {transaction.mobile_number && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Mobile</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                          {transaction.mobile_number}
                        </span>
                        <button
                          onClick={() => handleCopy(transaction.mobile_number, 'mobile')}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {copied === 'mobile' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Payment Method</p>
                <div className="flex items-center gap-2">
                  {transaction.payment_method === 'upi_id' ? (
                    <>
                      <img src="/upi-logo.png" alt="UPI" className="h-5 w-5" onError={(e) => e.target.style.display = 'none'} />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">UPI</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Mobile Number</span>
                    </>
                  )}
                </div>
              </div>

              {/* Note */}
              {transaction.note && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Note</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                    {transaction.note}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {downloadingPDF ? (
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Generating...
                  </div>
                ) : (
                  <>
                    <FileDown className="mr-1.5 h-4 w-4" />
                    Download PDF
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(transaction.transaction_id, 'share')}
                className="flex-1"
              >
                <Copy className="mr-1.5 h-4 w-4" />
                {copied === 'share' ? 'Copied!' : 'Copy ID'}
              </Button>
            </div>

            {/* Footer */}
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-400">
                Generated by UPI Flow Pay • {new Date(transaction.created_date).getFullYear()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
