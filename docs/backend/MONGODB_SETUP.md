# MongoDB Integration Complete

All payment data is now connected to MongoDB at `mongodb://127.0.0.1:27017/upi_app`.

## Collections Created

### 1. **recipients**
Stores payment recipients (people/businesses you send money to)
- Fields: name, payment_method, upi_id, mobile_number, nickname, category, last_amount, usage_count, created_date, updated_date
- Indexes: upi_id, mobile_number, category, usage_count

### 2. **transactions**
Stores all payment transactions
- Fields: payment_method, upi_id, mobile_number, recipient_name, recipient_id, amount, note, status, transaction_id, user_id, gateway_order_id, payment_id, error, created_date, updated_date
- Indexes: transaction_id (unique), status+created_date, created_date, user_id+created_date, recipient_id, upi_id

### 3. **subscriptions**
Stores recurring payment subscriptions
- Fields: name, amount, frequency, recipient_name, upi_id, note, user_id, status, is_active, payment_history, last_paid_date, last_transaction_id, next_due, created_date, updated_date
- Indexes: user_id, status, next_due, frequency

### 4. **payments**
Stores payment gateway orders (existing model)
- Fields: orderId, amount, currency, userId, recipientName, upiId, note, gateway, receipt, source, status, paymentId, transactionRecordId, createdAt, updatedAt
- Indexes: orderId (unique), userId+createdAt, status+createdAt

### 5. **users**
Stores user accounts
- Fields: email, name, password_hash, phone, role, is_verified, created_date, updated_date
- Indexes: email (unique), reset_token

## Models Created

All models follow the same pattern with these methods:
- `create()` - Create a new document
- `findById()` - Find by MongoDB _id
- `findAll()` - Get all documents with sorting
- `update()` - Update a document
- `delete()` - Delete a document

### Model Files
- `src/modules/recipient/recipient.model.js`
- `src/modules/transaction/transaction.model.js`
- `src/modules/subscription/subscription.model.js`
- `src/modules/user/user.model.js`
- `src/modules/payment/payment.model.js` (existing)

## API Endpoints Updated

All endpoints now use MongoDB:

### Recipients
- `GET /api/recipients` - List all recipients
- `GET /api/recipients/:id` - Get recipient by ID
- `POST /api/recipients` - Create recipient
- `PUT /api/recipients/:id` - Update recipient
- `DELETE /api/recipients/:id` - Delete recipient
- `POST /api/recipients/:id/usage` - Update recipient usage

### Transactions
- `GET /api/transactions` - List transactions (paginated)
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/:id` - Get transaction by ID
- `PATCH /api/transactions/:id/status` - Update transaction status

### Subscriptions
- `GET /api/subscriptions` - List all subscriptions
- `POST /api/subscriptions` - Create subscription
- `GET /api/subscriptions/due` - Get due subscriptions
- `POST /api/subscriptions/:id/pay` - Record payment
- `POST /api/subscriptions/:id/toggle` - Toggle active/paused
- `DELETE /api/subscriptions/:id` - Delete subscription

### Analytics
- `GET /api/analytics/overview` - Get dashboard analytics (stats, chart, top recipients, recent)

### Auth
- `GET /api/auth/me` - Get current user (with MongoDB fallback)

## Auto-Settlement

Pending transactions are automatically marked as successful after 4 seconds (simulating UPI settlement).

## Initial Data Seeding

On first startup, if no recipients exist, the system seeds:
1. Mom (UPI: 9876543210@oksbi)
2. Electricity Board (UPI: electricity@paytm)
3. John Doe (Mobile: 9876543210)

## How to Start

1. **Start MongoDB** (if not running):
   ```bash
   # Windows
   net start MongoDB
   
   # Or use MongoDB Atlas connection string in .env.local
   ```

2. **Update .env.local** (already configured):
   ```
   MONGO_URI=mongodb://127.0.0.1:27017
   MONGO_DB_NAME=upi_app
   ```

3. **Test MongoDB connection**:
   ```bash
   cd backend
   node test-mongo.js
   ```

4. **Start the backend**:
   ```bash
   npm run dev
   ```

## Fallback Behavior

If MongoDB is not available:
- Recipients API returns empty array
- Transactions API returns empty array
- Subscriptions API returns empty array
- Analytics API returns zero stats
- Auth API returns mock user

The application continues to work but data is not persisted.

## Real-time Updates

Socket.IO broadcasts are preserved:
- `recipient:created`, `recipient:updated`, `recipient:deleted`
- `transaction:created`, `transaction:updated`
- `subscription:created`, `subscription:updated`, `subscription:deleted`
- `payment:notification`
- `stats:update`
