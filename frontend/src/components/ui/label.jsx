import { cn } from '@/lib/utils'

export function Label({ className, children, ...props }) {
  return (
    <label
      className={cn('text-sm font-medium text-gray-700 dark:text-gray-300', className)}
      {...props}
    >
      {children}
    </label>
  )
}
