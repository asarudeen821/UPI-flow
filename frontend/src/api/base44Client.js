// Base44 SDK client initialization
// Replace BASE_URL and API_KEY with your actual Base44 project values
const BASE_URL = import.meta.env.VITE_BASE44_URL || 'https://api.base44.com'
const API_KEY = import.meta.env.VITE_BASE44_API_KEY || ''

export const base44Client = {
  baseURL: BASE_URL,
  apiKey: API_KEY,
  async get(path, params = {}) {
    const url = new URL(`${BASE_URL}${path}`)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  async post(path, body = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
}

export default base44Client
