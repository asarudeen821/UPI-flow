import { useState } from 'react'
import { Webhook, Save, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { WebhookService, GatewayService, GATEWAYS, FraudService } from '@/api/backend.js'

const STATUS_ICON = {
  delivered: <CheckCircle className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  skipped: <AlertTriangle className="h-4 w-4 text-gray-400" />,
}

export default function Developer() {
  const qc = useQueryClient()
  const [webhookForm, setWebhookForm] = useState(() => WebhookService.getConfig() || { url: '', secret: '' })
  const [saved, setSaved] = useState(false)
  const [activeGateway, setActiveGateway] = useState(() => GatewayService.getActiveGateway())
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)

  const { data: webhookLog } = useQuery({
    queryKey: ['webhook-log'],
    queryFn: () => WebhookService.getLog(),
    staleTime: 5000,
    refetchInterval: 10000,
  })

  const { data: fraudLog } = useQuery({
    queryKey: ['fraud-log'],
    queryFn: () => FraudService.getFraudLog(),
    staleTime: 5000,
  })

  const gateways = GatewayService.getGatewayMeta()

  function handleSaveWebhook(e) {
    e.preventDefault()
    WebhookService.saveConfig({ url: webhookForm.url, secret: webhookForm.secret })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleGatewayChange(id) {
    GatewayService.setActiveGateway(id)
    setActiveGateway(id)
  }

  async function handleTestWebhook() {
    setTesting(true)
    setTestResult(null)
    const result = await WebhookService.emit('payment.test', {
      transaction_id: `TEST_${Date.now()}`,
      amount: 1,
      status: 'success',
      timestamp: new Date().toISOString(),
    })
    setTestResult(result)
    setTesting(false)
    qc.invalidateQueries({ queryKey: ['webhook-log'] })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Developer Tools</h1>
        <p className="text-sm text-gray-500">Webhooks, multi-gateway config, fraud logs, and API reference</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Webhook Config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5" /> Webhook Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveWebhook} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Webhook URL</Label>
                <Input placeholder="https://yourapp.com/webhook" value={webhookForm.url} onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })} />
                <p className="text-xs text-gray-400">POST requests will be sent here on payment events</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Secret Key <span className="text-gray-400 text-xs">for HMAC-SHA256 signature</span></Label>
                <Input type="password" placeholder="your-webhook-secret" value={webhookForm.secret} onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Save className="mr-1.5 h-4 w-4" />{saved ? 'Saved!' : 'Save Config'}
                </Button>
                <Button type="button" variant="outline" onClick={handleTestWebhook} disabled={testing || !webhookForm.url}>
                  {testing ? 'Sending...' : 'Test'}
                </Button>
              </div>
              {testResult && (
                <div className={`rounded-lg p-3 text-sm ${testResult.success ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
                  {testResult.skipped ? 'No URL configured' : testResult.success ? '✓ Webhook delivered successfully' : `✗ Delivery failed: ${testResult.entry?.response}`}
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Multi-Gateway */}
        <Card>
          <CardHeader><CardTitle>Payment Gateway</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {gateways.map((gw) => (
                <div key={gw.id} onClick={() => gw.status === 'available' && handleGatewayChange(gw.id)}
                  className={`flex items-center gap-3 rounded-xl border-2 p-3 transition-all ${gw.status === 'coming_soon' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${activeGateway === gw.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'}`}>
                  <span className="text-2xl">{gw.logo}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{gw.name}</p>
                      {gw.status === 'coming_soon' && <Badge variant="secondary">Coming Soon</Badge>}
                      {activeGateway === gw.id && <Badge variant="success">Active</Badge>}
                    </div>
                    <p className="text-xs text-gray-500">{gw.description}</p>
                    <p className="text-xs text-gray-400">{gw.fees} · {gw.supported.join(', ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Reference */}
      <Card>
        <CardHeader><CardTitle>Developer API Reference</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { method: 'POST', path: '/api/transactions', desc: 'Create a new payment transaction' },
              { method: 'GET', path: '/api/transactions', desc: 'List transactions with pagination & filters' },
              { method: 'GET', path: '/api/transactions/:id', desc: 'Get single transaction by ID' },
              { method: 'GET', path: '/api/auth/me', desc: 'Get current authenticated user' },
              { method: 'POST', path: '/api/auth/logout', desc: 'Logout current session' },
              { method: 'GET', path: '/api/health', desc: 'Health check endpoint' },
              { method: 'GET', path: '/api/settings/public', desc: 'Get public app settings' },
            ].map((api, index) => (
              <div key={`${api.method}-${api.path}-${index}`} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <Badge variant={api.method === 'POST' ? 'default' : 'secondary'} className="font-mono text-xs w-12 justify-center">{api.method}</Badge>
                <code className="flex-1 text-sm font-mono text-gray-800 dark:text-gray-200">{api.path}</code>
                <span className="text-xs text-gray-500 hidden sm:block">{api.desc}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-gray-900 p-4 text-xs text-green-400 font-mono">
            <p className="text-gray-400 mb-2"># Example: Create payment</p>
            <p>curl -X POST http://localhost:3000/api/transactions \</p>
            <p className="pl-4">-H "Content-Type: application/json" \</p>
            <p className="pl-4">-d '{`{"payment_method":"upi_id","upi_id":"name@upi","recipient_name":"John","amount":500}`}'</p>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Log */}
      <Card>
        <CardHeader><CardTitle>Webhook Delivery Log</CardTitle></CardHeader>
        <CardContent>
          {webhookLog?.length > 0 ? (
            <div className="divide-y dark:divide-gray-800 max-h-64 overflow-y-auto">
              {webhookLog.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 py-2.5">
                  {STATUS_ICON[entry.status] || STATUS_ICON.pending}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-gray-800 dark:text-gray-200">{entry.event}</p>
                    <p className="text-xs text-gray-400">{new Date(entry.timestamp).toLocaleString('en-IN')} · {entry.attempts} attempt{entry.attempts !== 1 ? 's' : ''} · {entry.response}</p>
                  </div>
                  <Badge variant={entry.status === 'delivered' ? 'success' : entry.status === 'failed' ? 'destructive' : 'secondary'}>{entry.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No webhook events yet</p>
          )}
        </CardContent>
      </Card>

      {/* Fraud Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" /> Fraud Detection Log</CardTitle>
            <button onClick={() => { FraudService.clearFraudLog(); qc.invalidateQueries({ queryKey: ['fraud-log'] }) }} className="text-xs text-gray-400 hover:text-red-500">Clear</button>
          </div>
        </CardHeader>
        <CardContent>
          {fraudLog?.length > 0 ? (
            <div className="divide-y dark:divide-gray-800 max-h-64 overflow-y-auto">
              {fraudLog.map((entry, i) => (
                <div key={i} className="py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-400">{new Date(entry.timestamp).toLocaleString('en-IN')}</p>
                    <Badge variant={entry.riskScore >= 60 ? 'destructive' : 'secondary'}>Risk: {entry.riskScore}</Badge>
                  </div>
                  <ul className="space-y-0.5">
                    {entry.flags.map((f, j) => <li key={j} className="text-xs text-orange-600 dark:text-orange-400">⚠ {f}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No fraud flags detected</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
