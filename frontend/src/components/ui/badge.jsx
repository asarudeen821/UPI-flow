import { cn } from '@/lib/utils'

export function Badge({ className, variant = 'default', children, ...props }) {
  const variants = {
    default: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    success: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    destructive: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    secondary: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  }
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  )
}
