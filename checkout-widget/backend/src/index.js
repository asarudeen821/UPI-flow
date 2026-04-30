/**
 * Checkout Widget Backend - Main Entry Point
 * Payment Orchestration Layer
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import app from './app.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB } from './config/database.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 3001;

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO for real-time updates
const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io accessible to routes
app.set('io', io);

// Database connection
connectDB();

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
  
  // Join payment status room for real-time updates
  socket.on('subscribe-payment', (paymentId) => {
    socket.join(`payment:${paymentId}`);
    logger.info(`Socket ${socket.id} subscribed to payment:${paymentId}`);
  });
  
  // Leave payment status room
  socket.on('unsubscribe-payment', (paymentId) => {
    socket.leave(`payment:${paymentId}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  logger.info(`
╔════════════════════════════════════════════════════════╗
║  🚀 Checkout Widget Backend Server                     ║
╠════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                          ║
║  Environment: ${process.env.NODE_ENV || 'development'}                              ║
║  Socket.IO: Ready                                      ║
║  Webhooks: /api/webhooks/:gateway                      ║
╚════════════════════════════════════════════════════════╝
  `);
});

export { app, io, server };
