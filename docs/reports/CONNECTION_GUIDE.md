# 🔗 Complete Connection Guide - Backend + Frontend + MongoDB

## Current Architecture (All on Localhost)

```
┌─────────────────┐
│   Frontend      │  Port: 5174
│   (React+Vite)  │  URL: http://localhost:5174
└────────┬────────┘
         │
         │ HTTP + WebSocket
         │
         ▼
┌─────────────────┐
│   Backend       │  Port: 3000
│   (Express)     │  URL: http://localhost:3000
└────────┬────────┘
         │
         │ MongoDB Driver
         │
         ▼
┌─────────────────┐
│   MongoDB       │  Port: 27017
│   (Database)    │  URL: mongodb://localhost:27017
└─────────────────┘
```

---

## ✅ Current Configuration (Already Set)

### Backend (.env.local)
```env
PORT=3000
FRONTEND_URL=http://localhost:5174
MONGO_URI=mongodb://localhost:27017/payment-app
SOCKET_CORS_ORIGIN=http://localhost:5174
```

### Frontend (.env.local)
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

### Config (backend/src/config/index.js)
```javascript
mongo: {
  uri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017',
  dbName: process.env.MONGO_DB_NAME || 'payment_app'
}
```

---

## 🎯 MongoDB Setup Options

### Option 1: MongoDB Atlas (Cloud - Recommended for Development)

**No installation required! Free tier available.**

#### Step 1: Create Free Account
1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Create free account
3. Create a cluster (takes 3-5 minutes)

#### Step 2: Get Connection String
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy connection string (looks like):
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/payment-app?retryWrites=true&w=majority
```

#### Step 3: Update Backend .env.local
```env
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/payment-app?retryWrites=true&w=majority
```

#### Step 4: Whitelist IP (Important!)
1. In Atlas, go to Network Access
2. Add IP Address
3. Choose "Allow Access from Anywhere" (0.0.0.0/0)
4. Click Confirm

#### Step 5: Test Connection
```bash
cd d:\payment\backend
node -e "const {MongoClient} = require('mongodb'); MongoClient.connect(process.env.MONGO_URI).then(() => console.log('✅ Connected to MongoDB Atlas')).catch(console.error)"
```

---

### Option 2: Local MongoDB (Install on Your Computer)

#### Step 1: Download MongoDB Community Edition
1. Go to: https://www.mongodb.com/try/download/community
2. Select:
   - Version: Latest (7.0 or higher)
   - Platform: Windows
   - Package: MSI
3. Download and run installer

#### Step 2: Install MongoDB
1. Run the MSI installer
2. Choose "Complete" installation
3. **Important:** Check "Install MongoDB as a Service"
4. Check "Install MongoDB Compass" (optional GUI tool)

#### Step 3: Verify Installation
```bash
# Check MongoDB service is running
sc query MongoDB

# Should show: STATE: 4 RUNNING
```

#### Step 4: Start MongoDB Service
```bash
# Start MongoDB
net start MongoDB

# Or if using newer version
net start MongoDB5.0
```

#### Step 5: Test Local Connection
```bash
# Using mongosh (MongoDB Shell)
mongosh

# Should show: Current Mongosh Log ID and connected to: mongodb://localhost:27017
```

#### Step 6: Create Database
```javascript
// In mongosh shell
use payment-app

// Create a test collection
db.createCollection('recipients')

// Insert test document
db.recipients.insertOne({
  name: 'Test Recipient',
  nickname: 'Test',
  payment_method: 'upi_id',
  upi_id: 'test@oksbi',
  category: 'friends'
})

// Verify
db.recipients.find()
```

---

## 🔗 Connection Verification

### 1. Test Backend → MongoDB Connection

**Create test file: `backend/test-mongo.js`**
```javascript
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testConnection() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', process.env.MONGO_URI);
    
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    
    console.log('✅ Connected to MongoDB!');
    
    const db = client.db('payment-app');
    const collections = await db.listCollections().toArray();
    
    console.log('Collections:', collections.map(c => c.name));
    
    await client.close();
    console.log('Connection closed');
    
  } catch (error) {
    console.error('❌ Connection Error:', error.message);
  }
}

testConnection();
```

**Run Test:**
```bash
cd d:\payment\backend
node test-mongo.js
```

**Expected Output:**
```
Connecting to MongoDB...
URI: mongodb://localhost:27017/payment-app
✅ Connected to MongoDB!
Collections: [ 'recipients', 'transactions' ]
Connection closed
```

---

### 2. Test Frontend → Backend Connection

**Check in Browser Console:**
```javascript
// Open http://localhost:5174
// Open DevTools (F12)
// Run:

fetch('http://localhost:3000/api/health')
  .then(r => r.json())
  .then(d => console.log('✅ Backend Connected:', d))
  .catch(e => console.error('❌ Backend Error:', e));
```

**Expected Output:**
```
✅ Backend Connected: { status: 'healthy', timestamp: '...', uptime: 123.456 }
```

---

### 3. Test Full Stack Connection

**Create test recipient from frontend:**

1. Open http://localhost:5174
2. Navigate to `/recipients`
3. Click "Add Recipient"
4. Fill in details and save
5. Check browser console for Socket.IO connection
6. Verify recipient appears in list

**Check MongoDB directly:**
```javascript
// In mongosh
use payment-app
db.recipients.find().pretty()

// Should show your newly added recipient
```

---

## 📊 Connection Status Indicators

### ✅ All Connected
```
Frontend (5174) → ✅ Backend (3000) → ✅ MongoDB (27017)
```

**What you'll see:**
- 🟢 "Real-time Connected" in app
- Recipients load from database
- Payments save to database
- Real-time updates work
- No console errors

### ❌ MongoDB Not Connected
**Symptoms:**
- Backend logs show connection errors
- API returns 500 errors
- Frontend shows loading forever
- Console shows "Cannot connect to database"

**Fix:**
```bash
# Check MongoDB is running
sc query MongoDB

# If not running, start it
net start MongoDB

# Restart backend
cd d:\payment\backend
npm run dev
```

### ❌ Backend Not Connected
**Symptoms:**
- Frontend shows "Connection refused"
- Socket.IO shows "Connecting..." forever
- API calls fail with ERR_CONNECTION_REFUSED

**Fix:**
```bash
# Check backend is running
netstat -ano | findstr :3000

# If not running, start it
cd d:\payment\backend
npm run dev
```

### ❌ Frontend Not Connected
**Symptoms:**
- Can't access http://localhost:5174
- Browser shows "This site can't be reached"

**Fix:**
```bash
# Check frontend is running
netstat -ano | findstr :5174

# If not running, start it
cd d:\payment\frontend
npm run dev
```

---

## 🛠️ Troubleshooting

### MongoDB Connection Fails

**Error: `connect ECONNREFUSED 127.0.0.1:27017`**

**Cause:** MongoDB service not running

**Fix:**
```bash
# Windows
net start MongoDB

# Or restart
net stop MongoDB
net start MongoDB
```

---

**Error: `Authentication failed`**

**Cause:** Wrong username/password in connection string

**Fix:**
1. Check MongoDB Atlas credentials
2. Update `.env.local` with correct password
3. Restart backend server

---

**Error: `IP not whitelisted`**

**Cause:** MongoDB Atlas firewall blocking your IP

**Fix:**
1. Go to MongoDB Atlas
2. Network Access
3. Add your IP address
4. Or add 0.0.0.0/0 (allow all)

---

### Backend Connection Fails

**Error: `EADDRINUSE :::3000`**

**Cause:** Port 3000 already in use

**Fix:**
```bash
taskkill /F /IM node.exe
timeout /t 3
cd d:\payment\backend
npm run dev
```

---

### Frontend Connection Fails

**Error: `Cannot connect to backend`**

**Check:**
1. Backend is running on port 3000
2. CORS is configured correctly
3. VITE_API_BASE_URL is set to http://localhost:3000

**Fix:**
```bash
# Verify backend
curl http://localhost:3000/api/health

# Should return: {"status":"healthy",...}
```

---

## 📝 Quick Start Commands

### Start Everything (Recommended)
```bash
# Terminal 1 - Start both servers
cd d:\payment
npm run dev
```

### Start Separately

**Terminal 1 - Backend:**
```bash
cd d:\payment\backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd d:\payment\frontend
npm run dev
```

### Check All Services
```bash
# Check MongoDB
sc query MongoDB

# Check Backend (port 3000)
netstat -ano | findstr :3000

# Check Frontend (port 5174)
netstat -ano | findstr :5174
```

### Test Full Connection
```bash
# Test backend health
curl http://localhost:3000/api/health

# Test recipients API
curl http://localhost:3000/api/recipients

# Test analytics API
curl http://localhost:3000/api/analytics/overview
```

---

## 🎯 Connection Flow Diagram

```
User Action (Browser)
    ↓
Frontend (React - Port 5174)
    ↓ HTTP Request
Backend (Express - Port 3000)
    ↓ MongoDB Query
MongoDB (Database - Port 27017)
    ↓ Data
Backend (Processes & Formats)
    ↓ JSON Response + Socket.IO Event
Frontend (Updates UI)
    ↓
User Sees Update
```

---

## ✅ Verification Checklist

### MongoDB
- [ ] MongoDB service running
- [ ] Database `payment-app` exists
- [ ] Collections created (recipients, transactions)
- [ ] Can connect via mongosh
- [ ] Connection string in .env.local correct

### Backend
- [ ] Server running on port 3000
- [ ] Can access http://localhost:3000/api/health
- [ ] MongoDB connected (check logs)
- [ ] Socket.IO connected
- [ ] CORS configured for port 5174

### Frontend
- [ ] Server running on port 5174
- [ ] Can access http://localhost:5174
- [ ] 🟢 "Real-time Connected" shows
- [ ] API calls working
- [ ] Socket.IO connected
- [ ] No console errors

### Full Stack
- [ ] Can add recipient → saves to MongoDB
- [ ] Can create payment → appears in transactions
- [ ] Real-time updates work across browsers
- [ ] Data persists after refresh

---

## 🎉 Success!

When everything is connected properly:

```
✅ Frontend:  http://localhost:5174 (Running)
✅ Backend:   http://localhost:3000 (Running)
✅ MongoDB:   mongodb://localhost:27017 (Connected)
✅ Socket.IO: Connected (Real-time active)
```

**Your full-stack payment app is ready! 🚀**

---

## 📞 Quick Help

### MongoDB Not Starting?
```bash
# Windows Service
net start MongoDB

# Check status
sc query MongoDB
```

### Can't Connect to Backend?
```bash
# Kill and restart
taskkill /F /IM node.exe
cd d:\payment\backend
npm run dev
```

### Frontend Won't Load?
```bash
# Check backend is running first
curl http://localhost:3000/api/health

# Then restart frontend
cd d:\payment\frontend
npm run dev
```

---

**All connected! Full-stack payment app operational! 🎊**
