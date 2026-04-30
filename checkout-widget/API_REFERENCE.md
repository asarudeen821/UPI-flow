# API Reference

## Checkout Widget Backend API

Base URL: `http://localhost:3001/api`

---

## Payment Endpoints

### Create Payment Order

**POST** `/payments/create`

Create a new payment order with specified gateway.

**Request Body:**
```json
{
  "publicKey": "pk_test_xxx",
  "amount": 499,
  "currency": "INR",
  "gateway": "razorpay",
  "orderId": "order_123",
  "product": {
    "name": "Premium Plan",
    "description": "Monthly subscription"
  },
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210"
  },
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_xxx",
    "orderId": "order_123",
    "keyId": "rzp_test_xxx",
    "amount": 499,
    "currency": "INR"
  }
}
```

---

### Verify Payment

**POST** `/payments/verify`

Verify payment signature after checkout completion.

**Request Body:**
```json
{
  "paymentId": "pay_xxx",
  "orderId": "order_123",
  "gatewayPaymentId": "pay_razorpay_xxx",
  "signature": "signature_hash",
  "amount": 499,
  "gateway": "razorpay"
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "data": {
    "status": "success",
    "transactionId": "pay_razorpay_xxx",
    "amount": 499,
    "currency": "INR"
  }
}
```

---

### Get Payment Status

**GET** `/payments/:paymentId/status`

Get current status of a payment.

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_xxx",
    "status": "success",
    "amount": 499,
    "currency": "INR",
    "gateway": "razorpay",
    "verified": true,
    "createdAt": "2024-01-01T10:00:00Z",
    "updatedAt": "2024-01-01T10:05:00Z"
  }
}
```

---

### Get Payment Methods

**GET** `/payments/methods`

Get all available payment methods.

**Response:**
```json
{
  "success": true,
  "data": {
    "methods": ["upi", "card", "wallet", "netbanking"],
    "gateways": ["razorpay", "stripe"]
  }
}
```

---

## Webhook Endpoints

### Process Webhook

**POST** `/webhooks/:gateway`

Universal webhook endpoint for all gateways.

**Path Parameters:**
- `gateway` - `razorpay` | `stripe` | `paypal`

**Headers:**
- Razorpay: `X-Razorpay-Signature`
- Stripe: `Stripe-Signature`

**Response:**
```json
{
  "success": true,
  "event": "payment.success",
  "processed": true
}
```

---

## Config Endpoints

### Get Public Config

**GET** `/config/public?publicKey=pk_xxx`

Get public configuration for SDK initialization.

**Response:**
```json
{
  "success": true,
  "data": {
    "publicKey": "pk_xxx",
    "gateway": "razorpay",
    "supportedMethods": ["upi", "card", "wallet"],
    "currency": "INR",
    "theme": "light",
    "branding": {
      "name": "Your Brand",
      "logo": "https://...",
      "colors": {}
    }
  }
}
```

---

## Dashboard Endpoints

### Get Dashboard Stats

**GET** `/dashboard/stats?publicKey=pk_xxx&days=7`

Get payment statistics for dashboard.

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total": { "count": 100, "amount": 49900 },
      "success": { "count": 95, "amount": 47405 },
      "failed": { "count": 3 },
      "pending": { "count": 2 },
      "successRate": 95
    },
    "chart": [
      { "date": "Jan 1", "amount": 5000, "count": 10 },
      { "date": "Jan 2", "amount": 7500, "count": 15 }
    ],
    "period": {
      "days": 7,
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-01-07T23:59:59Z"
    }
  }
}
```

---

### Get Recent Payments

**GET** `/dashboard/recent?publicKey=pk_xxx&limit=10`

Get recent payment transactions.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "paymentId": "pay_xxx",
      "amount": 499,
      "currency": "INR",
      "status": "success",
      "gateway": "razorpay",
      "paymentMethod": "upi",
      "customer": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "product": {
        "name": "Premium Plan"
      },
      "createdAt": "2024-01-01T10:00:00Z"
    }
  ]
}
```

---

### Get Gateway Breakdown

**GET** `/dashboard/gateways?publicKey=pk_xxx&days=7`

Get payment breakdown by gateway.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "gateway": "razorpay",
      "count": 80,
      "amount": 39920,
      "successCount": 76,
      "successRate": 95
    },
    {
      "gateway": "stripe",
      "count": 20,
      "amount": 9980,
      "successCount": 19,
      "successRate": 95
    }
  ]
}
```

---

### Get Payment Method Usage

**GET** `/dashboard/methods?publicKey=pk_xxx&days=7`

Get usage statistics by payment method.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "method": "upi",
      "count": 50,
      "amount": 24950,
      "percentage": 52.6
    },
    {
      "method": "card",
      "count": 35,
      "amount": 17465,
      "percentage": 36.8
    },
    {
      "method": "wallet",
      "count": 10,
      "amount": 4990,
      "percentage": 10.5
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation error",
  "details": ["amount is required", "publicKey is invalid"]
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Payment not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Rate Limiting

- Default: 100 requests per 15 minutes per IP
- Headers included:
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

---

## Authentication

### Public Key Authentication
Most endpoints require a valid `publicKey` in the request body.

### Webhook Signature
Webhooks are verified using HMAC-SHA256 signatures.

---

## WebSocket Events

Connect to Socket.IO for real-time updates:

```javascript
const socket = io('http://localhost:3001');

// Subscribe to payment updates
socket.emit('subscribe-payment', paymentId);

// Listen for updates
socket.on('payment:update', (data) => {
  console.log('Payment update:', data);
});
```

**Events:**
- `payment:update` - Payment status changed
- `connect` - Socket connected
- `disconnect` - Socket disconnected

---

## SDK Methods

### Initialize
```javascript
Checkout.init({
  publicKey: 'pk_xxx',
  amount: 499,
  currency: 'INR',
  productName: 'Premium Plan',
  gateway: 'razorpay',
  methods: ['upi', 'card', 'wallet']
});
```

### Open/Close
```javascript
Checkout.open();
Checkout.close();
```

### Event Handlers
```javascript
Checkout.on('payment:success', (data) => {});
Checkout.on('payment:failed', (error) => {});
Checkout.on('payment:cancelled', () => {});
```

---

## Code Examples

### cURL Examples

**Create Payment:**
```bash
curl -X POST http://localhost:3001/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "publicKey": "pk_test",
    "amount": 499,
    "currency": "INR",
    "gateway": "razorpay",
    "orderId": "order_123",
    "product": {"name": "Test Product"}
  }'
```

**Verify Payment:**
```bash
curl -X POST http://localhost:3001/api/payments/verify \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "pay_xxx",
    "orderId": "order_123",
    "gatewayPaymentId": "pay_xxx",
    "signature": "xxx",
    "gateway": "razorpay"
  }'
```

---

## Testing

### Test Cards (Razorpay)
- Success: `4111 1111 1111 1111`
- Failure: `4000 0000 0000 0002`

### Test Mode
Use test keys for development:
- Razorpay: `rzp_test_xxx`
- Stripe: `sk_test_xxx`

---

**API Version:** 1.0.0  
**Last Updated:** 2024
