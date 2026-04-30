import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Log to error reporting service (e.g., Sentry) in production
    if (import.meta.env.PROD) {
      // Enhanced error logging for production debugging
      console.error('Production error:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      })
      
      // TODO: Integrate with error reporting service (Sentry, LogRocket, etc.)
      // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } })
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-50">
          <Card className="max-w-md w-full shadow-lg">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-gray-900">
                    Something went wrong
                  </h2>
                  <p className="text-sm text-gray-600">
                    We're sorry, but the application encountered an unexpected error.
                  </p>
                </div>

                {this.state.error && (
                  <div className="w-full p-3 bg-gray-50 rounded-lg text-left">
                    <p className="text-xs font-mono text-gray-700 break-words">
                      {this.state.error.message}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 w-full">
                  <Button
                    onClick={this.handleReload}
                    className="flex-1"
                    variant="default"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload Page
                  </Button>
                  <Button
                    onClick={this.handleGoHome}
                    className="flex-1"
                    variant="outline"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </div>

                <p className="text-xs text-gray-500">
                  If the problem persists, please contact support.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
