import { useState } from 'react'
import { AlertCircle, CheckCircle, Clock, Pause, Play, Plus, Repeat, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FREQUENCIES, SubscriptionService, TransactionAPI } from '@/api/backend.js'

const FREQ_LABELS = {
  [FREQUENCIES.WEEKLY]: 'Weekly',
  [FREQUENCIES.MONTHLY]: 'Monthly',
  [FREQUENCIES.QUARTERLY]: 'Quarterly',
}

export default function Subscriptions() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    paymentMethod: 'upi_id',
    upiId: '',
    mobileNumber: '',
    recipientName: '',
    amount: '',
    frequency: FREQUENCIES.MONTHLY,
    note: '',
  })
  const [errors, setErrors] = useState([])
  const [paying, setPaying] = useState(null)

  const { data: subs } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => SubscriptionService.list(),
    staleTime: 5000,
  })

  const { data: due } = useQuery({
    queryKey: ['subscriptions-due'],
    queryFn: () => SubscriptionService.getDue(),
    staleTime: 10000,
  })

  function validate() {
    const nextErrors = []
    if (!form.name.trim()) nextErrors.push('Subscription name required')
    if (!form.recipientName.trim() || form.recipientName.trim().length < 2) nextErrors.push('Recipient name required')
    if (form.paymentMethod === 'upi_id' && !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(form.upiId)) nextErrors.push('Valid UPI ID required')
    if (form.paymentMethod === 'mobile_number' && !/^[6-9]\d{9}$/.test(form.mobileNumber)) nextErrors.push('Valid 10-digit mobile number required')
    if (!form.amount || Number.parseFloat(form.amount) <= 0) nextErrors.push('Valid amount required')
    setErrors(nextErrors)
    return nextErrors.length === 0
  }

  async function handleCreate(event) {
    event.preventDefault()
    if (!validate()) return
    await SubscriptionService.create({
      name: form.name.trim(),
      paymentMethod: form.paymentMethod,
      upiId: form.paymentMethod === 'upi_id' ? form.upiId.toLowerCase().trim() : null,
      mobileNumber: form.paymentMethod === 'mobile_number' ? form.mobileNumber : null,
      recipientName: form.recipientName.trim(),
      amount: Number.parseFloat(form.amount),
      frequency: form.frequency,
      note: form.note.trim(),
    })
    queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    queryClient.invalidateQueries({ queryKey: ['subscriptions-due'] })
    setShowForm(false)
    setForm({
      name: '',
      paymentMethod: 'upi_id',
      upiId: '',
      mobileNumber: '',
      recipientName: '',
      amount: '',
      frequency: FREQUENCIES.MONTHLY,
      note: '',
    })
  }

  async function handlePayNow(subscription) {
    setPaying(subscription.id)
    try {
      const paymentMethod = subscription.payment_method || (subscription.upi_id ? 'upi_id' : 'mobile_number')
      const transactionData = {
        payment_method: paymentMethod,
        ...(paymentMethod === 'upi_id'
          ? { upi_id: subscription.upi_id }
          : { mobile_number: subscription.mobile_number }),
        recipient_name: subscription.recipient_name,
        amount: subscription.amount,
        note: subscription.note || subscription.name,
      }
      const result = await TransactionAPI.create(transactionData)
      if (result.success) {
        await SubscriptionService.markPaid(subscription.id, result.data?.transaction_id || result.data?.id)
        queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
        queryClient.invalidateQueries({ queryKey: ['subscriptions-due'] })
      }
    } finally {
      setPaying(null)
    }
  }

  function isDue(subscription) {
    return subscription.is_active && new Date(subscription.next_due) <= new Date()
  }

  async function handleToggle(id) {
    await SubscriptionService.toggle(id)
    queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    queryClient.invalidateQueries({ queryKey: ['subscriptions-due'] })
  }

  async function handleDelete(id) {
    await SubscriptionService.delete(id)
    queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    queryClient.invalidateQueries({ queryKey: ['subscriptions-due'] })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Subscriptions</h1>
          <p className="text-sm text-gray-500">Manage recurring UPI payments with reminders</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1.5 h-4 w-4" /> New Subscription
        </Button>
      </div>

      {due?.data?.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <p className="font-semibold text-orange-800 dark:text-orange-200">{due.data.length} payment{due.data.length > 1 ? 's' : ''} due now</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {due.data.map((subscription) => (
              <button
                key={subscription.id}
                onClick={() => handlePayNow(subscription)}
                disabled={paying === subscription.id}
                className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {paying === subscription.id ? 'Paying...' : `Pay ${subscription.name} Rs. ${subscription.amount}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Recurring Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Subscription Name *</Label>
                <Input placeholder="e.g. Monthly Rent, Netflix, Electricity" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Payment Method</Label>
                <select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                  <option value="upi_id">UPI ID</option>
                  <option value="mobile_number">Mobile Number</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                {form.paymentMethod === 'upi_id' ? (
                  <>
                    <Label>UPI ID *</Label>
                    <Input placeholder="name@upi" value={form.upiId} onChange={(event) => setForm({ ...form, upiId: event.target.value })} />
                  </>
                ) : (
                  <>
                    <Label>Mobile Number *</Label>
                    <Input placeholder="9876543210" maxLength={10} value={form.mobileNumber} onChange={(event) => setForm({ ...form, mobileNumber: event.target.value.replace(/\D/g, '') })} />
                  </>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Recipient Name *</Label>
                <Input placeholder="Full name" value={form.recipientName} onChange={(event) => setForm({ ...form, recipientName: event.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Amount (INR) *</Label>
                <Input type="number" min="1" placeholder="0.00" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Frequency</Label>
                <select value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value })} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                  {Object.entries(FREQ_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Note</Label>
                <Input placeholder="What's this for?" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
              </div>
              {errors.length > 0 && (
                <ul className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400 sm:col-span-2">
                  {errors.map((message) => (
                    <li key={message}>- {message}</li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" className="flex-1">
                  <Repeat className="mr-1.5 h-4 w-4" /> Create Subscription
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {subs?.data?.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {subs.data.map((subscription) => (
            <Card key={subscription.id} className={isDue(subscription) ? 'border-orange-300 dark:border-orange-700' : ''}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{subscription.name}</p>
                    <p className="text-xs text-gray-500">{subscription.recipient_name} - {subscription.upi_id || subscription.mobile_number}</p>
                  </div>
                  <Badge variant={subscription.is_active ? 'success' : 'secondary'}>
                    {subscription.is_active ? 'Active' : 'Paused'}
                  </Badge>
                </div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">Rs. {subscription.amount}</p>
                    <p className="text-xs text-gray-400">{FREQ_LABELS[subscription.frequency]}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Next due</p>
                    <p className={`text-xs font-medium ${isDue(subscription) ? 'text-orange-600' : 'text-gray-700 dark:text-gray-300'}`}>
                      {new Date(subscription.next_due).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {isDue(subscription) && (
                    <Button size="sm" className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={() => handlePayNow(subscription)} disabled={paying === subscription.id}>
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" />{paying === subscription.id ? 'Paying...' : 'Pay Now'}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleToggle(subscription.id)}>
                    {subscription.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(subscription.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
                {subscription.payment_history?.length > 0 && (
                  <p className="mt-2 text-xs text-gray-400"><Clock className="mr-1 inline h-3 w-3" />{subscription.payment_history.length} payments made</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <Repeat className="h-12 w-12" />
          <p className="text-sm">No subscriptions yet. Create your first recurring payment.</p>
        </div>
      )}
    </div>
  )
}
