/**
 * Vite Configuration with Backend Proxy
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
              // Backend not running, return helpful error
              console.error('❌ Backend server not running on http://localhost:3000')
              console.error('   Please start the backend first: cd backend && npm run dev')
              console.error('   Or use the startup script: start-dev.bat\n')
              res.writeHead(503, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({
                success: false,
                error: 'Backend server not running. Please start the backend with: cd backend && npm run dev'
              }))
            }
          })
        },
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, socket) => {
            // Silently handle WebSocket errors - backend might not be running
            if (err.code === 'ECONNREFUSED') {
              // Backend not running, don't spam console
              return
            }
            if (err.code === 'ECONNRESET') {
              // Connection reset, likely backend restarting
              console.log('[Vite] WebSocket connection reset - backend may be restarting')
              return
            }
            console.warn('[Vite] WebSocket proxy error:', err.message)
          })
          proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
            socket.on('error', (err) => {
              if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
                // Silently handle - backend might be restarting
                return
              }
              console.warn('[Vite] WebSocket socket error:', err.message)
            })
          })
          proxy.on('open', (proxySocket) => {
            proxySocket.on('error', (err) => {
              if (err.code === 'ECONNRESET') {
                // Expected when backend restarts
                return
              }
              console.warn('[Vite] WebSocket open error:', err.message)
            })
          })
          proxy.on('close', (_req, _res, proxySocket) => {
            // Normal when connections close, don't log
          })
        },
      },
    },
  },
})
