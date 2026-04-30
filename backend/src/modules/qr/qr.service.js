import { QRCodeModel } from './qr.model.js';

function buildUPIString({ upiId, name, amount, note }) {
  const params = new URLSearchParams({ pa: upiId, cu: 'INR' });
  if (name) {
    params.set('pn', name);
  }
  if (amount) {
    params.set('am', String(amount));
  }
  if (note) {
    params.set('tn', note);
  }
  return `upi://pay?${params.toString()}`;
}

function qrImageUrl(data, size = 300) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=png&margin=10`;
}

/**
 * Create QR code and store in MongoDB
 */
export async function createQR({
  upiId,
  recipientName,
  amount = null,
  note = '',
  orderId = null,
  expiresInHours = 24,
  isPermanent = false,
  userId = null,
  source = 'ui', // 'ui', 'chat', 'api'
}) {
  // Create in MongoDB
  const qr = await QRCodeModel.create({
    userId: userId || 'anonymous',
    upiId,
    recipientName: recipientName || 'Merchant',
    amount,
    note,
    orderId,
    expiresInHours,
    isPermanent,
    source,
  });

  return qr;
}

/**
 * Get QR code by ref
 */
export async function getQRByRef(ref) {
  const qr = await QRCodeModel.findByRef(ref);
  
  if (!qr) {
    return { error: 'QR code not found', status: 404 };
  }
  
  if (qr.status !== 'active') {
    return { error: 'QR code is inactive', status: 410 };
  }
  
  // Increment scans
  await QRCodeModel.incrementScans(ref);
  
  return { data: qr };
}

/**
 * Record a successful payment against the QR code
 */
export async function recordPayment(ref, amount) {
  await QRCodeModel.recordPayment(ref, amount);
  const updated = await QRCodeModel.findByRef(ref);
  return updated;
}

/**
 * List all QR codes for a user
 */
export async function listQRs(userId = null, page = 1, limit = 50) {
  if (userId) {
    return await QRCodeModel.findByUserId(userId, { page, limit });
  }
  return await QRCodeModel.findAll({ page, limit });
}

/**
 * Deactivate a QR code
 */
export async function deactivateQR(id) {
  await QRCodeModel.updateStatus(id, 'inactive');
  return true;
}

/**
 * Delete a QR code
 */
export async function deleteQR(id) {
  return await QRCodeModel.delete(id);
}

/**
 * Get QR code statistics
 */
export async function getQRStats(userId = null) {
  return await QRCodeModel.getStats(userId);
}
