import { useState } from 'react'
import { Copy, Eye, QrCode, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import QRCodeComp from '@/components/QRCode'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QRService } from '@/api/services/qrService.js'

export default function QRGenerator() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    upiId: '',
    recipientName: '',
    amount: '',
    note: '',
    expiresInHours: '24',
    isPermanent: false,
  })
  const [generated, setGenerated] = useState(null)
  const [errors, setErrors] = useState([])
  const [copied, setCopied] = useState(false)

  const { data: qrList } = useQuery({
    queryKey: ['qr-list'],
    queryFn: () => QRService.list(),
    staleTime: 5000,
  })

  // Extract QR codes from response (handle both old and new structure)
  const qrCodes = qrList?.data?.items || qrList?.data || []

  function validate() {
    const nextErrors = []
    if (!form.upiId || !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(form.upiId)) {
      nextErrors.push('Valid UPI ID required (e.g. name@upi)')
    }
    if (!form.recipientName || form.recipientName.trim().length < 2) {
      nextErrors.push('Recipient name required')
    }
    setErrors(nextErrors)
    return nextErrors.length === 0
  }

  async function handleGenerate(event) {
    event.preventDefault()
    if (!validate()) return

    const result = await QRService.create({
      upiId: form.upiId.toLowerCase().trim(),
      recipientName: form.recipientName.trim(),
      amount: form.amount ? Number.parseFloat(form.amount) : null,
      note: form.note.trim(),
      expiresInHours: form.isPermanent ? null : (Number.parseInt(form.expiresInHours, 10) || 24),
      isPermanent: form.isPermanent,
    })

    if (result.success) {
      console.log('[QRGenerator] QR Code created:', result.data)
      console.log('[QRGenerator] UPI String:', result.data.upi_string)
      setGenerated(result.data)
      queryClient.invalidateQueries({ queryKey: ['qr-list'] })
    } else {
      console.error('[QRGenerator] Failed to create QR code:', result.error)
    }
  }

  async function handleDelete(id) {
    await QRService.delete(id)
    queryClient.invalidateQueries({ queryKey: ['qr-list'] })
    if (generated?.id === id) setGenerated(null)
  }

  function handleCopy(text) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function isExpired(qr) {
    // Permanent QR codes never expire
    if (qr.is_permanent) return false
    
    // Check if expires_at exists and is valid
    if (!qr.expires_at) return false
    
    // Check if status is explicitly inactive
    if (qr.status === 'inactive' || qr.is_active === false) return true
    
    // Check if expiration date is in the past
    return new Date(qr.expires_at) < new Date()
  }

  function getStatusBadge(qr) {
    // Permanent QR codes are always active
    if (qr.is_permanent) {
      return <Badge variant="success">Permanent</Badge>
    }
    
    // Check if explicitly inactive
    if (qr.status === 'inactive' || qr.is_active === false) {
      return <Badge variant="destructive">Inactive</Badge>
    }
    
    // Check if expired
    if (isExpired(qr)) {
      return <Badge variant="destructive">Expired</Badge>
    }
    
    // Otherwise active
    return <Badge variant="success">Active</Badge>
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">QR Code Generator</h1>
        <p className="text-sm text-gray-500">Generate dynamic UPI QR codes with expiry and tracking</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create QR Code</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>UPI ID *</Label>
                <Input placeholder="merchant@upi" value={form.upiId} onChange={(event) => setForm({ ...form, upiId: event.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Recipient Name *</Label>
                <Input placeholder="Business / Person name" value={form.recipientName} onChange={(event) => setForm({ ...form, recipientName: event.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Amount (INR)</Label>
                <Input type="number" min="1" placeholder="0.00" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Note</Label>
                <Input placeholder="Order ID, description..." value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
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
                  <Label htmlFor="isPermanent" className="cursor-pointer">Permanent QR Code (No Expiration)</Label>
                </div>
                <p className="text-xs text-gray-500 ml-6">Permanent QR codes don't expire and can be used indefinitely</p>
              </div>
              {!form.isPermanent && (
                <div className="flex flex-col gap-1.5">
                  <Label>Expires In</Label>
                  <select
                    value={form.expiresInHours}
                    onChange={(event) => setForm({ ...form, expiresInHours: event.target.value })}
                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  >
                    <option value="1">1 hour</option>
                    <option value="6">6 hours</option>
                    <option value="24">24 hours</option>
                    <option value="72">3 days</option>
                    <option value="168">7 days</option>
                  </select>
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
                <QrCode className="mr-2 h-4 w-4" /> Generate QR Code
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QR Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {generated ? (
              <div className="flex flex-col items-center gap-4">
                {/* Try SVG QR Code first, fallback to image URL */}
                {generated.upi_string ? (
                  <QRCodeComp value={generated.upi_string} />
                ) : generated.qr_image_url ? (
                  <img 
                    src={generated.qr_image_url} 
                    alt="QR Code" 
                    className="w-[220px] h-[220px] rounded-lg border"
                  />
                ) : (
                  <div className="text-sm text-gray-500">QR code data not available</div>
                )}
                <div className="w-full space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">UPI ID:</span>
                    <span className="font-mono text-gray-900 dark:text-gray-100">{generated.upi_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Recipient:</span>
                    <span className="text-gray-900 dark:text-gray-100">{generated.recipient_name}</span>
                  </div>
                  {generated.amount && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">Rs. {generated.amount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Type:</span>
                    <span className={generated.is_permanent ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-700 dark:text-gray-300'}>
                      {generated.is_permanent ? 'Permanent (No Expiry)' : 'Temporary'}
                    </span>
                  </div>
                  {!generated.is_permanent && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Expires:</span>
                      <span className="text-xs text-gray-900 dark:text-gray-100">{new Date(generated.expires_at).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Ref:</span>
                    <span className="font-mono text-xs text-gray-900 dark:text-gray-100">{generated.ref}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Created:</span>
                    <span className="text-xs text-gray-900 dark:text-gray-100">{generated.formatted_date} ({generated.formatted_day}) {generated.formatted_time}</span>
                  </div>
                </div>
                <div className="flex w-full gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleCopy(generated.upi_string)}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    {copied ? 'Copied!' : 'Copy UPI Link'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
                <QrCode className="h-12 w-12" />
                <p className="text-sm">Fill the form and generate a QR code</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {qrCodes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Generated QR Codes ({qrCodes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y dark:divide-gray-800">
              {qrCodes.map((qr) => (
                <div key={qr.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded border bg-white p-1">
                      <QRCodeComp className="border-0 p-0 shadow-none" size={48} value={qr.upi_string} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{qr.recipient_name} - {qr.upi_id}</p>
                      <p className="text-xs text-gray-400">
                        {qr.amount ? `Rs. ${qr.amount}` : 'Open amount'} - Ref: {qr.ref} - <Eye className="inline h-3 w-3" /> {qr.scan_count}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Created: {qr.formatted_date} ({qr.formatted_day}) at {qr.formatted_time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(qr)}
                    <button onClick={() => setGenerated(qr)} className="rounded p-1 text-gray-400 hover:text-blue-600">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(qr.id)} className="rounded p-1 text-gray-400 hover:text-red-600">
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
              <QrCode className="h-16 w-16 text-gray-300 dark:text-gray-700" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No QR Codes Yet</p>
                <p className="text-xs text-gray-500 mt-1">Generate your first QR code to see it here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
