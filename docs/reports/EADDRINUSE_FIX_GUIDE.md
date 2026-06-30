# 🔧 EADDRINUSE Error - Complete Fix Guide

## Error Analysis

### Error Message
```
Error: listen EADDRINUSE: address already in use :::3000
Code: EADDRINUSE
Errno: -4091
Syscall: listen
Address: ::
Port: 3000
```

### What It Means
**Port 3000 is already occupied** by another process (usually a previous Node.js server that didn't close properly)

### Why It Happens
1. Previous server still running in background
2. Multiple terminal windows with server running
3. Process didn't terminate properly (crash, force close)
4. Port conflict with another application

---

## ✅ Solutions (All Fixed!)

### Solution 1: Quick Kill & Restart (Recommended)

**One Command:**
```bash
taskkill /F /IM node.exe & timeout /t 3 & cd d:\payment & npm run dev
```

**What it does:**
1. Kills ALL Node.js processes
2. Waits 3 seconds for ports to clear
3. Restarts both servers together

---

### Solution 2: Manual Process Kill

**Step 1: Find Process Using Port 3000**
```bash
netstat -ano | findstr :3000
```

**Output Example:**
```
TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345
                                      ^^^^^
                                      PID
```

**Step 2: Kill That Process**
```bash
taskkill /F /PID 12345
```

**Step 3: Restart Server**
```bash
cd d:\payment\backend
npm run dev
```

---

### Solution 3: Kill All Node Processes

**Command:**
```bash
taskkill /F /IM node.exe
```

**Then Restart:**
```bash
cd d:\payment
npm run dev
```

---

## 🎯 Prevention - Best Practices

### 1. Always Stop Server Properly
```bash
# In terminal where server is running
Press: Ctrl + C
Type: Y (if asked)
```

### 2. Use Separate Terminals
```
Terminal 1: Backend (port 3000)
Terminal 2: Frontend (port 5174)
```

### 3. Use npm run dev (Concurrent)
```bash
cd d:\payment
npm run dev
# This manages both servers automatically
```

### 4. Check Ports Before Starting
```bash
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Check if port 5174 is in use
netstat -ano | findstr :5174
```

---

## 🚀 Current Status (After Fix)

### ✅ Both Servers Running

**Backend:**
- Port: 3000
- Status: LISTENING ✅
- PID: 23840

**Frontend:**
- Port: 5174
- Status: LISTENING ✅
- PID: 7944

---

## 🌐 Access Your Application

**Frontend:** http://localhost:5174  
**Backend API:** http://localhost:3000  
**Socket.IO:** Auto-connected ✅

---

## 📝 Quick Reference Commands

### Check Port Usage
```bash
netstat -ano | findstr :3000
netstat -ano | findstr :5174
```

### Kill Specific Process
```bash
taskkill /F /PID <PID_NUMBER>
```

### Kill All Node Processes
```bash
taskkill /F /IM node.exe
```

### Start Both Servers
```bash
cd d:\payment
npm run dev
```

### Start Backend Only
```bash
cd d:\payment\backend
npm run dev
```

### Start Frontend Only
```bash
cd d:\payment\frontend
npm run dev
```

---

## 🛠️ Troubleshooting

### Still Getting EADDRINUSE?

**Step 1: Find ALL Node Processes**
```bash
tasklist | findstr node.exe
```

**Step 2: Kill Each One**
```bash
taskkill /F /PID <PID1>
taskkill /F /PID <PID2>
taskkill /F /PID <PID3>
```

**Step 3: Wait for Port to Clear**
```bash
timeout /t 5 /nobreak
```

**Step 4: Verify Port is Free**
```bash
netstat -ano | findstr :3000
# Should show nothing
```

**Step 5: Restart**
```bash
cd d:\payment
npm run dev
```

---

### Port Still Shows as Used After Kill?

**Windows Issue:** Sometimes Windows holds ports briefly

**Solution 1: Wait**
```bash
timeout /t 10 /nobreak
```

**Solution 2: Use Different Port Temporarily**

Edit `backend/server.js` line 23:
```javascript
const PORT = process.env.PORT || 3001; // Use 3001 instead
```

**Solution 3: Restart Computer** (Last resort)

---

## 📊 Error Prevention Checklist

- [ ] Always stop server with Ctrl+C
- [ ] Close terminal windows properly
- [ ] Don't run multiple instances
- [ ] Check ports before starting
- [ ] Use `npm run dev` for concurrent servers
- [ ] Keep terminal windows open (don't X out)
- [ ] Use separate terminals for backend/frontend

---

## 🎉 Success Indicators

### Both Servers Running Successfully
```
✅ Backend:  http://localhost:3000 (LISTENING)
✅ Frontend: http://localhost:5174 (LISTENING)
✅ Socket.IO: Auto-connected
✅ No EADDRINUSE errors
```

### In Browser
```
✅ http://localhost:5174 loads
✅ 🟢 "Real-time Connected" shows
✅ All pages work
✅ No console errors
```

---

## 🔗 Related Issues

### EADDRINUSE on Port 5174
**Same fix applies:**
```bash
taskkill /F /IM node.exe
timeout /t 3
cd d:\payment\frontend
npm run dev
```

### Multiple Ports in Use
**Kill all and restart:**
```bash
taskkill /F /IM node.exe
timeout /t 5
cd d:\payment
npm run dev
```

---

## 📞 Quick Help

### If Error Returns
1. **Don't panic** - It's normal
2. **Run:** `taskkill /F /IM node.exe`
3. **Wait:** 3 seconds
4. **Restart:** `npm run dev`

### Server Won't Start?
1. Check port is free: `netstat -ano | findstr :3000`
2. Kill any process shown
3. Wait 5 seconds
4. Try again

---

## ✅ Summary

**Error:** EADDRINUSE port 3000  
**Cause:** Port already in use  
**Fix:** Kill process & restart  
**Status:** ✅ FIXED  
**Servers:** ✅ RUNNING  

**Your app is now live at:** http://localhost:5174 🚀

---

**Happy coding! No more port conflicts! 🎊**
