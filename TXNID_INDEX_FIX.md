# Duplicate Key Error Fix - txnId Index

## Problem

The `/api/transactions` endpoint was returning **500 Internal Server Error** with the following MongoDB error:

```
E11000 duplicate key error collection: upi_app.transactions index: txnId_1 dup key: { txnId: null }
```

### Root Cause

There was a **leftover unique index** `txnId_1` on the `transactions` collection that was causing duplicate key errors. 

In MongoDB, a **unique index treats all `null` values as duplicates**. Since the `txnId` field was not being used in the current schema (the code uses `transaction_id` instead), all documents had `txnId: null`, which violated the unique constraint.

### Indexes Before Fix

```
- _id_: {"_id":1}
- txnId_1: {"txnId":1} (unique) ← PROBLEMATIC
- sender_1_createdAt_-1: {"sender":1,"createdAt":-1} (unused)
- receiver_1_createdAt_-1: {"receiver":1,"createdAt":-1} (unused)
- transaction_id_1: {"transaction_id":1} (unique) ← CORRECT
- status_1_created_date_-1: {"status":1,"created_date":-1}
- created_date_-1: {"created_date":-1}
- user_id_1_created_date_-1: {"user_id":1,"created_date":-1}
- recipient_id_1: {"recipient_id":1}
- upi_id_1: {"upi_id":1}
```

## Solution

### 1. Dropped Problematic Index

Removed the `txnId_1` unique index that was causing the duplicate key errors.

### 2. Cleaned Up Unused Indexes

Removed old indexes from previous schema versions:
- `sender_1_createdAt_-1`
- `receiver_1_createdAt_-1`

### 3. Final Indexes

```
- _id_: {"_id":1}
- transaction_id_1: {"transaction_id":1} (unique) ← Correct unique index
- status_1_created_date_-1: {"status":1,"created_date":-1}
- created_date_-1: {"created_date":-1}
- user_id_1_created_date_-1: {"user_id":1,"created_date":-1}
- recipient_id_1: {"recipient_id":1}
- upi_id_1: {"upi_id":1}
```

## Files Modified

### `backend/src/modules/transaction/transaction.model.js`

- Added better error logging in `normalize()` function
- Added try-catch for safer document normalization
- Added console logging in `findAll()` for debugging

### `backend/server.js`

- Enhanced error logging for `/api/transactions` endpoint
- Added parameter validation for `page` and `limit` query parameters
- Added request/response timing middleware

## Testing

After the fix:
- ✅ GET `/api/transactions` returns 200 OK
- ✅ POST `/api/transactions` creates transactions successfully
- ✅ Multiple transactions can be created without duplicate key errors
- ✅ Auto-settlement of pending transactions works correctly

## How to Verify

```bash
# Test GET endpoint
curl http://localhost:3000/api/transactions

# Test POST endpoint (create new transaction)
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"payment_method":"upi_id","upi_id":"test@oksbi","recipient_name":"Test","amount":100}'
```

## Prevention

To prevent similar issues in the future:

1. **Always clean up old indexes** when changing schema field names
2. **Use sparse indexes** for optional fields: `{ unique: true, sparse: true }`
3. **Review indexes periodically** using `db.collection.getIndexes()`
4. **Monitor MongoDB logs** for duplicate key errors

## MongoDB Commands for Reference

```javascript
// List all indexes
db.transactions.getIndexes()

// Drop an index
db.transactions.dropIndex('index_name')

// Create a sparse unique index (allows multiple nulls)
db.transactions.createIndex({ fieldName: 1 }, { unique: true, sparse: true })
```
