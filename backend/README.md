# Payment Backend

Backend implementation for the payment application, powered by **Base44**.

## Features

- **Entity Management**: Transaction entity with RBI-compliant schema
- **API Layer**: Full CRUD operations via `@base44/sdk`
- **Authentication**: Token-based (JWT) with OAuth redirect
- **Security**: Input sanitization, 256-bit encryption mention, RBI compliance
- **Deployment**: Vite bundler ready, Base44 hosting compatible

## Structure

```
backend/
├── src/
│   ├── Entities/
│   │   └── Transaction.js    # Schema definition & validation
│   ├── api/
│   │   └── base44Client.js   # Base44 SDK wrapper
│   ├── auth/
│   │   └── auth.js           # Authentication & session management
│   ├── security/
│   │   └── sanitization.js   # Input sanitization & security utils
│   ├── config/
│   │   └── index.js          # Configuration management
│   └── index.js              # Main entry point
├── .env.local                # Environment variables (template)
├── .gitignore
└── package.json
```

## Installation

```bash
cd backend
npm install
```

## Configuration

Copy `.env.local` and update with your Base44 credentials:

```env
VITE_BASE44_API_URL=https://api.base44.com
VITE_BASE44_APP_ID=your_app_id_here
VITE_BASE44_SECRET_KEY=your_secret_key_here

NODE_ENV=development
PORT=3000

ENCRYPTION_KEY=your_256bit_encryption_key_here
```

## Usage

### Import the Backend

```javascript
import { createBackend, PaymentMethod, TransactionStatus } from './backend/src/index.js';

// Create backend instance
const backend = createBackend();

// Initialize
await backend.init();
```

### Create a Payment

```javascript
const result = await backend.createPayment({
  payment_method: PaymentMethod.UPI_ID,
  upi_id: 'user@oksbi',
  recipient_name: 'John Doe',
  amount: 500,
  note: 'Payment for services'
});

if (result.success) {
  console.log('Transaction created:', result.data.transaction_id);
} else {
  console.error('Errors:', result.errors);
}
```

### Get Payment History

```javascript
const history = await backend.getPaymentHistory({
  page: 1,
  limit: 20,
  sortBy: 'created_date',
  order: 'desc'
});
```

### Authentication

```javascript
// Check if user is authenticated
const isAuth = await backend.isUserAuthenticated();

// Get current user
const user = await backend.getUser();

// Logout
await backend.logoutUser();

// Get login URL
const loginUrl = backend.getLoginUrl('/callback');
```

## Transaction Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payment_method` | enum | ⭐ Yes | `upi_id` or `mobile_number` |
| `upi_id` | string | Conditional | Required if payment_method = 'upi_id' |
| `mobile_number` | string | Conditional | Required if payment_method = 'mobile_number' |
| `recipient_name` | string | Yes | Recipient full name |
| `amount` | number | ⭐ Yes | Amount in INR |
| `note` | string | No | Transaction note |
| `status` | enum | ⭐ Yes | `pending`, `success`, `failed` (default: `pending`) |
| `transaction_id` | string | Auto | Unique reference ID |
| `id` | string | Auto | Base44 generated ID |
| `created_date` | date | Auto | Base44 timestamp |
| `updated_date` | date | Auto | Base44 timestamp |
| `created_by` | string | Auto | Base44 user ID |

## API Methods

### TransactionAPI

- `create(transactionData)` - Create payment record
- `list(options)` - Fetch history (sorted, paginated)
- `getById(id)` - Get transaction by ID
- `getByTransactionId(transactionId)` - Get by unique reference
- `updateStatus(id, status)` - Update transaction status

### AuthAPI

- `me()` - Get current user
- `logout()` - Session termination
- `getLoginRedirectUrl(redirectUri)` - OAuth redirect handler
- `isUserRegistered()` - Check user registration
- `getPublicSettings()` - App-level access control

## Security Features

- ✅ Input sanitization for all user inputs
- ✅ UPI ID format validation
- ✅ Indian mobile number validation (10-digit, 6-9 prefix)
- ✅ Amount validation (min/max limits)
- ✅ XSS prevention for React controlled inputs
- ✅ 256-bit encryption mention (trust signal)
- ✅ RBI compliance disclaimer

## Deployment

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

### Base44 Hosting

1. Sync repository to GitHub
2. Connect to Base44 hosting
3. Set environment variables in Base44 dashboard
4. Auto-deploy on push

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_BASE44_API_URL` | Base44 API endpoint | Yes |
| `VITE_BASE44_APP_ID` | Application ID | Yes |
| `VITE_BASE44_SECRET_KEY` | Secret key | Yes |
| `NODE_ENV` | Environment mode | No (default: development) |
| `PORT` | Server port | No (default: 3000) |
| `ENCRYPTION_KEY` | Encryption key | Yes |
| `PAYMENT_DISCLAIMER` | RBI disclaimer text | No |

## License

ISC
