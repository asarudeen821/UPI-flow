# Authentication Implementation with MongoDB

## Overview

The authentication system has been fully implemented with MongoDB storage and JWT tokens.

## Features Implemented

### 1. **User Registration**
- Email/password-based registration
- Password hashing with bcrypt (10 salt rounds)
- JWT token generation on successful registration
- Duplicate email prevention

### 2. **User Login**
- Email/password authentication
- Password verification with bcrypt
- JWT token generation (7 days expiry)
- Demo mode: allows login without registered users

### 3. **JWT Token Management**
- Token generation with `jsonwebtoken`
- Token verification
- Token storage in localStorage (browser)
- Automatic token expiry handling

### 4. **User Storage (MongoDB)**
- Users stored in `users` collection
- Fields: email, name, password_hash, phone, role, is_verified
- Unique index on email

### 5. **Auth Middleware**
- Express middleware for protected routes
- Validates JWT from Authorization header
- Development fallback to demo user

## API Endpoints

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "User Name"
}

Response:
{
  "success": true,
  "user": { "id": "...", "email": "...", "name": "..." },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}

Response:
{
  "success": true,
  "user": { "id": "...", "email": "...", "name": "..." },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": { "id": "...", "email": "...", "name": "..." }
}
```

### Logout
```http
POST /api/auth/logout

Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Auth Functions

### Token Management
```javascript
import { generateToken, verifyToken, storeToken, getStoredToken, clearToken } from './src/auth/auth.js';

// Generate JWT token
const token = generateToken(user);

// Verify token
const decoded = verifyToken(token);

// Store in browser localStorage
storeToken(token, 604800); // 7 days

// Get stored token
const token = getStoredToken();

// Clear token
clearToken();
```

### User Management
```javascript
import { registerUser, loginUser, getCurrentUser, logout } from './src/auth/auth.js';

// Register new user
const result = await registerUser({ email, password, name });

// Login user
const result = await loginUser(email, password);

// Get current user
const user = await getCurrentUser();

// Logout
await logout();
```

### Password Utilities
```javascript
import { hashPassword, comparePassword } from './src/auth/auth.js';

// Hash password
const hash = await hashPassword('mypassword');

// Compare password
const isValid = await comparePassword('mypassword', hash);
```

### Middleware
```javascript
import { requireAuth } from './src/auth/auth.js';

// Use in Express routes
app.get('/protected-route', requireAuth, (req, res) => {
  // req.user is available
  res.json({ user: req.user });
});
```

## Security Features

1. **Password Hashing**: bcrypt with salt rounds
2. **JWT Tokens**: Signed with secret key
3. **Token Expiry**: 7 days default
4. **Email Uniqueness**: MongoDB unique index
5. **Development Fallback**: Demo user when no users exist

## Demo Mode

For development convenience:
- If no users exist in MongoDB, any email can login
- Missing Authorization header falls back to demo user
- Invalid tokens fall back to demo user
- Demo user: `demo@payapp.local` / `demo123`

## Environment Variables

Add to `.env.local`:
```env
JWT_SECRET=your-super-secret-key-change-in-production
```

Default (development): `dev-secret-key-change-in-production`

## Dependencies

```json
{
  "jsonwebtoken": "^9.x.x",
  "bcryptjs": "^2.x.x"
}
```

## Demo User

On server startup, a demo user is automatically created:
- **Email**: demo@payapp.local
- **Password**: demo123
- **Name**: Demo User

## Testing

### Register a new user:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'
```

### Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@payapp.local","password":"demo123"}'
```

### Get current user:
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Files Modified

1. `src/auth/auth.js` - Complete rewrite with MongoDB + JWT
2. `server.js` - Added auth routes (register, login, logout)
3. `package.json` - Added jsonwebtoken, bcryptjs dependencies

## Migration Notes

- Old Base44 API calls removed
- All auth now uses MongoDB `users` collection
- JWT tokens replace Base44 tokens
- Backward compatible with demo mode
