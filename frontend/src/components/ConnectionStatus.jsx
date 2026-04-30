import { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import useSocket from '@/hooks/useSocket'

export default function ConnectionStatus() {
  const { connected, connecting, error, reconnecting, reconnectAttempt, lastMessage } = useSocket()
  const [showDetails, setShowDetails] = useState(false)
  const [connectionStartTime, setConnectionStartTime] = useState(null)
  const [connectionDuration, setConnectionDuration] = useState(0)

  useEffect(() => {
    if (connected && !connectionStartTime) {
      setConnectionStartTime(Date.now())
    } else if (!connected) {
      setConnectionStartTime(null)
      setConnectionDuration(0)
    }
  }, [connected, connectionStartTime])

  useEffect(() => {
    let interval
    if (connected && connectionStartTime) {
      interval = setInterval(() => {
        setConnectionDuration(Math.floor((Date.now() - connectionStartTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [connected, connectionStartTime])

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  const getStatusColor = () => {
    if (connected) return 'bg-green-500'
    if (connecting) return 'bg-yellow-500'
    if (reconnecting) return 'bg-orange-500'
    if (error) return 'bg-red-500'
    return 'bg-gray-500'
  }

  const getStatusBg = () => {
    if (connected) return 'bg-green-50 border-green-200'
    if (connecting) return 'bg-yellow-50 border-yellow-200'
    if (reconnecting) return 'bg-orange-50 border-orange-200'
    if (error) return 'bg-red-50 border-red-200'
    return 'bg-gray-50 border-gray-200'
  }

  const getStatusIcon = () => {
    if (connected) return <CheckCircle2 className="h-5 w-5 text-green-600" />
    if (connecting) return <RefreshCw className="h-5 w-5 text-yellow-600 animate-spin" />
    if (reconnecting) return <RefreshCw className="h-5 w-5 text-orange-600 animate-spin" />
    if (error) return <AlertCircle className="h-5 w-5 text-red-600" />
    return <WifiOff className="h-5 w-5 text-gray-600" />
  }

  const getStatusText = () => {
    if (connected) return 'Connected'
    if (connecting) return 'Connecting...'
    if (reconnecting) return `Reconnecting (${reconnectAttempt}/10)`
    if (error) return 'Connection Error'
    return 'Disconnected'
  }

  const getErrorMessage = () => {
    if (error) {
      if (error.includes('timeout')) return 'Connection timed out'
      if (error.includes('refused')) return 'Connection refused'
      if (error.includes('network')) return 'Network error'
      return error
    }
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {/* Main Status Badge */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border shadow-lg transition-all hover:shadow-xl ${getStatusBg()}`}
      >
        {getStatusIcon()}
        <span className="text-sm font-medium text-gray-700">{getStatusText()}</span>
        <div className={`h-2 w-2 rounded-full ${getStatusColor()} ${connected ? 'animate-pulse' : ''}`} />
      </button>

      {/* Expanded Details */}
      {showDetails && (
        <div className="absolute bottom-12 left-0 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className={`px-4 py-3 ${getStatusBg()} border-b`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Connection Status</h3>
              {connected ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-gray-600" />
              )}
            </div>
          </div>

          {/* Details */}
          <div className="p-4 space-y-3">
            {/* Status */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium ${
                connected ? 'text-green-600' :
                connecting ? 'text-yellow-600' :
                reconnecting ? 'text-orange-600' :
                error ? 'text-red-600' : 'text-gray-600'
              }`}>
                {getStatusText()}
              </span>
            </div>

            {/* Connection Duration */}
            {connected && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Connected for:</span>
                <span className="font-mono text-gray-700">{formatDuration(connectionDuration)}</span>
              </div>
            )}

            {/* Reconnect Attempt */}
            {reconnecting && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Reconnect attempt:</span>
                <span className="font-medium text-orange-600">{reconnectAttempt} / 10</span>
              </div>
            )}

            {/* Last Message */}
            {lastMessage && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Last update:</span>
                <span className="text-gray-700">{new Date(lastMessage).toLocaleTimeString()}</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="pt-2 border-t">
                <div className="flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Error Details:</p>
                    <p className="text-xs text-gray-600 mt-1">{getErrorMessage()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Help Text */}
            {!connected && !error && (
              <div className="pt-2 border-t text-xs text-gray-500 text-center">
                Attempting to reconnect automatically...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
