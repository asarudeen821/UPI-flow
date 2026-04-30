import { ShieldX } from 'lucide-react'

export default function UserNotRegisteredError({ message }) {
  const isConnectionIssue =
    message?.includes('Unable to connect to the backend API') ||
    message?.includes('Failed to fetch') ||
    message?.includes('Route not found')

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <ShieldX className="h-14 w-14 text-red-500" />
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        {isConnectionIssue ? 'Connection Error' : 'Access Denied'}
      </h2>
      <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
        {message || 'Your account is not registered to use this application. Please contact the administrator.'}
      </p>
    </div>
  )
}
