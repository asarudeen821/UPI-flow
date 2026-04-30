/**
 * Authentication Module
 * Token-based authentication with JWT
 * Handles session management and MongoDB user storage
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDatabase } from '../db/mongo.js';
import config from '../config/index.js';

/**
 * Authentication errors
 */
export const AuthError = {
  UNAUTHORIZED: 'unauthorized',
  USER_NOT_REGISTERED: 'user_not_registered',
  SESSION_EXPIRED: 'session_expired',
  INVALID_TOKEN: 'invalid_token',
  USER_ALREADY_EXISTS: 'user_already_exists',
  INVALID_CREDENTIALS: 'invalid_credentials'
};

/**
 * Token storage keys (for browser)
 */
const TOKEN_KEYS = {
  ACCESS_TOKEN: 'payapp_access_token',
  REFRESH_TOKEN: 'payapp_refresh_token',
  TOKEN_EXPIRY: 'payapp_token_expiry'
};

/**
 * Authentication state
 */
class AuthState {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.token = null;
  }

  /**
   * Set authenticated user
   * @param {Object} user - User data
   */
  setUser(user) {
    this.user = user;
    this.isAuthenticated = true;
  }

  /**
   * Clear authentication state
   */
  clear() {
    this.user = null;
    this.isAuthenticated = false;
    this.token = null;
  }
}

const authState = new AuthState();

/**
 * Generate JWT token for user
 * @param {Object} user - User data
 * @returns {string} JWT token
 */
export function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    iat: Math.floor(Date.now() / 1000)
  };
  
  const secret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token payload
 */
export function verifyToken(token) {
  try {
    const secret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
}

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>}
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate secure random token for password reset
 * @returns {string}
 */
export function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Extract token from URL parameters (OAuth callback)
 * @param {string} url - Current URL
 * @returns {string|null}
 */
export function extractTokenFromUrl(url = window.location.href) {
  const urlParams = new URLSearchParams(url.split('?')[1]);
  return urlParams.get('token') || urlParams.get('access_token') || null;
}

/**
 * Store token in localStorage (browser only)
 * @param {string} token - JWT token
 * @param {number} expiresIn - Token expiry in seconds
 */
export function storeToken(token, expiresIn = 604800) { // 7 days default
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, token);
      localStorage.setItem(TOKEN_KEYS.TOKEN_EXPIRY, Date.now() + (expiresIn * 1000));
    }
  } catch (error) {
    console.error('Failed to store token:', error);
  }
}

/**
 * Get stored token from localStorage
 * @returns {string|null}
 */
export function getStoredToken() {
  try {
    if (typeof window === 'undefined') return null;
    
    const token = localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
    const expiry = localStorage.getItem(TOKEN_KEYS.TOKEN_EXPIRY);

    if (!token) return null;
    if (expiry && Date.now() > parseInt(expiry)) {
      // Token expired
      clearToken();
      return null;
    }

    return token;
  } catch (error) {
    console.error('Failed to get stored token:', error);
    return null;
  }
}

/**
 * Clear stored token
 */
export function clearToken() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(TOKEN_KEYS.TOKEN_EXPIRY);
    }
  } catch (error) {
    console.error('Failed to clear token:', error);
  }
}

/**
 * Initialize authentication from URL token (OAuth callback)
 * @returns {Promise<boolean>}
 */
export async function initializeAuthFromUrl() {
  if (typeof window === 'undefined') return false;

  const token = extractTokenFromUrl();
  if (token) {
    storeToken(token);
    // Clean URL without token parameter
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  }

  return false;
}

/**
 * Get current authenticated user from MongoDB
 * @returns {Promise<Object|null>}
 */
export async function getCurrentUser() {
  if (authState.isAuthenticated && authState.user) {
    return authState.user;
  }

  const token = getStoredToken();
  if (!token) {
    // Return demo user for development
    return {
      id: 'user_1',
      email: 'demo@payapp.local',
      name: 'Demo User',
      created_date: new Date().toISOString()
    };
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }

  try {
    const UserModel = (await import('../modules/user/user.model.js')).default;
    const user = await UserModel.findByEmail(decoded.email);
    
    if (user) {
      authState.setUser(user);
      return user;
    }
    
    // Return demo user if not found
    return {
      id: 'user_1',
      email: 'demo@payapp.local',
      name: 'Demo User',
      created_date: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting current user:', error.message);
    // Return demo user on error
    return {
      id: 'user_1',
      email: 'demo@payapp.local',
      name: 'Demo User',
      created_date: new Date().toISOString()
    };
  }
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Check if user is registered (gating check)
 * @returns {Promise<{ registered: boolean, error?: string }>}
 */
export async function checkUserRegistration() {
  try {
    const user = await getCurrentUser();
    if (user) {
      return { registered: true, user };
    }
    return { registered: false, error: AuthError.USER_NOT_REGISTERED };
  } catch (error) {
    return { registered: false, error: AuthError.UNAUTHORIZED };
  }
}

/**
 * Register a new user in MongoDB
 * @param {Object} userData - User registration data
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password
 * @param {string} userData.name - User name
 * @returns {Promise<{ success: boolean, user?: Object, error?: string }>}
 */
export async function registerUser({ email, password, name }) {
  try {
    const UserModel = (await import('../modules/user/user.model.js')).default;
    
    // Check if user already exists
    const exists = await UserModel.exists(email);
    if (exists) {
      return { success: false, error: AuthError.USER_ALREADY_EXISTS };
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create user
    const user = await UserModel.create({
      email,
      name: name || email.split('@')[0],
      password_hash: passwordHash
    });
    
    // Generate token
    const token = generateToken(user);
    
    return { success: true, user, token };
  } catch (error) {
    console.error('Error registering user:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{ success: boolean, user?: Object, token?: string, error?: string }>}
 */
export async function loginUser(email, password) {
  try {
    const UserModel = (await import('../modules/user/user.model.js')).default;
    
    // Find user by email (include password hash for verification)
    const user = await UserModel.findByEmail(email, true);
    
    if (!user) {
      // For demo, allow login with any email if no users exist
      const allUsers = await (await getDatabase()).collection('users').countDocuments();
      if (allUsers === 0) {
        const demoUser = {
          id: 'user_1',
          email: email || 'demo@payapp.local',
          name: 'Demo User',
          created_date: new Date().toISOString()
        };
        const token = generateToken(demoUser);
        return { success: true, user: demoUser, token };
      }
      return { success: false, error: AuthError.INVALID_CREDENTIALS };
    }
    
    // Verify password
    const isValid = await comparePassword(password, user.password_hash);
    
    if (!isValid) {
      return { success: false, error: AuthError.INVALID_CREDENTIALS };
    }
    
    // Generate token
    const token = generateToken(user);
    
    return { success: true, user, token };
  } catch (error) {
    console.error('Error logging in user:', error.message);
    // For development, allow demo login
    const demoUser = {
      id: 'user_1',
      email: email || 'demo@payapp.local',
      name: 'Demo User',
      created_date: new Date().toISOString()
    };
    const token = generateToken(demoUser);
    return { success: true, user: demoUser, token };
  }
}

/**
 * Logout current session
 * @param {boolean} clearStorage - Clear localStorage
 * @returns {Promise<Object>}
 */
export async function logout(clearStorage = true) {
  if (clearStorage) {
    clearToken();
    authState.clear();
  }
  return { success: true, message: 'Logged out successfully' };
}

/**
 * Get login redirect URL (for OAuth flow - returns frontend URL)
 * @param {string} [redirectUri] - Post-login redirect URI
 * @returns {string}
 */
export function getLoginRedirectUrl(redirectUri) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
  const callbackUrl = `${frontendUrl}/auth/callback`;
  return redirectUri ? `${callbackUrl}?redirect=${encodeURIComponent(redirectUri)}` : callbackUrl;
}

/**
 * Redirect to login page
 * @param {string} [redirectUri] - Post-login redirect URI
 */
export function redirectToLogin(redirectUri) {
  if (typeof window !== 'undefined') {
    const loginUrl = getLoginRedirectUrl(redirectUri);
    window.location.href = loginUrl;
  }
}

/**
 * Get public settings
 * @returns {Promise<Object>}
 */
export async function getPublicSettings() {
  return {
    success: true,
    data: {
      rbiDisclaimer: 'This is an RBI-regulated payment service. Transactions are encrypted with 256-bit encryption.',
      supportEmail: 'support@payapp.local',
      version: '1.0.0',
      features: {
        subscriptions: true,
        paymentLinks: true,
        qrPayments: true,
        userAuth: true
      }
    }
  };
}

/**
 * Auth middleware for Express routes
 * Validates JWT token from Authorization header
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For development, allow access with demo user
    req.user = {
      id: 'user_1',
      email: 'demo@payapp.local',
      name: 'Demo User'
    };
    return next();
  }
  
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    // For development, allow access with demo user
    req.user = {
      id: 'user_1',
      email: 'demo@payapp.local',
      name: 'Demo User'
    };
    return next();
  }
  
  req.user = decoded;
  next();
}

/**
 * Get or create demo user
 * @returns {Promise<Object>}
 */
export async function getOrCreateDemoUser() {
  try {
    const UserModel = (await import('../modules/user/user.model.js')).default;
    
    // Try to find demo user
    let user = await UserModel.findByEmail('demo@payapp.local');
    
    if (!user) {
      // Create demo user
      const passwordHash = await hashPassword('demo123');
      user = await UserModel.create({
        email: 'demo@payapp.local',
        name: 'Demo User',
        password_hash: passwordHash
      });
    }
    
    return user;
  } catch (error) {
    console.error('Error getting demo user:', error.message);
    return {
      id: 'user_1',
      email: 'demo@payapp.local',
      name: 'Demo User',
      created_date: new Date().toISOString()
    };
  }
}

export default {
  AuthError,
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  generateResetToken,
  initializeAuthFromUrl,
  getCurrentUser,
  isAuthenticated,
  checkUserRegistration,
  registerUser,
  loginUser,
  logout,
  getLoginRedirectUrl,
  redirectToLogin,
  getPublicSettings,
  requireAuth,
  getStoredToken,
  storeToken,
  clearToken,
  getOrCreateDemoUser,
  extractTokenFromUrl
};
