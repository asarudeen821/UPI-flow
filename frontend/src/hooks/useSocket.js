/**
 * Socket.IO Hook for Real-time Updates
 * Uses a singleton pattern to maintain a single socket connection across the app
 * Enhanced with connection state tracking and reconnection monitoring
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

// In dev, use empty string so Vite proxy intercepts /socket.io; in prod use origin
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  || (import.meta.env.DEV ? '' : (typeof window !== 'undefined' ? window.location.origin : ''))

let socket = null
const listeners = new Set()
let reconnectAttempt = 0
let lastMessageTime = null
let connectionError = null

function notifyListeners(connected) {
  listeners.forEach((fn) => fn(connected))
}

function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      path: '/socket.io',
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 10000,
      transports: ['websocket', 'polling'], // Prefer WebSocket
      auth: {
        token: localStorage.getItem('payment_app_access_token') || '',
      },
      forceNew: false, // Reuse existing connection
      multiplex: true, // Enable multiplexing
    })

    socket.on('connect', () => {
      console.log('[Socket.IO] ✅ Connected successfully:', socket.id)
      reconnectAttempt = 0
      connectionError = null
      lastMessageTime = Date.now()
      notifyListeners(true)
    })

    socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] ❌ Disconnected:', reason)
      // 'io server disconnect' means server intentionally closed — don't auto-reconnect
      // For other reasons, the socket will auto-reconnect based on reconnection settings
      if (reason === 'io server disconnect') {
        console.log('[Socket.IO] Server disconnected, attempting reconnect...')
        socket.connect()
      }
      notifyListeners(false)
    })

    socket.on('connect_error', (error) => {
      // Only log meaningful errors, ignore common connection issues
      if (error.message?.includes('ECONNREFUSED')) {
        // Backend not running - don't spam console, just set error state
        connectionError = 'Backend server not running. Please start the backend.'
        reconnectAttempt++
        notifyListeners(false)
      } else if (error.message?.includes('ECONNRESET')) {
        // Connection reset - backend restarting, will reconnect
        connectionError = 'Connection reset - backend may be restarting'
        reconnectAttempt++
        notifyListeners(false)
      } else if (error.message?.includes('timeout')) {
        // Connection timeout
        connectionError = 'Connection timeout'
        reconnectAttempt++
        notifyListeners(false)
      } else if (error.message?.includes('xhr poll error')) {
        // Polling error - usually transient, don't log
        connectionError = 'Network error'
        reconnectAttempt++
        notifyListeners(false)
      } else {
        // Other errors - log once
        console.warn('[Socket.IO] connect_error:', error.message)
        connectionError = error.message
        reconnectAttempt++
        notifyListeners(false)
      }
    })

    socket.on('reconnect', () => {
      reconnectAttempt = 0
      connectionError = null
      notifyListeners(true)
    })

    socket.on('reconnect_attempt', () => {
      notifyListeners(false)
    })

    socket.on('reconnect_failed', () => {
      connectionError = 'Max reconnection attempts reached'
      notifyListeners(false)
    })

    socket.on('connected', () => {
      lastMessageTime = Date.now()
    })

    const messageEvents = [
      'transaction:created', 'transaction:updated',
      'recipient:created', 'recipient:updated', 'recipient:deleted',
      'payment:notification', 'stats:update',
    ]
    messageEvents.forEach((event) => {
      socket.on(event, () => { lastMessageTime = Date.now() })
    })
  }
  return socket
}

export function useSocket() {
  const [connected, setConnected] = useState(() => socket?.connected || false)
  const [reconnecting, setReconnecting] = useState(false)
  const [error, setError] = useState(null)
  const componentMounted = useRef(true)

  const handleConnectionChange = useCallback((isConnected) => {
    if (componentMounted.current) {
      setConnected(isConnected)
      setReconnecting(!isConnected && reconnectAttempt > 0)
      setError(connectionError)
    }
  }, [])

  useEffect(() => {
    componentMounted.current = true
    const sock = getSocket()

    // Sync current state immediately
    setConnected(sock.connected)
    setReconnecting(!sock.connected && reconnectAttempt > 0)
    setError(connectionError)

    listeners.add(handleConnectionChange)

    return () => {
      componentMounted.current = false
      listeners.delete(handleConnectionChange)
    }
  }, [handleConnectionChange])

  useEffect(() => {
    const sock = getSocket()

    const handlers = {
      'transaction:created': (data) => window.dispatchEvent(new CustomEvent('transaction:update', { detail: data })),
      'transaction:updated': (data) => window.dispatchEvent(new CustomEvent('transaction:update', { detail: data })),
      'recipient:created':   (data) => window.dispatchEvent(new CustomEvent('recipient:update', { detail: data })),
      'recipient:updated':   (data) => window.dispatchEvent(new CustomEvent('recipient:update', { detail: data })),
      'recipient:deleted':   (data) => window.dispatchEvent(new CustomEvent('recipient:update', { detail: data })),
      'payment:notification':(data) => window.dispatchEvent(new CustomEvent('payment:notification', { detail: data })),
      'stats:update':        (data) => window.dispatchEvent(new CustomEvent('stats:update', { detail: data })),
    }

    Object.entries(handlers).forEach(([event, handler]) => sock.on(event, handler))

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => sock.off(event, handler))
    }
  }, [])

  const emitPaymentInitiate = (data) => {
    if (socket) socket.emit('payment:initiate', data)
  }

  const emitPaymentComplete = (data) => {
    if (socket) socket.emit('payment:complete', data)
  }

  const reconnect = () => {
    if (socket) {
      reconnectAttempt = 0
      connectionError = null
      socket.connect()
    }
  }

  const disconnect = () => {
    if (socket) {
      socket.disconnect()
    }
  }

  return {
    socket,
    connected,
    connecting: !connected && reconnectAttempt === 0,
    reconnecting,
    reconnectAttempt,
    error,
    lastMessage: lastMessageTime ? new Date(lastMessageTime).toISOString() : null,
    emitPaymentInitiate,
    emitPaymentComplete,
    reconnect,
    disconnect,
  }
}

export default useSocket
