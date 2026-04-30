/**
 * Real-time Payment Backend Server
 * Express + Socket.IO for real-time updates
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import modules
import paymentRoutes from './src/modules/payment/payment.routes.js';
import qrRoutes from './src/modules/qr/qr.routes.js';
import paymentLinkRoutes from './src/modules/paymentlink/paymentlink.routes.js';
import aiRoutes from './src/modules/ai/ai.routes.js';
import paymentFormRoutes from './src/modules/paymentform/paymentform.routes.js';
import analyticsRoutes from './src/modules/analytics/analytics.routes.js';
import transactionRoutes from './src/modules/transaction/transaction.routes.js';
import receiptRoutes from './src/modules/receipt/receipt.controller.js';
import { errorMiddleware } from './src/middlewares/error.middleware.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Import MongoDB models
import RecipientModel from './src/modules/recipient/recipient.model.js';
import TransactionModel, { TransactionStatus } from './src/modules/transaction/transaction.model.js';
import SubscriptionModel from './src/modules/subscription/subscription.model.js';
import { getDatabase, pingDatabase } from './src/db/mongo.js';

// Create Express app
const app = express();
const httpServer = createServer(app);

// Socket.IO setup with CORS and Authentication
const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5174',
      'http://localhost:5175', // Fallback port
      'http://localhost:5173', // Alternative port
    ],
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  // Connection timeout and reconnection settings
  connectTimeout: 10000,
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
  transports: ['websocket', 'polling'], // Prefer WebSocket
});

// Socket.IO Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  
  if (!token) {
    // Allow connection without token for development, but mark as unauthenticated
    socket.authenticated = false;
    socket.user = null;
    return next();
  }
  
  try {
    // Import JWT dynamically to avoid circular dependency
    import('jsonwebtoken').then(({ default: jwt }) => {
      import('./src/config/env.js').then(({ default: env }) => {
        if (!env.jwtSecret) {
          // No JWT secret configured, allow unauthenticated
          socket.authenticated = false;
          socket.user = null;
          return next();
        }
        
        const decoded = jwt.verify(token, env.jwtSecret);
        socket.authenticated = true;
        socket.user = {
          id: decoded.userId || decoded.id || decoded.sub,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role || 'user'
        };
        next();
      });
    }).catch(() => {
      // JWT module not available or verification failed
      socket.authenticated = false;
      socket.user = null;
      next();
    });
  } catch (err) {
    // Token verification failed, but allow connection as unauthenticated
    socket.authenticated = false;
    socket.user = null;
    next();
  }
});

// Connection acknowledgment is handled in the main io.on('connection') block below

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5174',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware - moved before routes
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Attach Socket.IO instance to app for use in routes
app.set('io', io);

// Auto-settlement configuration
const AUTO_SETTLEMENT_MS = 4000;
const SETTLEMENT_CHECK_INTERVAL_MS = 10000; // Check every 10 seconds instead of 2

// Initialize MongoDB data on startup
async function initializeMongoData() {
  try {
    await pingDatabase();
    console.log('✅ MongoDB connected');

    // Check if we have recipients, if not, seed initial data
    const existingRecipients = await RecipientModel.findAll();
    if (existingRecipients.length === 0) {
      console.log('📝 Seeding initial recipients...');
      await RecipientModel.create({
        name: 'Mom',
        payment_method: 'upi_id',
        upi_id: '9876543210@oksbi',
        nickname: 'Mom',
        category: 'family',
        last_amount: 5000,
      });
      await RecipientModel.create({
        name: 'Electricity Board',
        payment_method: 'upi_id',
        upi_id: 'electricity@paytm',
        nickname: 'Electricity',
        category: 'bills',
        last_amount: 1200,
      });
      await RecipientModel.create({
        name: 'John Doe',
        payment_method: 'mobile_number',
        mobile_number: '9876543210',
        nickname: 'John',
        category: 'friends',
        last_amount: 500,
      });
      console.log('✅ Initial recipients seeded');
    }
  } catch (error) {
    console.error('❌ MongoDB initialization error:', error.message);
    console.log('⚠️  Continuing with in-memory mode');
  }
}

// Initialize MongoDB data (non-blocking)
initializeMongoData();

// API Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/links', paymentLinkRoutes); // Alias for /api/payment-links
app.use('/api/payment-links', paymentLinkRoutes);
app.use('/api/payment-forms', paymentFormRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/receipts', receiptRoutes); // Receipt PDF download
app.use('/api/ai', aiRoutes); // AI assistant layer (optional, requires OPENAI_API_KEY)
app.use('/api/analytics', analyticsRoutes); // Modular analytics controller

// Simulate UPI settlement for demo: auto-complete pending transactions after a short delay
// Uses SETTLEMENT_CHECK_INTERVAL_MS (10 seconds) to avoid excessive polling
setInterval(async () => {
  try {
    const now = Date.now();
    const pendingTxns = await TransactionModel.findAll({ status: TransactionStatus.PENDING });

    for (const txn of pendingTxns.items) {
      const createdAt = new Date(txn.created_date).getTime();
      if (Number.isNaN(createdAt)) continue;
      if (now - createdAt < AUTO_SETTLEMENT_MS) continue;

      const updated = await TransactionModel.updateStatus(txn.id, TransactionStatus.SUCCESS);

      io.emit('transaction:updated', updated);
      io.emit('payment:notification', {
        type: 'completed',
        data: updated,
        timestamp: updated.updated_date,
      });
      emitStatsUpdate();
    }
  } catch (error) {
    console.error('Error in auto-settlement:', error.message);
  }
}, SETTLEMENT_CHECK_INTERVAL_MS);

async function emitStatsUpdate() {
  try {
    const stats = await TransactionModel.getStats();
    const recipients = await RecipientModel.findAll();
    io.emit('stats:update', {
      totalTransactions: stats.total.count,
      totalRecipients: recipients.length,
      activeUsers: io.engine.clientsCount
    });
  } catch (error) {
    console.error('Error emitting stats:', error.message);
  }
}

// Recipients API
app.get('/api/recipients', async (req, res) => {
  try {
    const recipients = await RecipientModel.findAll();
    res.json({ success: true, data: recipients, total: recipients.length });
  } catch (error) {
    console.error('Error fetching recipients:', error.message);
    res.json({ success: true, data: [], total: 0 });
  }
});

app.get('/api/recipients/:id', async (req, res) => {
  try {
    const recipient = await RecipientModel.findById(req.params.id);
    if (!recipient) {
      return res.status(404).json({ success: false, error: 'Recipient not found' });
    }
    return res.json({ success: true, data: recipient });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/recipients', async (req, res) => {
  try {
    const newRecipient = await RecipientModel.create({
      ...req.body,
      usage_count: 0,
    });

    // Broadcast to all connected clients
    io.emit('recipient:created', newRecipient);

    res.json({ success: true, data: newRecipient });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/recipients/:id', async (req, res) => {
  try {
    const updated = await RecipientModel.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Recipient not found' });
    }

    io.emit('recipient:updated', updated);

    res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/recipients/:id', async (req, res) => {
  try {
    const deleted = await RecipientModel.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Recipient not found' });
    }

    io.emit('recipient:deleted', { id: req.params.id });

    res.json({ success: true, message: 'Recipient deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/recipients/:id/usage', async (req, res) => {
  try {
    const { amount } = req.body;
    const updated = await RecipientModel.updateUsage(req.params.id, { amount });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Recipient not found' });
    }

    io.emit('recipient:updated', updated);

    res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Transactions API
app.get('/api/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    console.log('[API] Fetching transactions with params:', { page, limit, status });
    
    // Validate parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid page parameter' 
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid limit parameter (must be 1-100)' 
      });
    }
    
    const result = await TransactionModel.findAll({
      page: pageNum,
      limit: limitNum,
      status
    });
    
    console.log('[API] Transactions fetched successfully:', result.items.length, 'items');

    res.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total
      }
    });
  } catch (error) {
    console.error('[API ERROR] /api/transactions:', error.message);
    console.error('[API ERROR] Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const newTransaction = await TransactionModel.create({
      ...req.body,
      direction: req.body.direction || 'sent',
      status: req.body.status || TransactionStatus.PENDING,
    });

    // Broadcast real-time update
    io.emit('transaction:created', newTransaction);
    io.emit('payment:notification', {
      type: 'initiated',
      data: newTransaction,
      timestamp: new Date().toISOString()
    });

    // Update recipient usage if recipientId provided
    if (req.body.recipientId) {
      try {
        await RecipientModel.updateUsage(req.body.recipientId, { amount: req.body.amount });
        const updatedRecipient = await RecipientModel.findById(req.body.recipientId);
        io.emit('recipient:updated', updatedRecipient);
      } catch (err) {
        console.error('Error updating recipient usage:', err.message);
      }
    }

    emitStatsUpdate();

    res.json({ success: true, data: newTransaction });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Simulate receiving money (e.g., someone sent money to you via UPI/mobile)
app.post('/api/transactions/receive', async (req, res) => {
  try {
    const { sender_name, upi_id, mobile_number, amount, note, payment_method } = req.body;
    if (!amount || !sender_name) {
      return res.status(400).json({ success: false, error: 'amount and sender_name are required' });
    }
    const newTransaction = await TransactionModel.create({
      payment_method: payment_method || (upi_id ? 'upi_id' : 'mobile_number'),
      upi_id: upi_id || null,
      mobile_number: mobile_number || null,
      recipient_name: sender_name,
      amount,
      note: note || `Received from ${sender_name}`,
      status: TransactionStatus.SUCCESS,
      direction: 'received',
      sender_name,
    });
    io.emit('transaction:created', newTransaction);
    io.emit('payment:notification', {
      type: 'received',
      data: newTransaction,
      timestamp: new Date().toISOString()
    });
    emitStatsUpdate();
    res.json({ success: true, data: newTransaction });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/transactions/:id', async (req, res) => {
  try {
    const transaction = await TransactionModel.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }
    return res.json({ success: true, data: transaction });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/transactions/:id/status', async (req, res) => {
  try {
    const { status, error } = req.body;
    if (!['pending', 'success', 'failed'].includes(status)) {
      return res.status(422).json({ success: false, error: 'Invalid transaction status' });
    }

    const updated = await TransactionModel.updateStatus(req.params.id, status, error || null);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    io.emit('transaction:updated', updated);
    io.emit('payment:notification', {
      type: status === 'success' ? 'completed' : status === 'failed' ? 'failed' : 'updated',
      data: updated,
      timestamp: new Date().toISOString()
    });
    emitStatsUpdate();

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Auth API (MongoDB-based)
const { registerUser, loginUser, logout, getOrCreateDemoUser } = await import('./src/auth/auth.js');

// Get or create demo user on startup
getOrCreateDemoUser();

app.get('/api/auth/me', async (req, res) => {
  try {
    const { getCurrentUser } = await import('./src/auth/auth.js');
    const user = await getCurrentUser();
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error getting current user:', error.message);
    res.json({
      success: true,
      data: {
        id: 'user_1',
        email: 'demo@payapp.local',
        name: 'Demo User',
        created_date: new Date().toISOString()
      }
    });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    
    const result = await registerUser({ email, password, name });
    
    if (result.success) {
      res.status(201).json({ success: true, user: result.user, token: result.token });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error registering user:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    
    const result = await loginUser(email, password);
    
    if (result.success) {
      res.json({ success: true, user: result.user, token: result.token });
    } else {
      res.status(401).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error logging in user:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  const result = await logout();
  res.json(result);
});

// Public settings (mock)
app.get('/api/settings/public', (req, res) => {
  res.json({
    success: true,
    data: {
      rbiDisclaimer: 'This is an RBI-regulated payment service. Transactions are encrypted with 256-bit encryption.',
      supportEmail: 'support@payapp.local',
      version: '1.0.0',
      features: {
        subscriptions: true,
        paymentLinks: true,
        qrPayments: true
      }
    }
  });
});

// Subscriptions API (MongoDB)
app.get('/api/subscriptions', async (req, res) => {
  try {
    const subscriptions = await SubscriptionModel.findAll();
    res.json({ success: true, data: subscriptions, total: subscriptions.length });
  } catch (error) {
    console.error('Error fetching subscriptions:', error.message);
    res.json({ success: true, data: [], total: 0 });
  }
});

app.post('/api/subscriptions', async (req, res) => {
  try {
    const body = req.body;
    // Normalize camelCase fields from frontend to snake_case for SubscriptionModel
    const newSubscription = await SubscriptionModel.create({
      name: body.name,
      amount: body.amount,
      frequency: body.frequency,
      recipient_name: body.recipientName || body.recipient_name,
      upi_id: body.upiId || body.upi_id || null,
      mobile_number: body.mobileNumber || body.mobile_number || null,
      note: body.note || '',
      user_id: body.userId || body.user_id || 'user_1',
    });
    io.emit('subscription:created', newSubscription);
    res.json({ success: true, data: newSubscription });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/subscriptions/due', async (req, res) => {
  try {
    const dueSubscriptions = await SubscriptionModel.findDue();
    res.json({ success: true, data: dueSubscriptions, total: dueSubscriptions.length });
  } catch (error) {
    console.error('Error fetching due subscriptions:', error.message);
    res.json({ success: true, data: [], total: 0 });
  }
});

app.post('/api/subscriptions/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionId } = req.body;

    const subscription = await SubscriptionModel.recordPayment(id, transactionId);
    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    io.emit('subscription:updated', subscription);
    res.json({ success: true, data: subscription });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/subscriptions/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await SubscriptionModel.toggle(id);
    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    io.emit('subscription:updated', subscription);
    res.json({ success: true, data: subscription });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/subscriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await SubscriptionModel.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    io.emit('subscription:deleted', { id });
    res.json({ success: true, message: 'Subscription deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Socket.IO real-time events
io.on('connection', async (socket) => {
  console.log(`✅ Client connected: ${socket.id} (auth: ${socket.authenticated})`);

  // Send connection acknowledgment with auth info
  socket.emit('connected', {
    socketId: socket.id,
    authenticated: socket.authenticated,
    user: socket.user || null,
  });

  // Join user-specific room if authenticated
  if (socket.authenticated && socket.user?.id) {
    socket.join(`user:${socket.user.id}`);
    console.log(`📁 Client ${socket.id} joined user room: user:${socket.user.id}`);
  }

  // Handle socket-level errors gracefully
  socket.on('error', (error) => {
    console.error(`[Socket.IO] Error on socket ${socket.id}:`, error.message);
  });

  // Send current stats on connect
  try {
    const stats = await TransactionModel.getStats();
    const recipients = await RecipientModel.findAll();
    socket.emit('stats:update', {
      totalTransactions: stats.total.count,
      totalRecipients: recipients.length,
      activeUsers: io.engine.clientsCount
    });
  } catch (error) {
    console.error('Error sending initial stats:', error.message);
    socket.emit('stats:update', {
      totalTransactions: 0,
      totalRecipients: 0,
      activeUsers: io.engine.clientsCount
    });
  }

  socket.on('disconnect', (reason) => {
    console.log(`❌ Client disconnected: ${socket.id} - Reason: ${reason}`);
  });

  // Handle reconnection
  socket.on('reconnect', () => {
    console.log(`🔄 Client reconnected: ${socket.id}`);
  });

  // Handle reconnection attempt
  socket.on('reconnect_attempt', () => {
    console.log(`🔁 Reconnection attempt for: ${socket.id}`);
  });

  // Real-time payment notifications
  socket.on('payment:initiate', (data) => {
    io.emit('payment:notification', {
      type: 'initiated',
      data,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('payment:complete', (data) => {
    io.emit('payment:notification', {
      type: 'completed',
      data,
      timestamp: new Date().toISOString()
    });
  });
});

// Error handling
app.use(errorMiddleware);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Kill any process occupying PORT, then start listening
async function startServer(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const started = await tryListen();
    if (started) return;
    if (attempt < retries) {
      console.log(`⏳ Retrying in 1s... (attempt ${attempt}/${retries})`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  console.error(`\n❌ Could not bind to port ${PORT} after ${retries} attempts. Exiting.`);
  process.exit(1);
}

function tryListen() {
  return new Promise((resolve) => {
    httpServer.once('error', async (error) => {
      if (error.code === 'EADDRINUSE') {
        console.warn(`⚠️  Port ${PORT} in use — attempting to free it automatically...`);
        const freed = await killPortProcess(PORT);
        if (freed) {
          console.log(`✅ Port ${PORT} freed. Restarting listener...`);
          // Remove all listeners so we can re-attach cleanly
          httpServer.removeAllListeners('error');
        } else {
          console.error(`❌ Could not free port ${PORT} automatically.`);
        }
        resolve(false);
      } else {
        console.error('\n❌ Server error:', error);
        process.exit(1);
      }
    });

    httpServer.listen(PORT, () => {
      console.log(`\n🚀 Backend server running on http://localhost:${PORT}`);
      console.log(`📡 Socket.IO ready for real-time updates`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5174'}\n`);
      resolve(true);
    });
  });
}

// Use Node's built-in child_process to kill whatever owns the port (Windows)
async function killPortProcess(port) {
  const { execSync } = await import('child_process');
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const pids = [...new Set(
      out.split('\n')
        .filter(l => l.includes('LISTENING'))
        .map(l => l.trim().split(/\s+/).pop())
        .filter(Boolean)
    )];
    if (pids.length === 0) return true; // already free
    for (const pid of pids) {
      try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); } catch (_) {}
    }
    // Give OS 600ms to release the port
    await new Promise(r => setTimeout(r, 600));
    return true;
  } catch (_) {
    return false;
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, io };
