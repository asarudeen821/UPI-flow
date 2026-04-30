import { useState, useEffect, useCallback } from 'react'
import { AuthAPI, initializeAuthFromUrl } from '../api/backend.js'
import { AuthContext } from './auth-context'

function isBackendConnectionError(error) {
  const message = error?.message || ''
  return (
    message.includes('/api/auth/me') ||
    message.includes('Route not found') ||
    message.includes('Failed to fetch') ||
    message.includes('status 404') ||
    message.includes('status 502') ||
    message.includes('Bad Gateway') ||
    message.includes('ERR_CONNECTION_REFUSED')
  )
}

function normalizeAuthError(error) {
  const message = error?.message || 'Unknown authentication error'

  if (isBackendConnectionError(error)) {
    return 'Unable to connect to the backend API. Make sure the backend server is running on port 3000 and restart it after recent code changes.'
  }

  return message
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadUser = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await initializeAuthFromUrl()
      const result = await AuthAPI.me()
      if (result.success) {
        setUser(result.data)
      } else {
        setUser(null)
      }
    } catch (e) {
      if (import.meta.env.DEV && isBackendConnectionError(e)) {
        setUser({
          id: 'demo-user',
          email: 'demo@payapp.local',
          name: 'Demo User',
          mock: true,
        })
        setError(null)
        return
      }
      setError(normalizeAuthError(e))
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  async function logout() {
    await AuthAPI.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, logout, reload: loadUser }}>
      {children}
    </AuthContext.Provider>
  )
}
