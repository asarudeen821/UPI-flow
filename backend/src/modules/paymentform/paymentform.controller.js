import * as paymentFormService from './paymentform.service.js';
import * as qrService from '../qr/qr.service.js';

export async function create(req, res, next) {
  try {
    const {
      title,
      description,
      currency,
      fields,
      quickAmounts,
      allowCustomAmount,
      userId,
      upiId,
      recipientName,
    } = req.body;

    if (!title) {
      return res.status(422).json({ success: false, error: 'title is required' });
    }

    const form = await paymentFormService.createForm({
      title,
      description,
      currency,
      fields,
      quickAmounts,
      allowCustomAmount,
      userId,
      upiId,
      recipientName,
    });

    res.status(201).json({ success: true, data: form });
  } catch (err) {
    next(err);
  }
}

export async function get(req, res, next) {
  try {
    const form = await paymentFormService.getFormBySlug(req.params.slug);
    if (!form) {
      return res.status(404).json({ success: false, error: 'Form not found' });
    }
    res.json({ success: true, data: form });
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const { userId } = req.query;
    const forms = await paymentFormService.listForms(userId || null);
    res.json({ success: true, data: forms });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const form = await paymentFormService.updateForm(req.params.id, req.body);
    res.json({ success: true, data: form });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const deleted = await paymentFormService.deleteForm(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Form not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function generateQR(req, res, next) {
  try {
    const { slug, amount, note } = req.body;
    
    if (!slug) {
      return res.status(422).json({ success: false, error: 'Form slug is required' });
    }

    const form = await paymentFormService.getFormBySlug(slug);
    if (!form) {
      return res.status(404).json({ success: false, error: 'Form not found' });
    }

    if (!form.upiId) {
      return res.status(422).json({ 
        success: false, 
        error: 'Form must have a UPI ID configured to generate QR code' 
      });
    }

    const qrData = await qrService.createQR({
      upiId: form.upiId,
      recipientName: form.recipientName || form.title,
      amount: amount || null,
      note: note || `Payment for ${form.title}`,
    });

    res.json({ success: true, data: { ...qrData, form } });
  } catch (err) {
    next(err);
  }
}
