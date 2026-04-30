import { Link } from 'react-router-dom'

export default function PageNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <span className="text-6xl font-bold text-gray-200 dark:text-gray-800">404</span>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Page Not Found</h2>
      <p className="text-sm text-gray-500">
        The page you're looking for doesn't exist.
      </p>
      <Link
        to="/"
        className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Go Home
      </Link>
    </div>
  )
}
