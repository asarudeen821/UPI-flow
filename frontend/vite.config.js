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
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
              console.error('❌ Backend server not running on http://127.0.0.1:3000')
              if (res && typeof res.writeHead === 'function') {
                res.writeHead(503, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({
                  success: false,
                  error: 'Backend server not running. Please start the backend with: cd backend && npm run dev'
                }))
              } else if (res && typeof res.destroy === 'function') {
                res.destroy()
              }
            }
          })
        },
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3000',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            // Handle error cleanly to prevent bubbling to Vite's console
            if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
              if (res && typeof res.destroy === 'function') {
                res.destroy()
              } else if (res && typeof res.writeHead === 'function') {
                res.writeHead(502)
                res.end()
              }
              return
            }
            console.warn('[Vite] WebSocket proxy error:', err.message)
            if (res && typeof res.destroy === 'function') {
              res.destroy()
            }
          })
          proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
            socket.on('error', (err) => {
              if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
                return
              }
              console.warn('[Vite] WebSocket socket error:', err.message)
            })
          })
          proxy.on('open', (proxySocket) => {
            proxySocket.on('error', (err) => {
              if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
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
