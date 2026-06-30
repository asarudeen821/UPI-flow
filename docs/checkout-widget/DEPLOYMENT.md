# Deployment Guide

## Production-Ready Checkout Widget System

---

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB 6+
- SSL Certificate (for HTTPS)
- Domain with DNS access
- Payment Gateway Accounts (Razorpay/Stripe)

---

## 🚀 Quick Deploy

### Option 1: Docker (Recommended)

```bash
# Build Docker image
docker build -t checkout-widget ./checkout-widget/backend

# Run with environment variables
docker run -d \
  -p 3001:3001 \
  -e MONGODB_URI=mongodb://mongo:27017/checkout \
  -e RAZORPAY_KEY_ID=your_key \
  -e RAZORPAY_KEY_SECRET=your_secret \
  -e NODE_ENV=production \
  --name checkout-widget \
  checkout-widget
```

### Option 2: Manual Deployment

```bash
# Backend
cd checkout-widget/backend
npm install --production
cp .env.example .env.local
# Edit .env.local with your credentials
npm start

# SDK Build
cd checkout-widget/sdk
npm install
npm run build
# Upload dist/checkout.js to CDN
```

---

## 🔐 Environment Configuration

### Backend (.env.local)

```bash
# Server
PORT=3001
NODE_ENV=production

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/checkout

# Security
JWT_SECRET=your-super-secret-key-min-32-chars

# Razorpay
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_live_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Frontend/CORS
FRONTEND_URL=https://yourdomain.com

# Webhook (public URL)
WEBHOOK_BASE_URL=https://yourdomain.com/api/webhooks

# Automation (optional)
AUTOMATION_WEBHOOK_URL=https://hooks.zapier.com/...
```

---

## 🌐 Platform-Specific Deployment

### AWS (EC2 + MongoDB)

```bash
# 1. Launch EC2 instance (Ubuntu 22.04)
# 2. Install Node.js and MongoDB
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs mongodb

# 3. Clone and setup
git clone your-repo
cd checkout-widget/backend
npm install

# 4. Setup PM2
npm install -g pm2
pm2 start src/index.js --name checkout-widget
pm2 startup
pm2 save

# 5. Setup Nginx reverse proxy
sudo nano /etc/nginx/sites-available/checkout-widget
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location /api/webhooks {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 10M;
    }
}
```

### Vercel/Netlify (SDK Only)

```bash
# Build SDK
cd checkout-widget/sdk
npm run build

# Upload dist/checkout.js to:
# - Vercel: Add to public folder
# - Netlify: Add to static folder
# - Cloudflare R2: Upload directly
```

### Render.com

```yaml
# render.yaml
services:
  - type: web
    name: checkout-widget
    env: node
    buildCommand: cd backend && npm install
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: RAZORPAY_KEY_ID
        sync: false
```

---

## 🔗 Gateway Webhook Setup

### Razorpay Webhook

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add URL: `https://yourdomain.com/api/webhooks/razorpay`
3. Set Secret: (from your .env RAZORPAY_WEBHOOK_SECRET)
4. Enable Events:
   - ✅ payment.captured
   - ✅ payment.failed
   - ✅ order.paid

### Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - ✅ payment_intent.succeeded
   - ✅ payment_intent.payment_failed
   - ✅ charge.refunded
4. Copy signing secret to STRIPE_WEBHOOK_SECRET

---

## 📊 Database Setup

### MongoDB Atlas (Cloud)

```javascript
// 1. Create cluster at cloud.mongodb.com
// 2. Create database: checkout-widget
// 3. Create collections:
db.createCollection('payments')
db.createCollection('transactions')
db.createCollection('webhook_logs')
db.createCollection('configs')

// 4. Create indexes (automatic on first run)
db.payments.createIndex({ paymentId: 1 }, { unique: true })
db.payments.createIndex({ orderId: 1 }, { unique: true })
db.webhook_logs.createIndex({ eventId: 1 }, { unique: true })
```

### Local MongoDB

```bash
# Install MongoDB
sudo apt-get install mongodb

# Start service
sudo systemctl start mongodb

# Connection string
MONGODB_URI=mongodb://localhost:27017/checkout-widget
```

---

## 🎨 SDK Integration

### No-Code Platforms

#### Webflow
```html
<!-- Add to Custom Code → <head> -->
<script src="https://cdn.yourdomain.com/checkout.js"></script>

<!-- Add to page body -->
<div id="checkout-widget"></div>
<script>
  Checkout.init({
    publicKey: 'pk_xxx',
    amount: 499,
    productName: 'Product Name'
  });
</script>
```

#### Bubble
1. Add HTML element
2. Paste SDK script
3. Initialize with workflow

#### Glide/Softr
- Use Custom Code/Embed block
- Paste initialization code

---

## 🔒 Security Checklist

- ✅ HTTPS enabled everywhere
- ✅ Webhook secrets stored securely
- ✅ Rate limiting configured
- ✅ CORS properly configured
- ✅ MongoDB authentication enabled
- ✅ Environment variables not committed
- ✅ Payment data not logged
- ✅ Regular security updates

---

## 📈 Monitoring & Logging

### Health Check Endpoint
```bash
curl https://api.yourdomain.com/health
# Response: {"status": "healthy", "uptime": 12345}
```

### Log Files
```
backend/logs/combined.log  - All logs
backend/logs/error.log     - Error logs only
```

### Metrics to Monitor
- Payment success rate
- Webhook processing time
- API response times
- Error rates by gateway
- Database connection pool

---

## 🔄 Updates & Maintenance

### Update SDK
```bash
cd checkout-widget/sdk
npm run build
# Upload new dist/checkout.js to CDN
# Increment version in documentation
```

### Update Backend
```bash
cd checkout-widget/backend
git pull
npm install
pm2 restart checkout-widget
```

---

## 🆘 Troubleshooting

### Webhook Not Working
1. Check webhook URL is publicly accessible
2. Verify webhook secret matches
3. Check server logs for signature errors
4. Test with gateway's webhook test tool

### Payment Not Reflecting
1. Check webhook logs in database
2. Verify Socket.IO connection
3. Check payment status API
4. Review gateway dashboard

### SDK Not Loading
1. Check CDN URL is correct
2. Verify CORS headers
3. Check browser console for errors
4. Test with direct script tag

---

## 📞 Support

- Documentation: `/checkout-widget/README.md`
- API Reference: `/checkout-widget/API_REFERENCE.md`
- Issues: GitHub Issues
- Email: support@yourdomain.com

---

## ✅ Post-Deployment Checklist

- [ ] Backend running on HTTPS
- [ ] MongoDB connected and indexed
- [ ] Webhooks configured in gateway dashboards
- [ ] SDK uploaded to CDN
- [ ] Test payment successful
- [ ] Webhook received and processed
- [ ] Dashboard showing real-time updates
- [ ] Error monitoring setup
- [ ] Backup strategy configured
- [ ] Rate limiting tested

---

**Deployment Complete! 🎉**

Your checkout widget system is now live and ready to process payments.
