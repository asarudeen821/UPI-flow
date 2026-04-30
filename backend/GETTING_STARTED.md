# Getting Started with Payment Backend

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Edit `.env.local` with your Base44 credentials (provided in Base44 dashboard):

```env
VITE_BASE44_APP_ID=your_app_id_here
VITE_BASE44_SECRET_KEY=your_secret_key_here
```

> **Note:** In Base44 platform, these values are injected automatically. The mock SDK is used for local development.

### 3. Test the Backend

```bash
npm run dev
```

## Frontend Integration

### Import Backend Modules

```javascript
import { 
  createBackend, 
  PaymentMethod, 
  TransactionStatus 
} from './api/backend.js';
```

### Initialize in React Component

```javascript
import { useEffect, useState } from 'react';
import { createBackend, PaymentMethod } from './api/backend.js';

function App() {
  const [backend, setBackend] = useState(null);

  useEffect(() => {
    const bk = createBackend();
    bk.init().then(() => setBackend(bk));
  }, []);

  const handlePayment = async () => {
    const result = await backend.createPayment({
      payment_method: PaymentMethod.UPI_ID,
      upi_id: 'user@oksbi',
      recipient_name: 'John Doe',
      amount: 500
    });
    
    console.log(result);
  };

  return <button onClick={handlePayment}>Pay</button>;
}
```

## Available Exports

### From `frontend/src/api/backend.js`:

| Export | Type | Description |
|--------|------|-------------|
| `createBackend` | Function | Create backend instance |
| `PaymentBackend` | Class | Backend service class |
| `PaymentMethod` | Object | `{ UPI_ID, MOBILE_NUMBER }` |
| `TransactionStatus` | Object | `{ PENDING, SUCCESS, FAILED }` |
| `validateTransaction` | Function | Validate transaction data |
| `sanitizeTransactionData` | Function | Sanitize input data |
| `TransactionAPI` | Object | Transaction CRUD operations |
| `AuthAPI` | Object | Authentication operations |
| `getCurrentUser` | Function | Get authenticated user |
| `isAuthenticated` | Function | Check auth status |
| `logout` | Function | Logout user |
| `redirectToLogin` | Function | Redirect to OAuth |
| `RBI_DISCLAIMER` | Object | Compliance disclaimer texts |

## Testing Locally

The backend includes a **mock SDK** for local development. When deployed to Base44 platform, it automatically uses the real SDK.

```javascript
// Check which SDK is being used
import { healthCheck } from './api/backend.js';

const health = await healthCheck();
console.log(health); 
// { status: 'connected', timestamp: '...' }
```

## Deployment

1. Push code to GitHub
2. Connect repository to Base44
3. Set environment variables in Base44 dashboard
4. Auto-deploy on push

## Support

- Base44 Docs: https://docs.base44.com
- RBI Compliance: See `src/security/sanitization.js`
