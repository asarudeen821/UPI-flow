# 🚀 AI FEATURES - QUICK START GUIDE

## ⚡ 5-Minute Setup

### 1. Add OpenAI API Key
```bash
# Edit backend/.env.local
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_MODEL=gpt-4o-mini
```

### 2. Start Backend
```bash
cd backend
npm run dev
```

### 3. Start Frontend (in new terminal)
```bash
cd frontend
npm run dev
```

### 4. Test AI Features

#### Test 1: Check AI Status
```bash
curl http://localhost:3000/api/ai/status
```
Expected: `{"success":true,"data":{"available":true,...}}`

#### Test 2: Generate Payment Form
```bash
curl -X POST http://localhost:3000/api/ai/form \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create a donation form with amounts 100, 500, 1000"}'
```

#### Test 3: Merchant Assistant
```bash
curl -X POST http://localhost:3000/api/ai/merchant \
  -H "Content-Type: application/json" \
  -d '{"message":"Generate a UPI QR code for my shop"}'
```

#### Test 4: Auto Analytics
```bash
curl http://localhost:3000/api/ai/analytics/auto
```

---

## 🎨 Frontend Testing

### 1. Open Dashboard
- Navigate to `http://localhost:5174/dashboard`
- See **AI Insights** card below stats
- Click **Refresh** icon to regenerate insights

### 2. Test Chat Widget
- Look for **floating blue chat icon** (bottom-right)
- Click to open
- Switch between **Merchant** and **Support** tabs
- Try: "Show me today's earnings"

### 3. Test Form Generator
- Navigate to `http://localhost:5174/ai-form-generator`
- Enter: "Create a subscription form with monthly/yearly options"
- Click **Generate Form**
- See live preview + JSON output

---

## 🐛 Troubleshooting

### AI Returns 503
**Cause**: `OPENAI_API_KEY` is missing or invalid
**Fix**: Check `.env.local` and restart backend

### Chat Widget Doesn't Appear
**Cause**: AI status check failed
**Fix**: Open browser console, check for errors

### "Too many AI requests"
**Cause**: Rate limit (20 req/min)
**Fix**: Wait 1 minute or increase limit in `ai.routes.js`

---

## 📝 Example Prompts

### Merchant Assistant
- "Generate a QR code for ₹500"
- "Create a payment link for my product"
- "Show me this week's analytics"

### Support Bot
- "My payment is stuck in pending"
- "How do I get a refund?"
- "What is UPI?"

### Form Generator
- "Create a donation form with ₹100, ₹500, custom amount"
- "Build a subscription form with monthly and yearly plans"
- "Make a simple payment form with name, email, and amount"

---

## ✅ Success Indicators

- ✅ Backend logs: `✅ Client connected: <socket-id>`
- ✅ Frontend: AI chat widget visible
- ✅ Dashboard: AI insights card shows data
- ✅ `/api/ai/status` returns `available: true`

---

**Ready to test!** 🎉
