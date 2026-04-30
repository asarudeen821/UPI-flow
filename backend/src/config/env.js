import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  nodeEnv: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017',
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || 'payment_app',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  AI_MODE: process.env.AI_MODE || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
};

export function validateEnv() {
  const missing = [];
  if (!env.RAZORPAY_KEY_ID) missing.push('RAZORPAY_KEY_ID');
  if (!env.RAZORPAY_KEY_SECRET) missing.push('RAZORPAY_KEY_SECRET');
  if (!env.RAZORPAY_WEBHOOK_SECRET) missing.push('RAZORPAY_WEBHOOK_SECRET');
  return { valid: missing.length === 0, missing };
}

export default env;
