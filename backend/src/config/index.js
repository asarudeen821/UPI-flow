import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const configuredFrontendDistPath = process.env.FRONTEND_DIST_PATH;

export const config = {
  server: {
    port: Number.parseInt(process.env.PORT ?? '3000', 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017',
    dbName: process.env.MONGO_DB_NAME || 'payment_app'
  },
  auth: {
    demoUserName: process.env.DEMO_USER_NAME || 'Demo User',
    demoUserEmail: process.env.DEMO_USER_EMAIL || 'demo@payapp.local'
  },
  frontend: {
    distPath: configuredFrontendDistPath
      ? path.resolve(projectRoot, configuredFrontendDistPath)
      : path.resolve(projectRoot, '..', 'frontend', 'dist')
  },
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || '',
    sessionTimeout: 3600000
  },
  payment: {
    currency: 'INR',
    minAmount: 1,
    maxAmount: 1000000,
    disclaimer:
      process.env.PAYMENT_DISCLAIMER ||
      'RBI-regulated payment service. All transactions are encrypted with 256-bit encryption.'
  }
};

export function validateConfig() {
  const missing = [];

  if (!config.mongo.uri) missing.push('MONGO_URI');
  if (!config.mongo.dbName) missing.push('MONGO_DB_NAME');

  return {
    valid: missing.length === 0,
    missing
  };
}

export default config;
