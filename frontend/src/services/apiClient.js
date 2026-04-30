const DEFAULT_DEV_API_BASE_URL =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : 'http://localhost:3000'

const EXPLICIT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const EXPLICIT_SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ''

function getRequestTargets(path) {
  const bases = []

  if (EXPLICIT_API_BASE_URL) {
    bases.push(EXPLICIT_API_BASE_URL)
  } else if (import.meta.env.DEV) {
    bases.push('')
    bases.push(DEFAULT_DEV_API_BASE_URL)
  } else {
    bases.push('')
  }

  const seen = new Set()
  return bases
    .map((base) => `${base}${path}`)
    .filter((url) => {
      if (seen.has(url)) return false
      seen.add(url)
      return true
    })
}

async function parseResponse(response) {
  const text = await response.text()
  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

export async function request(path, options = {}) {
  const targets = getRequestTargets(path)
  let lastError = null

  // Get auth token from localStorage if available
  const token = localStorage.getItem('payapp_access_token') || localStorage.getItem('payment_app_access_token')

  for (const target of targets) {
    try {
      const response = await fetch(target, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
      })

      const data = await parseResponse(response)
      if (response.ok) {
        return data
      }

      lastError = new Error(data.error || data.message || `Request failed with status ${response.status}`)

      if (import.meta.env.DEV && [404, 502, 503, 504].includes(response.status)) {
        continue
      }

      throw lastError
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw lastError || new Error('Request failed')
}

export function getSocketUrl() {
  if (EXPLICIT_SOCKET_URL) {
    return EXPLICIT_SOCKET_URL
  }

  if (import.meta.env.DEV) {
    return DEFAULT_DEV_API_BASE_URL
  }

  return typeof window !== 'undefined' ? window.location.origin : DEFAULT_DEV_API_BASE_URL
}
