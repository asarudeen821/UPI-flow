# Payment App - Quick Start & Troubleshooting Guide

## 🚀 Quick Start

### Option 1: Use Batch Scripts (Recommended)

1. **Start All Servers:**
   ```
   Double-click: start-servers.bat
   ```

2. **Stop All Servers:**
   ```
   Double-click: cleanup-servers.bat
   ```

### Option 2: Manual Start

1. **Open Terminal 1 (Backend):**
   ```bash
   cd d:\payment\backend
   npm run dev
   ```

2. **Open Terminal 2 (Frontend):**
   ```bash
   cd d:\payment\frontend
   npm run dev
   ```

---

## 🔧 Troubleshooting

### Problem: "Port 3000 is already in use"

**Solution 1: Use Cleanup Script**
```bash
# Run the cleanup script
cleanup-servers.bat
```

**Solution 2: Manual Kill**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual number)
taskkill /F /PID <PID>
```

**Solution 3: Kill All Node Processes**
```bash
taskkill /F /IM node.exe
```

---

### Problem: "Port 5174 is already in use"

**Solution:**
```bash
# Same as port 3000
netstat -ano | findstr :5170
taskkill /F /PID <PID>
```

---

### Problem: Servers won't start after crash

**Solution:**
1. Run `cleanup-servers.bat`
2. Wait 5 seconds
3. Run `start-servers.bat`

---

## ✅ Verify Servers Are Running

### Backend (Port 3000)
```bash
# Check if listening
netstat -ano | findstr :3000

# Test health endpoint
curl http://localhost:3000/api/health

# Expected: {"status":"healthy",...}
```

### Frontend (Port 5174)
```bash
# Check if listening
netstat -ano | findstr :5174

# Open in browser
http://localhost:5174
```

---

## 📊 Server Status

| Server | Port | URL | Status Check |
|--------|------|-----|--------------|
| Backend | 3000 | http://localhost:3000 | `/api/health` |
| Frontend | 5174 | http://localhost:5174 | Home page |

---

## 🛑 How to Stop Servers

### Method 1: Cleanup Script
```bash
cleanup-servers.bat
```

### Method 2: Task Manager
1. Press `Ctrl+Shift+Esc`
2. Find `Node.js` processes
3. Right-click → End Task

### Method 3: Command Line
```bash
taskkill /F /IM node.exe
```

---

## 🔍 Common Error Messages

### "EADDRINUSE: address already in use"
**Meaning:** Port is already in use  
**Fix:** Run `cleanup-servers.bat`

### "Cannot find module"
**Meaning:** Dependencies not installed  
**Fix:** 
```bash
cd backend
npm install
cd ../frontend
npm install
```

### "Network Error" or "Failed to fetch"
**Meaning:** Backend not running  
**Fix:** Start backend first, then frontend

---

## 💡 Tips

1. **Always close servers properly:**
   - Press `Ctrl+C` in terminal
   - Or use `cleanup-servers.bat`

2. **Check ports before starting:**
   ```bash
   netstat -ano | findstr :3000
   netstat -ano | findstr :5174
   ```

3. **Use separate terminals:**
   - Keep backend and frontend in different terminal windows

4. **Watch for file changes:**
   - Backend: `--watch` enabled (auto-restart)
   - Frontend: Vite HMR (auto-refresh)

---

## 📱 Access Points

### Application URLs
- **Frontend:** http://localhost:5174
- **Backend API:** http://localhost:3000/api

### Key Features
- **Dashboard:** http://localhost:5174/dashboard
- **Transactions:** http://localhost:5174/transactions
- **QR Generator:** http://localhost:5174/qr-generator
- **Payment Link:** http://localhost:5174/payment-link
- **AI Forms:** http://localhost:5174/ai-form-generator

### API Endpoints
- **Health:** http://localhost:3000/api/health
- **Transactions:** http://localhost:3000/api/transactions/history
- **AI Status:** http://localhost:3000/api/ai/status

---

## 🆘 Need More Help?

1. Check error message carefully
2. Run cleanup script
3. Restart servers
4. Check if ports are free
5. Verify Node.js is installed: `node --version`
6. Verify npm works: `npm --version`

---

**Last Updated:** 2026-03-28  
**Version:** 1.0.0
