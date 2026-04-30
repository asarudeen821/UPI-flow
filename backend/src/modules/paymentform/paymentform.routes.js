import { Router } from 'express';
import * as controller from './paymentform.controller.js';

const router = Router();

// POST /api/payment-forms - Create a new payment form
router.post('/', controller.create);

// GET /api/payment-forms - List all payment forms
router.get('/', controller.list);

// GET /api/payment-forms/:slug - Get a payment form by slug
router.get('/:slug', controller.get);

// PUT /api/payment-forms/:id - Update a payment form
router.put('/:id', controller.update);

// DELETE /api/payment-forms/:id - Delete a payment form
router.delete('/:id', controller.remove);

// POST /api/payment-forms/qr/generate - Generate QR code from form
router.post('/qr/generate', controller.generateQR);

export default router;
