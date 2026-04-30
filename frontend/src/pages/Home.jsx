import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Zap, Shield, Clock, TrendingUp, Users } from 'lucide-react'
import FeatureCard from '@/components/FeatureCard'
import { TransactionAPI } from '@/api/backend.js'
import { useAuth } from '@/lib/useAuth'
import { useRecipients } from '@/lib/useRecipients'
import RecipientCard from '@/components/RecipientCard'
import { Button } from '@/components/ui/button'

const FEATURES = [
  { icon: Zap, title: 'Instant Transfers', description: 'Send money in seconds via UPI or mobile number.' },
  { icon: Shield, title: 'Bank-Grade Security', description: 'End-to-end encrypted transactions you can trust.' },
  { icon: Clock, title: 'Transaction History', description: 'Full history with search and filter capabilities.' },
]

function StatCard({ label, value, loading }) {
  return (
    <div className="rounded-xl border bg-white p-5 text-center shadow-sm dark:bg-gray-900">
      {loading ? (
        <div className="mx-auto mb-1 h-7 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      ) : (
        <p className="text-2xl font-bold text-blue-600">{value}</p>
      )}
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { recipients, loading: recipientsLoading } = useRecipients()

  // Get top 3 most used recipients
  const quickRecipients = recipients
    .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
    .slice(0, 3)

  function handleQuickPay(recipient) {
    const params = new URLSearchParams({
      mode: recipient.payment_method,
      [recipient.payment_method]: recipient.payment_method === 'upi_id' ? recipient.upi_id : recipient.mobile_number,
      name: recipient.name,
      recipientId: recipient.id
    })
    navigate(`/payment?${params.toString()}`)
  }

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['transaction-stats'],
    queryFn: async () => {
      // Get all transactions in one call and calculate stats locally
      const all = await TransactionAPI.list({ limit: 100 })
      const items = all.data || []
      return {
        total: all.pagination?.total ?? 0,
        success: items.filter(t => t.status === 'success').length,
        pending: items.filter(t => t.status === 'pending').length,
      }
    },
    staleTime: 1000 * 60, // Cache for 1 minute
    refetchInterval: 1000 * 60, // Refetch every minute
  })

  return (
    <div className="flex flex-col gap-16">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 py-16 text-center">
        {user && (
          <p className="rounded-full bg-blue-50 px-4 py-1 text-sm text-blue-600 dark:bg-blue-950 dark:text-blue-300">
            Welcome back, {user.name || user.email} 👋
          </p>
        )}
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">
          Fast & Secure Payments
        </h1>
        <h2 className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
          Pay Anyone, Anywhere Instantly with UPI
        </h2>
        <p className="max-w-xl text-lg text-gray-500 dark:text-gray-400">
          Send money instantly using UPI ID or mobile number. Simple, safe, and reliable.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/payment"
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Send Money
          </Link>
          <Link
            to="/transactions"
            className="rounded-lg border px-6 py-3 font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            View History
          </Link>
          <Link
            to="/payment#smart"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-indigo-700"
          >
            <img src="/upiflow-logo.png" alt="UPIFlow" className="h-6 w-6" />
            Smart UPI Pay
          </Link>
        </div>
      </section>

      {/* Quick Recipients */}
      {!recipientsLoading && quickRecipients.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Quick Pay
              </h2>
            </div>
            <Link to="/recipients">
              <Button variant="ghost" size="sm" className="text-xs">
                View All
              </Button>
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickRecipients.map((recipient) => (
              <div key={recipient.id} onClick={() => handleQuickPay(recipient)} className="cursor-pointer">
                <RecipientCard recipient={recipient} onPay={handleQuickPay} showActions={false} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Live Stats */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Your Activity</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Transactions" value={statsData?.total ?? 0} loading={statsLoading} />
          <StatCard label="Successful" value={statsData?.success ?? 0} loading={statsLoading} />
          <StatCard label="Pending" value={statsData?.pending ?? 0} loading={statsLoading} />
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="mb-6 text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Why Choose Us
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-2xl bg-blue-600 px-8 py-12 text-center text-white">
        <h2 className="mb-2 text-2xl font-bold">Ready to get started?</h2>
        <p className="mb-6 text-blue-100">Secure, instant payments powered by UPI.</p>
        <Link
          to="/payment"
          className="inline-block rounded-lg bg-white px-6 py-3 font-medium text-blue-600 hover:bg-blue-50"
        >
          Make a Payment
        </Link>
      </section>
    </div>
  )
}
