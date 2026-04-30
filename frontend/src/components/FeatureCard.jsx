import { cn } from '@/lib/utils'

export default function FeatureCard({ icon: Icon, title, description, className }) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-900',
        className
      )}
    >
      {Icon && (
        <div className="mb-3 inline-flex rounded-lg bg-blue-50 p-2 dark:bg-blue-950">
          <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
      )}
      <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  )
}
