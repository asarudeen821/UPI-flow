import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function isInIframe() {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}
