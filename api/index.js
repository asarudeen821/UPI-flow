// This repo currently uses MongoDB + Express backend (Node server) under /backend.
// Vercel serverless function entrypoints need code that handles requests.
// Create an API folder /api only if you migrate the backend to serverless.
//
// For now, this file is a placeholder to avoid confusion.

export default function handler(req, res) {
  res.status(501).json({ error: 'Not implemented. Backend is not serverless in this repo.' });
}

