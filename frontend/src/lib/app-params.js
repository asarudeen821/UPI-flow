// URL param + localStorage config manager
const STORAGE_PREFIX = 'payment_app_'

export function getParam(key, fallback = null) {
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.has(key)) {
    const val = urlParams.get(key)
    localStorage.setItem(STORAGE_PREFIX + key, val)
    return val
  }
  return localStorage.getItem(STORAGE_PREFIX + key) ?? fallback
}

export function setParam(key, value) {
  localStorage.setItem(STORAGE_PREFIX + key, value)
}

export function clearParam(key) {
  localStorage.removeItem(STORAGE_PREFIX + key)
}
