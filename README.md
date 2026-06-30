# 🚀 Real-time UPI Flow Payment Application

Welcome to the **UPI Flow Payment Application** repository. This is a high-performance, real-time web application built with a React frontend, an Express/Node.js backend, MongoDB storage, and live synchronization powered by Socket.IO.

---

## 📁 Repository Structure

We maintain a clean and structured monorepo organization:

```
d:\payment\
├── backend/                  # Node.js + Express backend (Socket.IO & MongoDB)
├── frontend/                 # React + Vite frontend (TailwindCSS & Socket.IO client)
├── checkout-widget/          # Embedded checkout widget SDK and demo page
├── api/                      # Serverless function entry points (if deployed to serverless environments)
├── docs/                     # Restructured repository documentation & historic task summaries
│   ├── reports/              # Core task logs, fixes, and analysis reports
│   ├── backend/              # Backend environment and auth setup docs
│   ├── frontend/             # Frontend page and feature specifications
│   └── checkout-widget/      # Checkout widget reference manuals and deployment guides
├── package.json              # Monorepo task runner configuration
└── README.md                 # This file
```

---

## 📡 Architecture Diagram

```
┌─────────────────────────────────┐
│            Frontend             │
│          (React + Vite)         │
│          Port: 5174             │
└────────────────┬────────────────┘
                 │
                 │ HTTP REST APIs & WebSocket
                 ▼
┌─────────────────────────────────┐
│            Backend              │
│        (Express + Node.js)      │
│          Port: 3000             │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│            Database             │
│            (MongoDB)            │
└─────────────────────────────────┘
```

---

## ⚡ Quick Start

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and **MongoDB** installed and running on your local machine.

### 2. Installation
To install all dependencies for both the frontend and backend in one command, run:
```bash
npm run install:all
```

### 3. Running Locally
Start both the backend server and frontend development server concurrently:
```bash
npm run dev
```
- **Frontend App:** [http://localhost:5174](http://localhost:5174)
- **Backend API:** [http://localhost:3000](http://localhost:3000)

---

## 📚 Documentation & Archived Reports

All previous architectural decisions, fixes, and features are documented and archived under [docs/](file:///d:/payment/docs):

### 🛠️ Backend Documentation
- [Getting Started Guide](file:///d:/payment/docs/backend/GETTING_STARTED.md) — Steps for configuring the backend.
- [MongoDB Integration Guide](file:///d:/payment/docs/backend/MONGODB_SETUP.md) — Configuring collection indexes and connections.
- [JWT Authentication Implementation](file:///d:/payment/docs/backend/AUTH_IMPLEMENTATION.md) — Details on secure user logins and middleware.
- [Requirements reference](file:///d:/payment/docs/backend/requirements.txt) — Dependency guidelines.

### 🎨 Frontend Documentation
- [UPI Payment Features](file:///d:/payment/docs/frontend/UPI_PAYMENT_FEATURE.md) — Specifications for payment flows and forms.

### 🔌 Embedded Widget SDK
- [Widget API Reference](file:///d:/payment/docs/checkout-widget/API_REFERENCE.md) — API guidelines.
- [Deployment Guide](file:///d:/payment/docs/checkout-widget/DEPLOYMENT.md) — Deploying the widget to production.

### 📊 Historic Bug Fixes & Task Reports
- [Project Structure Analysis Report](file:///d:/payment/docs/reports/PROJECT_STRUCTURE_ANALYSIS.md) — Comprehensive review of routes and components.
- [MongoDB Integration Summary](file:///d:/payment/docs/reports/COMPLETE_MONGODB_INTEGRATION_SUMMARY.md) — Unified MongoDB architecture metrics.
- [Real-time Status Setup Guide](file:///d:/payment/docs/reports/README_REALTIME.md) — Details on Socket.IO events and channels.
- [Payment Success Notification Sounds](file:///d:/payment/docs/reports/PAYMENT_SOUND_FEATURE.md) — Details on audio and vibration cues.

*(For a full list of all historic fixes and logs, browse the [docs/reports/](file:///d:/payment/docs/reports) directory).*
