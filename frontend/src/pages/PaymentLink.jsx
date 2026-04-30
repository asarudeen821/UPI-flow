import { useState } from 'react'
import { Copy, ExternalLink, Link2, Share2, ToggleRight, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import QRCodeComp from '@/components/QRCode'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PaymentLinkService } from '@/api/services/paymentLinkService.js'
import { buildUPIString } from '@/api/services/qrService.js'

export default function PaymentLink() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    amount: '',
    description: '',
    recipientName: '',
    upiId: '',
    expiresInHours: '24',
    maxUses: '',
    isPermanent: false,
  })
  const [generated, setGenerated] = useState(null)
  const [errors, setErrors] = useState([])
  const [copied, setCopied] = useState(null)

  const { data: links } = useQuery({
    queryKey: ['payment-links'],
    queryFn: () => PaymentLinkService.list(),
    staleTime: 5000,
  })

  // Extract payment links from response (handle both old and new structure)
  const paymentLinks = links?.data?.items || links?.data || []

  function validate() {
    const nextErrors = []
    if (!form.recipientName || form.recipientName.trim().length < 2) nextErrors.push('Recipient name required')
    if (!form.upiId || !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(form.upiId)) nextErrors.push('Valid UPI ID required')
    setErrors(nextErrors)
    return nextErrors.length === 0
  }

  async function handleCreate(event) {
    event.preventDefault()
    if (!validate()) return

    console.log('[PaymentLink] Creating with params:', {
      amount: form.amount,
      description: form.description,
      recipientName: form.recipientName,
      upiId: form.upiId,
      expiresInHours: form.expiresInHours,
      maxUses: form.maxUses,
      isPermanent: form.isPermanent,
    })

    const result = await PaymentLinkService.create({
      amount: form.amount ? Number.parseFloat(form.amount) : null,
      description: form.description,
      recipientName: form.recipientName.trim(),
      upiId: form.upiId.toLowerCase().trim(),
      expiresInHours: form.isPermanent ? null : (Number.parseInt(form.expiresInHours, 10) || 24),
      maxUses: form.isPermanent ? null : (form.maxUses ? Number.parseInt(form.maxUses, 10) : null),
      isPermanent: form.isPermanent,
    })

    if (result.success) {
      console.log('[PaymentLink] Link created successfully:', result.data)
      console.log('[PaymentLink] URL:', result.data.url)
      setGenerated(result.data)
      queryClient.invalidateQueries({ queryKey: ['payment-links'] })
    } else {
      console.error('[PaymentLink] Failed to create:', result.error)
    }
  }

  function handleCopy(text, id) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  function handleShare(link) {
    const text = `Pay ${link.recipient_name}${link.amount ? ` Rs. ${link.amount}` : ''}\n${
      link.description ? `${link.description}\n` : ''
    }${link.url}`
    if (navigator.share) {
      navigator.share({ title: 'Payment Link', text, url: link.url })
    } else {
      handleCopy(text, `share_${link.id}`)
    }
  }

  async function handleDeactivate(id) {
    await PaymentLinkService.deactivate(id)
    queryClient.invalidateQueries({ queryKey: ['payment-links'] })
  }

  async function handleDelete(id) {
    await PaymentLinkService.delete(id)
    queryClient.invalidateQueries({ queryKey: ['payment-links'] })
    if (generated?.id === id) setGenerated(null)
  }

  function isExpired(link) {
    // Permanent links never expire
    if (link.is_permanent) return false
    
    // Check if expires_at exists and is valid
    if (!link.expires_at) return false
    
    // Check if status is explicitly inactive
    if (link.status === 'inactive' || link.is_active === false) return true
    
    // Check if expiration date is in the past
    return new Date(link.expires_at) < new Date()
  }

  function getStatusBadge(link) {
    // Permanent links are always active
    if (link.is_permanent) {
      return <Badge variant="success">Permanent</Badge>
    }
    
    // Check if explicitly inactive
    if (link.status === 'inactive' || link.is_active === false) {
      return <Badge variant="destructive">Inactive</Badge>
    }
    
    // Check if expired
    if (isExpired(link)) {
      return <Badge variant="destructive">Expired</Badge>
    }
    
    // Check if max uses reached
    if (link.max_uses && link.use_count >= link.max_uses) {
      return <Badge variant="destructive">Max Uses Reached</Badge>
    }
    
    // Otherwise active
    return <Badge variant="success">Active</Badge>
  }

  const qrValue = generated
    ? buildUPIString({
        upiId: generated.upi_id,
        name: generated.recipient_name,
        amount: generated.amount,
        note: generated.description,
        transactionRef: generated.slug,
      })
    : ''

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Payment Link Builder</h1>
        <p className="text-sm text-gray-500">Create shareable payment links for WhatsApp, SMS, storefronts, and invoices</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Payment Link</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Your UPI ID *</Label>
                <Input placeholder="merchant@upi" value={form.upiId} onChange={(event) => setForm({ ...form, upiId: event.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Your Name / Business *</Label>
                <Input placeholder="Shop name or your name" value={form.recipientName} onChange={(event) => setForm({ ...form, recipientName: event.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Amount (INR)</Label>
                <Input type="number" min="1" placeholder="Leave blank for customer to enter" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Description</Label>
                <Input placeholder="Invoice #123, product name..." value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPermanent"
                    checked={form.isPermanent}
                    onChange={(event) => setForm({ ...form, isPermanent: event.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                  <Label htmlFor="isPermanent" className="cursor-pointer">Permanent Link (No Expiration)</Label>
                </div>
                <p className="text-xs text-gray-500 ml-6">Permanent links don't expire and can be used multiple times</p>
              </div>
              {!form.isPermanent && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Expires In</Label>
                    <select value={form.expiresInHours} onChange={(event) => setForm({ ...form, expiresInHours: event.target.value })} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                      <option value="1">1 hour</option>
                      <option value="24">24 hours</option>
                      <option value="72">3 days</option>
                      <option value="168">7 days</option>
                      <option value="720">30 days</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Max Uses</Label>
                    <Input type="number" min="1" placeholder="Unlimited" value={form.maxUses} onChange={(event) => setForm({ ...form, maxUses: event.target.value })} />
                  </div>
                </div>
              )}
              {errors.length > 0 && (
                <ul className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                  {errors.map((message) => (
                    <li key={message}>- {message}</li>
                  ))}
                </ul>
              )}
              <Button type="submit" className="w-full">
                <Link2 className="mr-2 h-4 w-4" /> Generate Payment Link
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated Link</CardTitle>
          </CardHeader>
          <CardContent>
            {generated ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-950">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-blue-600">Your Payment Link</p>
                  <p className="break-all font-mono text-sm text-blue-800 dark:text-blue-200">{generated.url}</p>
                </div>
                <div className="flex justify-center">
                  <QRCodeComp value={qrValue} />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Recipient:</span><span className="font-medium text-gray-900 dark:text-gray-100">{generated.recipient_name}</span></div>
                  {generated.amount && <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Amount:</span><span className="font-bold text-blue-600 dark:text-blue-400">Rs. {generated.amount}</span></div>}
                  {generated.description && <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Description:</span><span className="text-gray-900 dark:text-gray-100">{generated.description}</span></div>}
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Type:</span>
                    <span className={generated.is_permanent ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-700 dark:text-gray-300'}>
                      {generated.is_permanent ? 'Permanent (No Expiry)' : 'Temporary'}
                    </span>
                  </div>
                  {!generated.is_permanent && (
                    <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Expires:</span><span className="text-xs text-gray-900 dark:text-gray-100">{new Date(generated.expires_at).toLocaleString('en-IN')}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Uses:</span><span className="text-gray-900 dark:text-gray-100">{generated.use_count}{generated.max_uses ? ` / ${generated.max_uses}` : ' / Unlimited'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Created:</span><span className="text-xs text-gray-900 dark:text-gray-100">{generated.formatted_date} ({generated.formatted_day}) {generated.formatted_time}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleCopy(generated.url, generated.id)}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />{copied === generated.id ? 'Copied!' : 'Copy Link'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleShare(generated)}>
                    <Share2 className="mr-1.5 h-3.5 w-3.5" />Share
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
                <Link2 className="h-12 w-12" />
                <p className="text-sm">Fill the form to generate a payment link</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {paymentLinks.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your Payment Links ({paymentLinks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y dark:divide-gray-800">
              {paymentLinks.map((link) => (
                <div key={link.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{link.recipient_name}</p>
                      {link.amount && <span className="text-sm font-bold text-blue-600 dark:text-blue-400">Rs. {link.amount}</span>}
                    </div>
                    <p className="truncate text-xs text-gray-400">{link.url}</p>
                    <p className="text-xs text-gray-400">
                      {link.use_count} uses - {link.is_permanent ? 'Permanent (No Expiry)' : `Expires ${new Date(link.expires_at).toLocaleDateString('en-IN')}`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Created: {link.formatted_date} ({link.formatted_day}) at {link.formatted_time}
                    </p>
                  </div>
                  <div className="ml-2 flex items-center gap-1">
                    {getStatusBadge(link)}
                    <button onClick={() => handleCopy(link.url, link.id)} className="rounded p-1 text-gray-400 hover:text-blue-600" title="Copy">
                      <Copy className="h-4 w-4" />
                    </button>
                    <button onClick={() => setGenerated(link)} className="rounded p-1 text-gray-400 hover:text-blue-600" title="View">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    {!link.is_permanent && link.is_active && !isExpired(link) && (
                      <button onClick={() => handleDeactivate(link.id)} className="rounded p-1 text-gray-400 hover:text-yellow-600" title="Deactivate">
                        <ToggleRight className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(link.id)} className="rounded p-1 text-gray-400 hover:text-red-600" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Link2 className="h-16 w-16 text-gray-300 dark:text-gray-700" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No Payment Links Yet</p>
                <p className="text-xs text-gray-500 mt-1">Create your first payment link to see it here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
