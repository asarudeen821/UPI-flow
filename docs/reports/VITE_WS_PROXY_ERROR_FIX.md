# VITE_WS_PROXY_ERROR Analysis and Fix

## Error Message

```
3:52:44 PM [vite] ws proxy error:
AggregateError [ECONNREFUSED]: 
    at internalConnectMultiple (node:net:1193:18)
    at afterConnectMultiple (node:net:1783:7)
3:52:50 PM [vite] ws proxy error:
AggregateError [ECONNREFUSED]: 
    at internalConnectMultiple (node:net:1193:18)
    at afterConnectMultiple (node:net:1783:7) (x2)
```

## Root Cause Analysis

The `ECONNREFUSED` error indicates that the Vite development server is trying to proxy WebSocket connections to the backend server at `http://localhost:3000`, but the backend is **not running**.

### What happens:
1. Frontend starts on `http://localhost:5174`
2. Vite config proxies `/api/*` and `/socket.io` to `http://localhost:3000`
3. No server is listening on port 3000 → Connection Refused (ECONNREFUSED)

### Why you see this:
- You ran `npm run dev` in the frontend directory only
- The backend server was not started

## Solution

### Option 1: Use the startup script (Recommended)

Run the provided startup script that starts both servers in the correct order:

```bash
cd d:\payment
start-dev.bat
```

This script:
1. Frees ports 3000 and 5174 if in use
2. Starts the backend on port 3000
3. Waits for backend to be ready (health check)
4. Starts the frontend on port 5174

### Option 2: Manual startup

Start the backend first, then the frontend:

```bash
# Terminal 1: Start backend
cd d:\payment\backend
npm run dev

# Terminal 2: Start frontend (wait for backend)
cd d:\payment\frontend
npm run dev
```

## Improved Error Messages

The Vite config has been updated to show clear error messages when the backend is not running:

```
❌ Backend server not running on http://localhost:3000
   Please start the backend first: cd backend && npm run dev
   Or use the startup script: start-dev.bat
```

## Project Structure

```
d:\payment\
├── backend/           # Express + Socket.IO server (port 3000)
│   ├── server.js
│   └── src/
├── frontend/         # React + Vite app (port 5174)
│   ├── vite.config.js
│   └── src/
└── start-dev.bat     # Main startup script
```

## Verification

After starting both servers correctly:

1. **Backend health check**: `http://localhost:3000/api/health`
   ```json
   {"status":"healthy","timestamp":"...","uptime":...}
   ```

2. **Frontend**: `http://localhost:5174/` should load without WebSocket errors

3. **Socket.IO**: Check browser console for `✅ Client connected` message

## Notes

- The WebSocket proxy errors are **normal** when the backend is not running
- The Vite config now handles these errors gracefully
- The frontend will work but API calls will fail until backend is started
