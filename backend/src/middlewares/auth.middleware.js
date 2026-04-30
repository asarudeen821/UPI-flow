/**
 * Auth middleware — validates Bearer token with JWT verification.
 * Supports both production (JWT) and development (mock) modes.
 */
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Missing or invalid authorization header'
    });
  }

  const token = auth.substring(7); // Remove 'Bearer ' prefix

  if (!token || token.trim() === '') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Empty token provided'
    });
  }

  // Check if we're in development mode with mock auth enabled
  const isDevMockAuth = env.nodeEnv === 'development' && process.env.USE_MOCK_AUTH === 'true';
  
  if (isDevMockAuth) {
    // Development mode: attach mock user for easier testing
    req.user = {
      id: 'dev_user',
      email: 'dev@example.com',
      name: 'Development User',
      role: 'user'
    };
    return next();
  }

  // Production mode: verify JWT token
  try {
    if (!env.jwtSecret) {
      console.error('JWT_SECRET is not configured!');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error' 
      });
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    
    // Attach decoded user info to request
    req.user = {
      id: decoded.userId || decoded.id || decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role || 'user'
    };
    
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Token has expired'
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid token'
      });
    }

    // Log unexpected errors
    console.error('JWT verification error:', err.message);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Token verification failed'
    });
  }
}

// Optional auth — attaches user if token is valid, but doesn't block if missing/invalid
export function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    // No auth header - continue without user
    return next();
  }

  const token = auth.substring(7);

  if (!token || token.trim() === '') {
    // Empty token - continue without user
    return next();
  }

  const isDevMockAuth = env.nodeEnv === 'development' && process.env.USE_MOCK_AUTH === 'true';

  if (isDevMockAuth) {
    req.user = {
      id: 'dev_user',
      email: 'dev@example.com',
      name: 'Development User',
      role: 'user'
    };
    return next();
  }

  try {
    if (!env.jwtSecret) {
      return next();
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = {
      id: decoded.userId || decoded.id || decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role || 'user'
    };
    next();
  } catch {
    // Token invalid - continue without user
    next();
  }
}
