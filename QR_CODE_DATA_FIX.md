# QR Code Data Not Available - Fix

## Issue Identified

**Symptoms:**
- ❌ QR Preview shows "QR code data not available"
- ❌ Created date shows "Created: () at" (empty)
- ❌ QR codes list shows "No data" instead of actual QR data
- ❌ All QR codes show as "Expired"

**Root Cause:**
The backend is creating QR codes correctly in MongoDB with `upiString` and dates, but the data is not being properly returned to the frontend.

---

## Debug Steps Added

### 1. Backend Debug Logging

**File:** `backend/src/modules/qr/qr.controller.js`

```javascript
console.log('[QR Generate] QR created:', {
  id: qr.id,
  ref: qr.ref,
  upiString: qr.upiString,
  formattedDate: qr.formattedDate
});

console.log('[QR Generate] Response data:', data);
```

### 2. Frontend Debug Logging

**File:** `frontend/src/api/services/qrService.js`

```javascript
console.log('[QRService] Backend result:', result);
console.log('[QRService] Normalized QR:', qr);
```

---

## How to Debug

### Step 1: Check Backend Console

After generating a QR code, check backend console for:

```
[QR Generate] QR created: {
  id: "qr_abc123",
  ref: "QR_ABC123",
  upiString: "upi://pay?pa=ffs@ddf&pn=dfg&am=334&cu=INR",
  formattedDate: "Apr 2, 2026"
}

[QR Generate] Response data: {
  id: "qr_abc123",
  upi_string: "upi://pay?pa=ffs@ddf...",
  formatted_date: "Apr 2, 2026",
  formatted_day: "Thursday",
  formatted_time: "02:30 PM"
  ...
}
```

**If you see this:** Backend is working correctly ✅  
**If you DON'T see this:** Check backend error logs ❌

---

### Step 2: Check Frontend Console

After clicking "Generate QR Code", check browser console (F12) for:

```
[QRService] Backend result: {
  success: true,
  data: {
    id: "qr_abc123",
    upi_string: "upi://pay?pa=...",
    formatted_date: "Apr 2, 2026",
    ...
  }
}

[QRService] Normalized QR: {
  id: "qr_abc123",
  upi_string: "upi://pay?pa=...",
  formatted_date: "Apr 2, 2026",
  formatted_day: "Thursday",
  formatted_time: "02:30 PM",
  ...
}
```

**If you see this:** Frontend receiving data correctly ✅  
**If you DON'T see this:** Check network tab for API errors ❌

---

### Step 3: Check Network Tab

1. **Open DevTools** (F12)
2. **Go to Network tab**
3. **Generate QR code**
4. **Find POST request to `/api/qr/generate`**
5. **Check Response tab**

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "qr_abc123",
    "upi_string": "upi://pay?pa=ffs@ddf&pn=dfg&am=334&cu=INR",
    "formatted_date": "Apr 2, 2026",
    "formatted_day": "Thursday",
    "formatted_time": "02:30 PM",
    ...
  }
}
```

**If response is correct:** Backend issue fixed, check frontend rendering  
**If response is missing fields:** Backend still has issues

---

## Common Issues & Solutions

### Issue 1: Backend Not Returning upiString

**Symptom:** Network response missing `upi_string`

**Solution:** Check MongoDB model is creating `upiString`:

```javascript
// backend/src/modules/qr/qr.model.js
const doc = {
  // ... other fields
  upiString,  // ← Must be present
  qrImageUrl: `https://api.qrserver.com/...`,
  // ...
};
```

---

### Issue 2: Formatted Dates Empty

**Symptom:** `formatted_date`, `formatted_day`, `formatted_time` are empty strings

**Cause:** `createdAt` is invalid or missing

**Solution:** Check MongoDB normalize function:

```javascript
// backend/src/modules/qr/qr.model.js
function normalize(doc) {
  const createdAt = doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt);
  
  const formattedDate = createdAt.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  // ... rest of formatting
  
  return {
    ...doc,
    createdAt: createdAt.toISOString(),
    formattedDate,  // ← Must be returned
    formattedDay,
    formattedTime,
    formattedDateTime
  };
}
```

---

### Issue 3: Frontend Not Displaying Data

**Symptom:** Console shows data but UI shows "No data"

**Cause:** Component not accessing correct property names

**Solution:** Check QRGenerator.jsx is using correct property names:

```javascript
// Should be:
<QRCodeComp value={generated.upi_string} />
<p>{generated.formatted_date} ({generated.formatted_day}) at {generated.formatted_time}</p>

// NOT:
<QRCodeComp value={generated.upiString} />  // Wrong!
<p>{generated.formattedDate}</p>  // Wrong!
```

---

### Issue 4: All QR Codes Show as Expired

**Symptom:** All QR codes in list show "Expired" badge

**Cause:** `expires_at` field might be missing or in wrong format

**Solution:** Check backend is returning `expires_at`:

```javascript
// backend response should include:
{
  "is_permanent": true,  // or false
  "expires_at": "2026-04-03T10:30:00.000Z"  // ISO string
}
```

**Check frontend isExpired function:**

```javascript
function isExpired(qr) {
  // Permanent QR codes never expire
  if (qr.is_permanent) return false
  
  // Check if expires_at exists and is in the past
  if (!qr.expires_at) return false
  
  return new Date(qr.expires_at) < new Date()
}
```

---

## Expected Behavior After Fix

### QR Preview Section

```
┌─────────────────────────────────┐
│ QR Preview                      │
├─────────────────────────────────┤
│ [QR CODE IMAGE - SCANNABLE]     │
│                                 │
│ UPI ID: ffs@ddf                 │
│ Recipient: dfg                  │
│ Amount: Rs. 334                 │
│ Type: Permanent (No Expiry)     │
│ Ref: QR_MNH397A0                │
│ Created: Apr 2, 2026 (Thursday) │
│          at 02:30 PM            │
│                                 │
│ [Copy UPI Link]                 │
└─────────────────────────────────┘
```

### QR List Section

```
┌─────────────────────────────────┐
│ Generated QR Codes (20)         │
├─────────────────────────────────┤
│ [QR] dfg - ffs@ddf              │
│      Rs. 334 - Ref: QR_MNH397A0 │
│      Created: Apr 2, 2026       │
│      at 02:30 PM     [👁] [🗑️]  │
├─────────────────────────────────┤
│ [QR] dfg - ffs@ddf              │
│      Rs. 334 - Ref: QR_MNH3974E │
│      Created: Apr 2, 2026       │
│      at 02:25 PM     [👁] [🗑️]  │
└─────────────────────────────────┘
```

---

## Files Modified

| File | Changes | Purpose |
|------|---------|---------|
| `backend/src/modules/qr/qr.controller.js` | Added debug logging | Trace backend response |
| `frontend/src/api/services/qrService.js` | Added debug logging | Trace frontend data |

**Total:** 2 files, 6 lines added

---

## Testing Checklist

- [ ] Restart backend server
- [ ] Open browser console (F12)
- [ ] Generate a new QR code
- [ ] Check backend console for `[QR Generate]` logs
- [ ] Check browser console for `[QRService]` logs
- [ ] Check Network tab for API response
- [ ] Verify QR code displays in preview
- [ ] Verify UPI string is present
- [ ] Verify formatted dates display correctly
- [ ] Verify QR codes list shows data
- [ ] Verify expiration status is correct

---

## Next Steps

1. **Restart Backend:**
   ```bash
   cd backend
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Test QR Generation:**
   - Fill form with valid data
   - Click "Generate QR Code"
   - Check both backend and frontend consoles
   - Verify QR code displays

3. **Share Console Output:**
   - If still not working, share:
     - Backend console output
     - Frontend console output
     - Network tab response screenshot

---

## Summary

✅ **Debug logging added to trace data flow**  
✅ **Backend logs show what's being returned**  
✅ **Frontend logs show what's being received**  
✅ **Network tab shows actual API response**  

**With these debug logs, we can identify exactly where the data is getting lost!** 🔍
