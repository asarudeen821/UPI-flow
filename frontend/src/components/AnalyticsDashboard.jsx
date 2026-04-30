import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Activity, Calendar, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

import { TransactionAPI } from '@/api/backend.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function AnalyticsDashboard({ userId, days = 30 }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState(days)

  useEffect(() => {
    fetchAnalytics()
  }, [userId, selectedPeriod])

  async function fetchAnalytics() {
    setLoading(true)
    setError(null)
    try {
      const result = await TransactionAPI.getAnalytics(userId, { days: selectedPeriod })
      
      if (result.success) {
        setAnalytics(result.data)
      } else {
        setError(result.error || 'Failed to load analytics')
      }
    } catch (err) {
      setError(err.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-red-600">
            <p className="font-medium">Error loading analytics</p>
            <Button variant="outline" size="sm" onClick={fetchAnalytics}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) return null

  // Prepare chart data
  const chartData = analytics.chartData?.map(item => ({
    name: item.date,
    amount: item.amount,
    count: item.count,
  })) || []

  // Prepare category data for pie chart
  const categoryData = Object.entries(analytics.categoryWise || {})
    .map(([name, data], index) => ({
      name,
      value: data.total,
      count: data.count,
      color: COLORS[index % COLORS.length],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5) // Top 5 categories

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">
            Track your spending and income patterns
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 15, 30, 90].map(period => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
            >
              {period}D
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Sent */}
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <ArrowUpRight className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Sent</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                ₹{analytics.totalSent?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Received */}
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <ArrowDownLeft className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Received</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                ₹{analytics.totalReceived?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Net Balance */}
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Net Balance</p>
              <p className={`text-lg font-bold ${
                analytics.netBalance >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {analytics.netBalance >= 0 ? '+' : '-'}₹{Math.abs(analytics.netBalance)?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Count */}
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Transactions</p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {analytics.successCount || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Transaction Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Transaction Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                  <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }} 
                  />
                  <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No transaction data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Top Recipients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Top Recipients
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <div className="flex flex-col gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Legend */}
                <div className="grid grid-cols-2 gap-2">
                  {categoryData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }} 
                      />
                      <span className="text-gray-700 dark:text-gray-300 truncate">
                        {item.name}
                      </span>
                      <span className="text-gray-500 ml-auto">
                        ₹{item.value.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No recipient data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown */}
      {analytics.monthly && Object.keys(analytics.monthly).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Monthly Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(analytics.monthly)
                .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                .slice(0, 12)
                .map(([month, amount]) => (
                  <div 
                    key={month} 
                    className={`p-3 rounded-lg border ${
                      amount >= 0 
                        ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950' 
                        : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'
                    }`}
                  >
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{month}</p>
                    <p className={`text-sm font-bold ${
                      amount >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {amount >= 0 ? '+' : '-'}₹{Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Recipients List */}
      {analytics.topRecipients && analytics.topRecipients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-600" />
              Most Frequent Recipients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topRecipients.map((recipient, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {recipient.name || recipient.recipient}
                      </p>
                      <p className="text-xs text-gray-500">
                        {recipient.count} transaction{recipient.count > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-gray-100">
                      ₹{recipient.total.toLocaleString('en-IN')}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      Avg: ₹{Math.round(recipient.total / recipient.count)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
