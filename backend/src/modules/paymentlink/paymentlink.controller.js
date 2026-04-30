import * as linkService from './paymentlink.service.js';

export async function create(req, res, next) {
  try {
    const { amount, description, recipientName, upiId, expiresInHours, maxUses, isPermanent } = req.body;
    if (!upiId) {
      return res.status(422).json({ success: false, error: 'upiId is required' });
    }

    const isPerm = isPermanent === true || isPermanent === 'true';
    const expiresHours = isPerm ? null : (Number.parseInt(expiresInHours, 10) || 24);
    const maxUsesValue = isPerm ? null : (maxUses ? Number.parseInt(maxUses, 10) : null);
    const userId = req.user?.id || null;

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const link = await linkService.createLink({
      amount,
      description,
      recipientName,
      upiId,
      baseUrl,
      expiresInHours: expiresHours,
      maxUses: maxUsesValue,
      isPermanent: isPerm,
      userId,
    });

    console.log('[PaymentLink Create] Link created:', {
      id: link.id,
      slug: link.slug,
      url: link.url,
      formattedDate: link.formattedDate
    });

    // Normalize response to match frontend expectations
    const data = {
      id: link.id,
      slug: link.slug,
      url: link.url,  // Critical: Full URL for sharing
      amount: link.amount,
      currency: link.currency,
      description: link.description,
      recipient_name: link.recipientName,
      upi_id: link.upiId,
      created_at: link.createdAt,
      is_permanent: link.isPermanent,
      expires_at: link.expiresAt,
      max_uses: link.maxUses,
      use_count: link.clicks,
      is_active: link.status === 'active',
      status: link.status,  // Also include raw status
      // Formatted date/time for analysis
      formatted_date: link.formattedDate,
      formatted_day: link.formattedDay,
      formatted_time: link.formattedTime,
      formatted_date_time: link.formattedDateTime,
    };

    console.log('[PaymentLink Create] Response data:', JSON.stringify(data, null, 2));
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('[PaymentLink Create] Error:', err);
    next(err);
  }
}

export async function resolve(req, res, next) {
  try {
    const result = await linkService.getBySlug(req.params.slug);
    if (result.error) {
      return res.status(result.status).json({ success: false, error: result.error });
    }
    
    // Normalize response
    const link = result.data;
    const data = {
      id: link.id,
      slug: link.slug,
      url: link.url,
      amount: link.amount,
      currency: link.currency,
      description: link.description,
      recipient_name: link.recipientName,
      upi_id: link.upiId,
      created_at: link.createdAt,
      is_permanent: link.isPermanent,
      expires_at: link.expiresAt,
      max_uses: link.maxUses,
      use_count: link.clicks,
      is_active: link.status === 'active',
      // Formatted date/time for analysis
      formatted_date: link.formattedDate,
      formatted_day: link.formattedDay,
      formatted_time: link.formattedTime,
      formatted_date_time: link.formattedDateTime,
    };
    
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const result = await linkService.listLinks(userId);

    // Normalize response - map items with formatted fields
    const items = (result.items || []).map(link => ({
      id: link.id,
      slug: link.slug,
      url: link.url,  // Critical: Full URL for sharing
      amount: link.amount,
      currency: link.currency,
      description: link.description,
      recipient_name: link.recipientName,
      upi_id: link.upiId,
      created_at: link.createdAt,
      is_permanent: link.isPermanent,
      expires_at: link.expiresAt,
      max_uses: link.maxUses,
      use_count: link.clicks,
      is_active: link.status === 'active',
      status: link.status,  // Also include raw status
      // Formatted date/time for analysis
      formatted_date: link.formattedDate,
      formatted_day: link.formattedDay,
      formatted_time: link.formattedTime,
      formatted_date_time: link.formattedDateTime,
    }));

    // Return proper structure with items array AND pagination info (with defaults)
    res.json({
      success: true,
      data: {
        items,
        total: result.total || items.length,
        page: result.page || 1,
        limit: result.limit || 50
      }
    });
  } catch (err) {
    console.error('[PaymentLink List Error]:', err.message);
    next(err);
  }
}

export async function deactivate(req, res, next) {
  try {
    const ok = await linkService.deactivateLink(req.params.id);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Link not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function recordUse(req, res, next) {
  try {
    const data = await linkService.recordUse(req.params.slug);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const ok = await linkService.deleteLink(req.params.id);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Link not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
