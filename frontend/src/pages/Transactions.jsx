import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, Calendar, Clock, TrendingUp, FileText, ArrowUpRight, ArrowDownLeft, Plus } from 'lucide-react'

import { TransactionAPI } from '@/api/backend.js'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import TransactionReceipt from '@/components/TransactionReceipt'
import TransactionCard from '@/components/TransactionCard'
import useSocket from '@/hooks/useSocket'

const STATUS_FILTERS = ['All', 'success', 'failed', 'pending']
const STATUS_VARIANT = { success: 'success', failed: 'destructive', pending: 'secondary' }

export default function Transactions() {
  useSocket()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [directionFilter, setDirectionFilter] = useState('All') // 'All', 'sent', 'received'
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 20 })
  const [viewMode, setViewMode] = useState('list')
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [receiveModal, setReceiveModal] = useState(false)
  const [receiveForm, setReceiveForm] = useState({ sender_name: '', upi_id: '', amount: '', note: '' })
  const [receiveLoading, setReceiveLoading] = useState(false)
  const [receiveError, setReceiveError] = useState(null)

  async function fetchTransactions(page = 1, status = 'All') {
    setLoading(true)
    setError(null)
    try {
      const result = await TransactionAPI.list({
        page,
        limit: 20,
        sortBy: 'created_date',
        order: 'desc',
        ...(status !== 'All' && { status }),
      })
      if (result.success) {
        setTransactions(result.data || [])
        setPagination(result.pagination || { page, total: 0, limit: 20 })
      } else {
        setError(result.error || 'Failed to load transactions.')
      }
    } catch (err) {
      setError(err.message || 'Failed to load transactions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions(1, filter)
  }, [filter])

  useEffect(() => {
    function handleTransactionUpdate(event) {
      const updatedTransaction = event.detail

      setTransactions((previous) => {
        const exists = previous.some((transaction) => transaction.id === updatedTransaction.id)

        if (filter !== 'All' && updatedTransaction.status !== filter) {
          return previous.filter((transaction) => transaction.id !== updatedTransaction.id)
        }

        if (exists) {
          return previous.map((transaction) =>
            transaction.id === updatedTransaction.id ? updatedTransaction : transaction
          )
        }

        return [updatedTransaction, ...previous]
      })

      setPagination((previous) => ({
        ...previous,
        total: previous.total + (transactions.some((transaction) => transaction.id === updatedTransaction.id) ? 0 : 1),
      }))
    }

    window.addEventListener('transaction:update', handleTransactionUpdate)
    return () => window.removeEventListener('transaction:update', handleTransactionUpdate)
  }, [filter, transactions])

  const filtered = useMemo(() => {
    let result = transactions
    if (directionFilter !== 'All') {
      result = result.filter((t) => (t.direction || 'sent') === directionFilter)
    }
    if (!search.trim()) return result
    const query = search.toLowerCase()
    return result.filter(
      (transaction) =>
        (transaction.upi_id || '').toLowerCase().includes(query) ||
        (transaction.mobile_number || '').toLowerCase().includes(query) ||
        (transaction.recipient_name || '').toLowerCase().includes(query) ||
        (transaction.sender_name || '').toLowerCase().includes(query) ||
        (transaction.transaction_id || '').toLowerCase().includes(query) ||
        (transaction.note || '').toLowerCase().includes(query)
    )
  }, [transactions, search, directionFilter])

  async function handleReceiveMoney(e) {
    e.preventDefault()
    setReceiveError(null)
    const amt = parseFloat(receiveForm.amount)
    if (!receiveForm.sender_name.trim()) return setReceiveError('Sender name is required')
    if (!amt || amt <= 0) return setReceiveError('Enter a valid amount')
    setReceiveLoading(true)
    try {
      const res = await fetch('/api/transactions/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_name: receiveForm.sender_name.trim(),
          upi_id: receiveForm.upi_id.trim() || undefined,
          amount: amt,
          note: receiveForm.note.trim() || undefined,
          payment_method: receiveForm.upi_id.trim() ? 'upi_id' : 'mobile_number',
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed')
      setReceiveModal(false)
      setReceiveForm({ sender_name: '', upi_id: '', amount: '', note: '' })
      fetchTransactions(1, filter)
    } catch (err) {
      setReceiveError(err.message)
    } finally {
      setReceiveLoading(false)
    }
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit)

  // Format date display helper
  const formatDateDisplay = (transaction) => {
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
        color: 'text-green-600'
      }
    } else if (isYesterday) {
      return {
        date: 'Yesterday',
        time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        day: '',
        color: 'text-blue-600'
      }
    } else {
      return {
        date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        day: date.toLocaleDateString('en-IN', { weekday: 'long' }),
        color: 'text-gray-600'
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Transaction History</h1>
          <p className="text-sm text-gray-500 mt-1">Track all payments with date, time, and day information</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReceiveModal(true)}
            className="text-green-700 border-green-300 hover:bg-green-50"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Simulate Receive
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'list' ? 'timeline' : 'list')}
          >
            {viewMode === 'list' ? 'Timeline View' : 'List View'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTransactions(pagination.page, filter)}
            disabled={loading}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by recipient, sender, ID, or note..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => {
                setFilter(status)
                setSearch('')
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'border text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              {status}
            </button>
          ))}
          <div className="w-px bg-gray-200 mx-1" />
          {['All', 'sent', 'received'].map((dir) => (
            <button
              key={dir}
              onClick={() => setDirectionFilter(dir)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors flex items-center gap-1 ${
                directionFilter === dir
                  ? dir === 'received' ? 'bg-green-600 text-white' : dir === 'sent' ? 'bg-red-500 text-white' : 'bg-gray-700 text-white'
                  : 'border text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              {dir === 'sent' && <ArrowUpRight className="h-3 w-3" />}
              {dir === 'received' && <ArrowDownLeft className="h-3 w-3" />}
              {dir}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      {!loading && !error && transactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Transactions</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{pagination.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <ArrowUpRight className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sent</p>
                <p className="text-lg font-bold text-red-600">
                  ₹{transactions.filter(t => (t.direction || 'sent') === 'sent' && t.status === 'success').reduce((s, t) => s + (t.amount || 0), 0).toLocaleString('en-IN')}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <ArrowDownLeft className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Received</p>
                <p className="text-lg font-bold text-green-600">
                  ₹{transactions.filter(t => t.direction === 'received' && t.status === 'success').reduce((s, t) => s + (t.amount || 0), 0).toLocaleString('en-IN')}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Showing</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{filtered.length} transactions</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm text-gray-500">No transactions found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && filtered.length > 0 && viewMode === 'list' && (
        <div className="flex flex-col gap-3">
          {filtered.map((transaction) => (
            <TransactionCard 
              key={transaction.id} 
              transaction={transaction}
              onClick={() => setSelectedTransaction(transaction)}
            />
          ))}
        </div>
      )}

      {/* Timeline View */}
      {!loading && !error && filtered.length > 0 && viewMode === 'timeline' && (
        <div className="space-y-6">
          {Object.values(filtered.reduce((groups, transaction) => {
            const formatDisplay = formatDateDisplay(transaction)
            const dateKey = formatDisplay.date
            
            if (!groups[dateKey]) {
              groups[dateKey] = {
                date: formatDisplay.date,
                day: formatDisplay.day,
                transactions: [],
                total: 0,
              }
            }
            
            groups[dateKey].transactions.push(transaction)
            groups[dateKey].total += transaction.amount
            
            return groups
          }, {})).map((group, idx) => (
            <div key={idx} className="space-y-3">
              <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 px-4 py-2 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className={`h-4 w-4 ${group.day ? 'text-blue-600' : 'text-green-600'}`} />
                    <span className={`font-semibold ${group.day ? 'text-blue-800' : 'text-green-800'}`}>
                      {group.date}
                    </span>
                    {group.day && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 italic">({group.day})</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {group.transactions.length} transaction{group.transactions.length > 1 ? 's' : ''} • 
                    Total: <span className="font-semibold">₹{group.total}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 pl-4">
                {group.transactions.map((transaction) => (
                  <Card key={transaction.id} className="ml-4">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <div className={`p-1.5 rounded-full ${transaction.direction === 'received' ? 'bg-green-100' : 'bg-red-100'}`}>
                            {transaction.direction === 'received'
                              ? <ArrowDownLeft className="h-3 w-3 text-green-600" />
                              : <ArrowUpRight className="h-3 w-3 text-red-500" />}
                          </div>
                          <div className="flex flex-col gap-1 flex-1">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {transaction.direction === 'received'
                                ? (transaction.sender_name || transaction.recipient_name)
                                : transaction.recipient_name}
                            </span>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDateDisplay(transaction).time}
                              </span>
                              <Badge variant={transaction.direction === 'received' ? 'success' : 'destructive'} className="text-xs">
                                {transaction.direction === 'received' ? 'Received' : 'Sent'}
                              </Badge>
                              <Badge variant={STATUS_VARIANT[transaction.status] || 'secondary'} className="text-xs">
                                {transaction.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold whitespace-nowrap ${transaction.direction === 'received' ? 'text-green-600' : 'text-red-500'}`}>
                            {transaction.direction === 'received' ? '+' : '-'}₹{transaction.amount}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTransaction(transaction)}
                            className="h-8 w-8 p-0"
                            title="View Receipt"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => fetchTransactions(pagination.page - 1, filter)}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {pagination.page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= totalPages}
            onClick={() => fetchTransactions(pagination.page + 1, filter)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Receipt Modal */}
      {selectedTransaction && (
        <TransactionReceipt
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}

      {/* Simulate Receive Money Modal */}
      {receiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-full">
                    <ArrowDownLeft className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Simulate Receive Money</h2>
                    <p className="text-xs text-gray-500">Record an incoming payment</p>
                  </div>
                </div>
                <button onClick={() => { setReceiveModal(false); setReceiveError(null) }} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
              </div>
              <form onSubmit={handleReceiveMoney} className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Sender Name *</label>
                  <Input
                    placeholder="e.g. Rahul Sharma"
                    value={receiveForm.sender_name}
                    onChange={(e) => setReceiveForm(f => ({ ...f, sender_name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Sender UPI ID (optional)</label>
                  <Input
                    placeholder="e.g. rahul@upi"
                    value={receiveForm.upi_id}
                    onChange={(e) => setReceiveForm(f => ({ ...f, upi_id: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Amount (₹) *</label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Enter amount"
                    value={receiveForm.amount}
                    onChange={(e) => setReceiveForm(f => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Note (optional)</label>
                  <Input
                    placeholder="e.g. For dinner"
                    value={receiveForm.note}
                    onChange={(e) => setReceiveForm(f => ({ ...f, note: e.target.value }))}
                  />
                </div>
                {receiveError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{receiveError}</p>
                )}
                <div className="flex gap-2 mt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setReceiveModal(false); setReceiveError(null) }}>Cancel</Button>
                  <Button type="submit" disabled={receiveLoading} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                    {receiveLoading ? 'Recording...' : 'Record Received'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
