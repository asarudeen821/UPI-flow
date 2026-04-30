# Checkout Widget System

Production-ready modular payment checkout widget system with gateway abstraction.

## Architecture

```
checkout-widget/
├── backend/                    # Payment Orchestration Layer
│   ├── src/
│   │   ├── index.js           # Main entry point
│   │   ├── app.js             # Express app setup
│   │   ├── config/            # Configuration
│   │   ├── gateways/          # Gateway adapters
│   │   ├── middlewares/       # Security & validation
│   │   ├── models/            # Database schemas
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── webhooks/          # Webhook handlers
│   │   └── utils/             # Helpers
│   ├── .env.example
│   └── package.json
│
├── sdk/                        # Frontend Embeddable Widget
│   ├── src/
│   │   ├── index.js           # SDK entry point
│   │   ├── Checkout.js        # Main checkout component
│   │   ├── components/        # UI components
│   │   ├── styles/            # CSS styles
│   │   └── utils/             # Helpers
│   ├── dist/                   # Built SDK (CDN ready)
│   └── package.json
│
└── dashboard/                  # Real-time Analytics
    ├── src/
    │   ├── components/        # Dashboard components
    │   └── pages/             # Analytics pages
    └── package.json
```

## Quick Start

### Backend Setup
```bash
cd checkout-widget/backend
npm install
cp .env.example .env
npm run dev
```

### SDK Build
```bash
cd checkout-widget/sdk
npm install
npm run build
# Output: dist/checkout.js (CDN ready)
```

### Embed in Website
```html
<script src="https://cdn.yourdomain.com/checkout.js"></script>
<div id="checkout-widget"></div>
<script>
  Checkout.init({
    publicKey: 'pk_test_xxx',
    amount: 499,
    currency: 'INR',
    productName: 'Premium Plan'
  });
</script>
```

## Features

- ✅ Multiple gateway support (Razorpay, Stripe, PayPal)
- ✅ UPI, Cards, Wallets
- ✅ Real-time webhook processing
- ✅ HMAC signature verification
- ✅ Idempotency handling
- ✅ Socket.io real-time updates
- ✅ Modular & backward compatible
