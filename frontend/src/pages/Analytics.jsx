import AnalyticsDashboard from '@/components/AnalyticsDashboard'
import { useAuth } from '@/lib/useAuth'

export default function Analytics() {
  const { user } = useAuth()
  
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track your spending patterns and financial insights
        </p>
      </div>
      
      <AnalyticsDashboard 
        userId={user?.id || 'user_1'} 
        days={30}
      />
    </div>
  )
}
