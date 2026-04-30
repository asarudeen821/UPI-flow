/**
 * UPI Payment Options Component
 * Displays popular UPI apps for quick selection
 */

import { Wallet, Smartphone, Building2 } from 'lucide-react'

export const POPULAR_UPI_APPS = [
  { name: 'Google Pay', id: 'oksbi', icon: 'G' },
  { name: 'PhonePe', id: 'ibl', icon: 'P' },
  { name: 'Paytm', id: 'paytm', icon: 'T' },
  { name: 'Amazon Pay', id: 'amzn', icon: 'A' },
  { name: 'BHIM', id: 'upi', icon: 'B' },
  { name: 'Cred', id: 'cred', icon: 'C' },
]

export default function UPIOptions({ onSelect }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Popular UPI Apps
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {POPULAR_UPI_APPS.map((app) => (
          <button
            key={app.id}
            type="button"
            onClick={() => onSelect(`@${app.id}`)}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 bg-white p-2 transition-all hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500 dark:hover:bg-gray-700"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white">
              {app.icon}
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {app.name}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-800">
        <Smartphone className="h-4 w-4 text-gray-500" />
        <span className="text-xs text-gray-600 dark:text-gray-400">
          Or enter any UPI ID manually (e.g., mobile@upi, name@bank)
        </span>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-2 dark:bg-blue-950">
        <Building2 className="mt-0.5 h-4 w-4 text-blue-600" />
        <div className="text-xs text-blue-800 dark:text-blue-200">
          <p className="font-medium">Supported Banks:</p>
          <p className="mt-1 text-blue-600 dark:text-blue-300">
            SBI, HDFC, ICICI, Axis, Kotak, Yes Bank, and 100+ more
          </p>
        </div>
      </div>
    </div>
  )
}
