/**
 * Database Seed Script
 * Initialize database with sample data for testing
 */

import { connectDB, getCollection } from './src/config/database.js';
import logger from './src/utils/logger.js';

async function seed() {
  try {
    await connectDB();
    logger.info('Starting database seed...');
    
    const configs = getCollection('configs');
    
    // Check if already seeded
    const existingConfig = await configs.findOne({ publicKey: 'pk_test_demo123' });
    
    if (existingConfig) {
      logger.info('Database already seeded. Skipping...');
      process.exit(0);
    }
    
    // Insert demo configuration
    await configs.insertOne({
      publicKey: 'pk_test_demo123',
      privateKey: 'sk_test_demo456',
      gateway: 'razorpay',
      gatewayConfig: {
        RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_demo',
        RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || 'demo_secret',
        RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || 'demo_webhook_secret'
      },
      supportedMethods: ['upi', 'card', 'wallet', 'netbanking'],
      currency: 'INR',
      theme: 'light',
      branding: {
        name: 'Demo Store',
        logo: '/logo.png',
        colors: {
          primary: '#2563eb',
          secondary: '#1d4ed8'
        }
      },
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    logger.info('✅ Demo configuration created');
    logger.info('Public Key: pk_test_demo123');
    
    // Insert sample payments
    const payments = getCollection('payments');
    
    const samplePayments = [
      {
        paymentId: 'pay_demo_001',
        orderId: 'order_demo_001',
        publicKey: 'pk_test_demo123',
        amount: 499,
        currency: 'INR',
        status: 'success',
        gateway: 'razorpay',
        gatewayPaymentId: 'pay_razorpay_001',
        paymentMethod: 'upi',
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '9876543210'
        },
        product: {
          name: 'Premium Plan',
          description: 'Monthly subscription'
        },
        verified: true,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        paymentId: 'pay_demo_002',
        orderId: 'order_demo_002',
        publicKey: 'pk_test_demo123',
        amount: 999,
        currency: 'INR',
        status: 'success',
        gateway: 'razorpay',
        gatewayPaymentId: 'pay_razorpay_002',
        paymentMethod: 'card',
        customer: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '9876543211'
        },
        product: {
          name: 'Enterprise Plan',
          description: 'Annual subscription'
        },
        verified: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        paymentId: 'pay_demo_003',
        orderId: 'order_demo_003',
        publicKey: 'pk_test_demo123',
        amount: 299,
        currency: 'INR',
        status: 'failed',
        gateway: 'razorpay',
        gatewayPaymentId: 'pay_razorpay_003',
        paymentMethod: 'wallet',
        customer: {
          name: 'Bob Wilson',
          email: 'bob@example.com',
          phone: '9876543212'
        },
        product: {
          name: 'Basic Plan',
          description: 'One-time purchase'
        },
        verified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    await payments.insertMany(samplePayments);
    logger.info(`✅ ${samplePayments.length} sample payments created`);
    
    // Insert sample webhook logs
    const webhookLogs = getCollection('webhook_logs');
    
    await webhookLogs.insertOne({
      eventId: 'webhook_demo_001',
      gateway: 'razorpay',
      event: 'payment.success',
      status: 'success',
      data: {
        paymentId: 'pay_demo_001',
        amount: 499
      },
      timestamp: new Date().toISOString()
    });
    
    logger.info('✅ Sample webhook logs created');
    
    logger.info('\n✅ Database seed completed successfully!');
    logger.info('\nTest Credentials:');
    logger.info('Public Key: pk_test_demo123');
    logger.info('\nSample Payments:');
    logger.info('- pay_demo_001 (Success, UPI, ₹499)');
    logger.info('- pay_demo_002 (Success, Card, ₹999)');
    logger.info('- pay_demo_003 (Failed, Wallet, ₹299)');
    
    process.exit(0);
  } catch (error) {
    logger.error('Seed error:', error);
    process.exit(1);
  }
}

// Run seed
seed();
