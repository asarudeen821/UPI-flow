import { PaymentLinkModel } from './paymentlink.model.js';
import { randomBytes } from 'crypto';

function generateSlug() {
  return `link_${randomBytes(5).toString('hex')}`;
}

/**
 * Create a payment link and store in MongoDB
 */
export async function createLink({
  amount,
  description,
  recipientName,
  upiId,
  baseUrl,
  expiresInHours = 24,
  maxUses = null,
  isPermanent = false,
  userId = null,
  source = 'ui', // 'ui', 'chat', 'api'
}) {
  const slug = generateSlug();

  // Create in MongoDB
  const link = await PaymentLinkModel.create({
    userId: userId || 'anonymous',
    amount: amount ? Number.parseFloat(amount) : null,
    currency: 'INR',
    description: description || '',
    recipientName: recipientName || 'Merchant',
    upiId: upiId || '',
    slug,
    expiresInHours,
    maxUses,
    isPermanent,
    source,
  });

  // Update URL with correct base
  link.url = `${baseUrl}/pay/${slug}`;

  return link;
}

/**
 * Get payment link by slug
 */
export async function getBySlug(slug) {
  const link = await PaymentLinkModel.findBySlug(slug);
  
  if (!link) {
    return { error: 'Payment link not found', status: 404 };
  }
  
  if (link.status !== 'active') {
    return { error: 'Payment link is inactive', status: 410 };
  }
  
  // Increment clicks
  await PaymentLinkModel.incrementClicks(slug);
  
  return { data: link };
}

/**
 * Record a successful payment against the link
 */
export async function recordUse(slug, amount) {
  await PaymentLinkModel.recordPayment(slug, amount);
  const updated = await PaymentLinkModel.findBySlug(slug);
  return updated;
}

/**
 * List all payment links for a user
 */
export async function listLinks(userId = null, page = 1, limit = 50) {
  if (userId) {
    return await PaymentLinkModel.findByUserId(userId, { page, limit });
  }
  return await PaymentLinkModel.findAll({ page, limit });
}

/**
 * Deactivate a payment link
 */
export async function deactivateLink(id) {
  await PaymentLinkModel.updateStatus(id, 'inactive');
  return true;
}

/**
 * Delete a payment link
 */
export async function deleteLink(id) {
  return await PaymentLinkModel.delete(id);
}

/**
 * Get payment link statistics
 */
export async function getLinkStats(userId = null) {
  return await PaymentLinkModel.getStats(userId);
}
