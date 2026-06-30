# WebSocket & Socket.IO Connection Error Fix

## Issue Identified

**Errors:**
```
12:24:01 pm [vite] ws proxy error:
Error: read ECONNRESET
    at TCP.onStreamRead (node:internal/stream_base_commons:216:20)

12:24:03 pm [vite] http proxy error: /socket.io/?EIO=4&transport=polling&t=4cs9t3cq
AggregateError [ECONNREFUSED]: 
    at internalConnectMultiple (node:net:1134:18)
    at afterConnectMultiple (node:net:1715:7)
```

## Root Cause

**Problem:** Frontend is trying to connect to Socket.IO on `http://localhost:3000`, but the backend server is not running.

**Error Codes:**
- **`ECONNREFUSED`** - Connection refused (backend not running)
- **`ECONNRESET`** - Connection reset (backend restarting or crashed)

---

## Solution Implemented

### 1. Enhanced Vite Proxy Error Handling

**File:** `frontend/vite.config.js`

**Changes:**
- Added detailed error handling for API proxy
- Added comprehensive WebSocket error handling
- Silently handle expected errors (backend restarting)
- Return helpful error messages to frontend

```javascript
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
        // ... additional error handlers
      },
    },
  },
}
```

**Benefits:**
- ✅ No console spam when backend is down
- ✅ Helpful error messages for developers
- ✅ Graceful handling of backend restarts
- ✅ Clear distinction between API and WebSocket errors

---

### 2. Enhanced Socket.IO Error Handling

**File:** `frontend/src/hooks/useSocket.js`

**Changes:**
- Better error classification
- Specific error messages for different error types
- Reduced console noise
- Better user feedback

```javascript
socket.on('connect_error', (error) => {
  // Only log meaningful errors, ignore common connection issues
  if (error.message?.includes('ECONNREFUSED')) {
    // Backend not running
    connectionError = 'Backend server not running. Please start the backend.'
    reconnectAttempt++
    notifyListeners(false)
  } else if (error.message?.includes('ECONNRESET')) {
    // Connection reset - backend restarting
    connectionError = 'Connection reset - backend may be restarting'
    reconnectAttempt++
    notifyListeners(false)
  } else if (error.message?.includes('timeout')) {
    // Connection timeout
    connectionError = 'Connection timeout'
    reconnectAttempt++
    notifyListeners(false)
  } else if (error.message?.includes('xhr poll error')) {
    // Polling error - usually transient
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
```

**Benefits:**
- ✅ Clear error messages in ConnectionStatus component
- ✅ No console spam for common errors
- ✅ Better developer experience
- ✅ Easier debugging

---

## How to Fix (Quick Start)

### Option 1: Start Backend Server (Recommended)

```bash
# Open a new terminal
cd backend
npm run dev
```

**Expected Output:**
```
✅ MongoDB connected
📡 Socket.IO ready for real-time updates
🚀 Backend server running on http://localhost:3000
```

### Option 2: Use Start Script

```bash
# From project root
.\start-servers.bat
```

This starts both backend and frontend simultaneously.

### Option 3: Start Both Manually

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

---

## Verification

### Check Backend is Running

**Method 1: Browser**
```
http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-02T12:30:00.000Z",
  "uptime": 123.456
}
```

**Method 2: curl**
```bash
curl http://localhost:3000/api/health
```

**Method 3: Check Port**
```bash
# Windows PowerShell
netstat -ano | findstr :3000

# Should show: LISTENING
```

---

### Check Socket.IO Connection

**Frontend Console Should Show:**
```
[Socket.IO] Connected successfully
```

**ConnectionStatus Component Should Show:**
- ✅ Green "Connected" badge
- ✅ Connection duration counter
- ✅ No error messages

**Backend Console Should Show:**
```
✅ Client connected: <socket-id> (auth: false)
```

---

## Error Scenarios & Expected Behavior

### Scenario 1: Backend Not Running

**Frontend Console:**
```
[Socket.IO] Disconnected: transport error
```

**ConnectionStatus Component:**
- 🔴 Red "Connection Error" badge
- Error message: "Backend server not running. Please start the backend."
- No console spam

**Vite Console:**
- No errors (silently handled)

**Action Required:**
Start the backend server.

---

### Scenario 2: Backend Restarting

**Frontend Console:**
```
[Socket.IO] Disconnected: transport error
[Socket.IO] Reconnecting (1/3)...
[Socket.IO] Connected successfully
```

**ConnectionStatus Component:**
- 🟠 Orange "Reconnecting (1/3)" badge
- Then green "Connected" badge
- Brief interruption

**Vite Console:**
```
[Vite] WebSocket connection reset - backend may be restarting
```

**Action Required:**
None - automatic reconnection.

---

### Scenario 3: MongoDB Connection Issue

**Backend Console:**
```
❌ MongoDB connection error: <error message>
⚠️  Continuing with in-memory mode
```

**Frontend Console:**
```
[Socket.IO] Connected successfully
```

**Behavior:**
- Socket.IO still works
- Data stored in memory (not persistent)
- Warning in backend console

**Action Required:**
Check MongoDB connection string in `.env.local`.

---

## Connection Status Component

The `ConnectionStatus` component provides real-time feedback:

### States

**Disconnected (Gray):**
```
┌─────────────────┐
│ Wifi Off        │ Disconnected
└─────────────────┘
```

**Connecting (Yellow):**
```
┌─────────────────┐
│ 🔄 Spinning     │ Connecting...
└─────────────────┘
```

**Reconnecting (Orange):**
```
┌─────────────────┐
│ 🔄 Spinning     │ Reconnecting (1/10)
└─────────────────┘
```

**Connected (Green):**
```
┌─────────────────┐
│ ✅ Check        │ Connected         ● (pulsing)
└─────────────────┘
```

**Error (Red):**
```
┌─────────────────┐
│ ⚠️  Alert       │ Connection Error  │
└─────────────────┘
```

### Expanded View

Click the badge to see details:
```
┌─────────────────────────────┐
│ Connection Status      📶   │
├─────────────────────────────┤
│ Status:          Connected  │
│ Connected for:   2m 15s     │
│ Last update:     12:30:45   │
└─────────────────────────────┘
```

---

## Troubleshooting

### Problem: Port 3000 Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Windows - kill process on port 3000
.\cleanup-servers.bat

# Or manually
netstat -ano | findstr :3000
taskkill /F /PID <PID>
```

### Problem: MongoDB Not Connected

**Error:**
```
❌ MongoDB connection error
```

**Solution:**
1. Check MongoDB is running
2. Verify connection string in `.env.local`
3. Restart backend

### Problem: Socket.IO Still Not Connecting

**Check:**
1. Backend is running on port 3000
2. No firewall blocking port 3000
3. CORS settings in backend allow frontend origin

**Backend CORS Check:**
```javascript
// backend/server.js
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5174',
    methods: ['GET', 'POST'],
    credentials: true
  },
  // ...
});
```

---

## Files Modified

| File | Changes | Purpose |
|------|---------|---------|
| `frontend/vite.config.js` | Enhanced proxy error handling | Better error messages, less console spam |
| `frontend/src/hooks/useSocket.js` | Enhanced error classification | Specific error messages for each error type |

**Total:** 2 files, ~80 lines modified

---

## Summary

### Before Fix
- ❌ Console spam with ECONNREFUSED errors
- ❌ No helpful error messages
- ❌ WebSocket errors flooding console
- ❌ Unclear what was wrong

### After Fix
- ✅ Graceful error handling
- ✅ Helpful error messages
- ✅ No console spam
- ✅ Clear connection status
- ✅ Automatic reconnection
- ✅ Better developer experience

---

## Quick Reference

### Start Commands

```bash
# Backend only
cd backend
npm run dev

# Frontend only
cd frontend
npm run dev

# Both (from root)
.\start-servers.bat
```

### Health Check URLs

```
Backend API:  http://localhost:3000/api/health
Frontend:     http://localhost:5174
Socket.IO:    http://localhost:3000/socket.io/?EIO=4&transport=polling
```

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| ECONNREFUSED | Connection refused | Start backend |
| ECONNRESET | Connection reset | Backend restarting |
| ETIMEDOUT | Connection timeout | Check network/firewall |
| EADDRINUSE | Port in use | Kill process or use different port |

---

**Last Updated:** April 2, 2026  
**Status:** ✅ Fixed  
**Impact:** Improved developer experience, reduced console noise
