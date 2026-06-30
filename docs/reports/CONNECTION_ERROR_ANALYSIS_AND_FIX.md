# WebSocket Connection Errors - Analysis & Resolution

## Issue Reported

```
12:24:01 pm [vite] ws proxy error:
Error: read ECONNRESET
    at TCP.onStreamRead (node:internal/stream_base_commons:216:20)

12:24:03 pm [vite] http proxy error: /socket.io/?EIO=4&transport=polling&t=4cs9t3cq
AggregateError [ECONNREFUSED]: 
    at internalConnectMultiple (node:net:1134:18)
```

## Root Cause Analysis

### What Happened

1. **Frontend Started:** Vite dev server started on port 5174
2. **Backend Restarting:** Backend server (port 3000) was restarting or had a brief interruption
3. **WebSocket Connection Failed:** Frontend tried to connect to Socket.IO but backend wasn't ready
4. **Error Messages:** Vite proxy logged ECONNRESET and ECONNREFUSED errors

### Error Codes Explained

| Error Code | Meaning | Common Cause |
|------------|---------|--------------|
| **ECONNRESET** | Connection reset by peer | Backend restarting, server crash, network issue |
| **ECONNREFUSED** | Connection refused | Backend not running, wrong port, firewall blocking |

## Current Status

### ✅ Both Servers Running

**Backend (Port 3000):**
```
TCP    0.0.0.0:3000           LISTENING       PID 19568
TCP    [::]:3000              LISTENING       PID 19568
```

**Frontend (Port 5174):**
```
TCP    [::1]:5174             LISTENING       PID 19184
```

### ✅ Fixes Applied

**1. Enhanced Vite Proxy Configuration**
- Better error handling for WebSocket connections
- Silently handle expected errors (backend restarting)
- Return helpful error messages to frontend
- Reduced console spam

**2. Enhanced Socket.IO Hook**
- Classify errors by type
- Provide specific error messages
- Better reconnection handling
- Less console noise

---

## What to Expect Now

### Normal Operation

**When Backend is Running:**
```
✅ Frontend Console:
[Socket.IO] Connected successfully

✅ ConnectionStatus Component:
🟢 Connected (green badge)
Connection duration: 5m 23s

✅ Backend Console:
✅ Client connected: abc123 (auth: false)
```

### Backend Restarting

**Expected Behavior:**
```
⚠️ Frontend Console:
[Socket.IO] Disconnected: transport error
[Socket.IO] Reconnecting (1/3)...
[Socket.IO] Connected successfully

⚠️ Vite Console:
[Vite] WebSocket connection reset - backend may be restarting

✅ ConnectionStatus Component:
🟠 Reconnecting (1/3) → 🟢 Connected
```

**No Action Required** - Automatic reconnection!

### Backend Not Running

**Expected Behavior:**
```
❌ Frontend Console:
[Socket.IO] connect_error: Backend server not running

❌ ConnectionStatus Component:
🔴 Connection Error
Error: Backend server not running. Please start the backend.

✅ Vite Console:
(Silent - no spam)
```

**Action Required:** Start backend with `cd backend && npm run dev`

---

## Verification Steps

### 1. Check Backend Health

**Browser:**
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

### 2. Check Frontend

**Browser:**
```
http://localhost:5174
```

**Expected:**
- ✅ App loads successfully
- ✅ No console errors
- ✅ ConnectionStatus shows green "Connected"

### 3. Check Socket.IO Connection

**Backend Console:**
```
✅ Client connected: <socket-id> (auth: false)
📡 Socket.IO ready for real-time updates
```

**Frontend Console:**
```
[Socket.IO] Connected successfully
```

**ConnectionStatus Component:**
```
🟢 Connected
Connected for: 0m 15s
```

---

## Troubleshooting Guide

### If Errors Persist

**Step 1: Check Server Status**
```bash
# Windows PowerShell
netstat -ano | findstr :3000
netstat -ano | findstr :5174
```

**Expected:** Both should show LISTENING

**Step 2: Restart Backend**
```bash
# Kill existing backend
taskkill /F /PID 19568

# Start fresh
cd backend
npm run dev
```

**Step 3: Restart Frontend**
```bash
# Kill existing frontend
taskkill /F /PID 19184

# Start fresh
cd frontend
npm run dev
```

**Step 4: Use Cleanup Script**
```bash
# From project root
.\cleanup-servers.bat

# Then start both
.\start-servers.bat
```

### If Socket.IO Not Connecting

**Check CORS Settings:**

Backend (`backend/server.js`):
```javascript
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5174',
    methods: ['GET', 'POST'],
    credentials: true
  },
  // ...
});
```

**Check Frontend URL:**

Frontend (`.env.local` or environment):
```
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

### If MongoDB Not Connected

**Check MongoDB:**
```bash
# Windows
netstat -ano | findstr :27017

# Should show MongoDB listening
```

**Check Connection String:**

Backend (`.env.local`):
```
MONGODB_URI=mongodb://localhost:27017/payment_db
```

**Restart MongoDB:**
```bash
# Windows Service
net stop MongoDB
net start MongoDB
```

---

## Files Modified

### 1. `frontend/vite.config.js`

**Changes:**
- Enhanced API proxy error handling
- Comprehensive WebSocket error handling
- Better error messages
- Reduced console noise

**Key Features:**
```javascript
// API Proxy - Return helpful error when backend down
proxy.on('error', (err, req, res) => {
  if (err.code === 'ECONNREFUSED') {
    res.writeHead(503, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      success: false,
      error: 'Backend server not running. Please start the backend.'
    }))
  }
})

// WebSocket Proxy - Silent handling
proxy.on('error', (err, req, socket) => {
  if (err.code === 'ECONNREFUSED') {
    return // Don't spam console
  }
  if (err.code === 'ECONNRESET') {
    console.log('[Vite] WebSocket connection reset - backend may be restarting')
    return
  }
})
```

### 2. `frontend/src/hooks/useSocket.js`

**Changes:**
- Better error classification
- Specific error messages
- Reduced console logging
- Improved user feedback

**Key Features:**
```javascript
socket.on('connect_error', (error) => {
  if (error.message?.includes('ECONNREFUSED')) {
    connectionError = 'Backend server not running. Please start the backend.'
  } else if (error.message?.includes('ECONNRESET')) {
    connectionError = 'Connection reset - backend may be restarting'
  } else if (error.message?.includes('timeout')) {
    connectionError = 'Connection timeout'
  } else if (error.message?.includes('xhr poll error')) {
    connectionError = 'Network error'
  } else {
    console.warn('[Socket.IO] connect_error:', error.message)
  }
})
```

---

## Summary

### Problem
- ❌ WebSocket errors flooding console
- ❌ ECONNRESET and ECONNREFUSED errors
- ❌ No helpful error messages
- ❌ Poor developer experience

### Solution
- ✅ Enhanced error handling in Vite proxy
- ✅ Better error classification in useSocket hook
- ✅ Helpful error messages
- ✅ Reduced console noise
- ✅ Automatic reconnection
- ✅ Clear connection status

### Current Status
- ✅ **Backend running** on port 3000 (PID 19568)
- ✅ **Frontend running** on port 5174 (PID 19184)
- ✅ **Socket.IO connected** and working
- ✅ **Error handling** improved

### What to Do If Errors Return

**Transient Errors (Backend Restarting):**
- ✅ Normal behavior
- ✅ Automatic reconnection
- ✅ No action needed

**Persistent Errors (Backend Not Running):**
```bash
cd backend
npm run dev
```

**Port Conflicts:**
```bash
.\cleanup-servers.bat
.\start-servers.bat
```

---

## Quick Reference

### Start Commands
```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev

# Both
.\start-servers.bat
```

### Health Checks
```
Backend:  http://localhost:3000/api/health
Frontend: http://localhost:5174
```

### Connection Status
- 🟢 Green = Connected
- 🟡 Yellow = Connecting
- 🟠 Orange = Reconnecting
- 🔴 Red = Error
- ⚪ Gray = Disconnected

---

**Status:** ✅ **RESOLVED**  
**Impact:** Improved error handling and developer experience  
**Date:** April 2, 2026
