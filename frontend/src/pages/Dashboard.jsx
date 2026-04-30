import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import {
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  Clock,
  CreditCard,
  Link2,
  QrCode,
  RefreshCw,
  Repeat,
  TrendingUp,
  XCircle,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AnalyticsService } from '@/api/backend.js'
import { useAuth } from '@/lib/useAuth'
import { useEffect } from 'react'

const AIAnalyticsInsights = lazy(() => import('@/components/AIAnalyticsInsights'))

function StatCard({ icon, label, value, sub, color = 'blue', loading }) {
  const IconComponent = icon
  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400',
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`rounded-xl p-3 ${colors[color]}`}>
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          {loading ? (
            <div className="mt-1 h-6 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          ) : (
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          )}
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function MiniBar({ data }) {
  if (!data?.length) return null
  const max = Math.max(...data.map((item) => item.amount), 1)
  return (
    <div className="flex h-16 items-end gap-1">
      {data.map((item) => (
        <div key={item.date} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-blue-500 transition-all dark:bg-blue-400"
            style={{ height: `${Math.max((item.amount / max) * 48, 2)}px` }}
            title={`${item.date}: Rs. ${item.amount}`}
          />
          <span className="w-full truncate text-center text-[9px] text-gray-400">{item.date}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      console.log('[Dashboard] Fetching analytics overview...')
      const result = await AnalyticsService.overview({ days: 7, limit: 5 })
      console.log('[Dashboard] Analytics data received:', result)
      return result.data
    },
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
  })

  const fmt = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`

  const handleRefresh = async () => {
    console.log('[Dashboard] Manual refresh triggered')
    try {
      const result = await refetch()
      console.log('[Dashboard] Refresh complete:', result)
    } catch (error) {
      console.error('[Dashboard] Refresh failed:', error.message)
    }
  }

  // Auto-refresh when live payment events arrive (Socket.IO relays custom events globally)
  useEffect(() => {
    const handler = () => refetch()
    window.addEventListener('transaction:update', handler)
    window.addEventListener('payment:notification', handler)
    window.addEventListener('stats:update', handler)
    return () => {
      window.removeEventListener('transaction:update', handler)
      window.removeEventListener('payment:notification', handler)
      window.removeEventListener('stats:update', handler)
    }
  }, [refetch])

  const isRefreshing = isLoading || isRefetching

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {user?.name || 'Merchant'}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Total Revenue"
          value={fmt(data?.stats?.total?.amount)}
          sub={`${data?.stats?.total?.count || 0} transactions`}
          color="blue"
          loading={isLoading}
        />
        <StatCard
          icon={CheckCircle}
          label="Today's Earnings"
          value={fmt(data?.stats?.today?.amount)}
          sub={`${data?.stats?.today?.count || 0} payments`}
          color="green"
          loading={isLoading}
        />
        <StatCard
          icon={XCircle}
          label="Failed Payments"
          value={data?.stats?.failed?.count ?? 0}
          sub="Needs attention"
          color="red"
          loading={isLoading}
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={data?.stats?.pending?.count ?? 0}
          sub="Awaiting confirmation"
          color="yellow"
          loading={isLoading}
        />
      </div>

      {/* AI Insights Section */}
      <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-gray-100" />}>
        <AIAnalyticsInsights />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">7-Day Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            ) : (
              <MiniBar data={data?.chart} />
            )}
            <div className="mt-3 flex justify-between text-xs text-gray-400">
              <span>This week: {fmt(data?.stats?.week?.amount)}</span>
              <span>This month: {fmt(data?.stats?.month?.amount)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Recipients</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-8 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                ))}
              </div>
            ) : data?.topRecipients?.length ? (
              <ul className="space-y-2">
                {data.topRecipients.map((recipient) => (
                  <li key={recipient.recipient} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{recipient.name}</p>
                      <p className="text-xs text-gray-400">
                        {recipient.recipient} - {recipient.count} payments
                      </p>
                    </div>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{fmt(recipient.total)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { to: '/create-payment', icon: CreditCard, label: 'Live Checkout', color: 'bg-indigo-600 text-white hover:bg-indigo-700' },
          { to: '/payment', icon: ArrowUpRight, label: 'Send Money', color: 'bg-blue-600 text-white hover:bg-blue-700' },
          { to: '/qr-generator', icon: QrCode, label: 'Generate QR', color: 'bg-purple-600 text-white hover:bg-purple-700' },
          { to: '/payment-link', icon: Link2, label: 'Payment Link', color: 'bg-green-600 text-white hover:bg-green-700' },
          { to: '/subscriptions', icon: Repeat, label: 'Subscriptions', color: 'bg-orange-600 text-white hover:bg-orange-700' },
        ].map((item) => (
          <Link key={item.to} to={item.to} className={`flex items-center gap-3 rounded-xl p-4 font-medium transition-colors ${item.color}`}>
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <Link to="/transactions" className="text-sm text-blue-600 hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-12 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : data?.recent?.length ? (
            <ul className="divide-y dark:divide-gray-800">
              {data.recent.map((transaction) => (
                <li key={transaction.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-full ${transaction.direction === 'received' ? 'bg-green-100' : 'bg-red-100'}`}>
                      {transaction.direction === 'received'
                        ? <ArrowDownLeft className="h-3 w-3 text-green-600" />
                        : <ArrowUpRight className="h-3 w-3 text-red-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {transaction.direction === 'received'
                          ? (transaction.sender_name || transaction.recipient_name)
                          : transaction.recipient_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {transaction.upi_id || transaction.mobile_number} -{' '}
                        {new Date(transaction.created_date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${transaction.direction === 'received' ? 'text-green-600' : 'text-red-500'}`}>
                      {transaction.direction === 'received' ? '+' : '-'}Rs. {transaction.amount}
                    </span>
                    <Badge
                      variant={
                        transaction.status === 'success'
                          ? 'success'
                          : transaction.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {transaction.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No transactions yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
