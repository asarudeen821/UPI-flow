import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import UserNotRegisteredError from './UserNotRegisteredError'
import ConnectionStatus from './ConnectionStatus'
import { useAuth } from '@/lib/useAuth'

export default function Layout() {
  const { loading, error } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <UserNotRegisteredError message={error} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
      <ConnectionStatus />
    </div>
  )
}
