import * as qrService from './qr.service.js';

export async function generate(req, res, next) {
  try {
    const { upiId, recipientName, amount, note, orderId, expiresInHours, isPermanent } = req.body;
    if (!upiId) {
      return res.status(422).json({ success: false, error: 'upiId is required' });
    }

    const isPerm = isPermanent === true || isPermanent === 'true';
    const expiresHours = isPerm ? null : (Number.parseInt(expiresInHours, 10) || 24);
    const userId = req.user?.id || null;

    const qr = await qrService.createQR({
      upiId,
      recipientName,
      amount,
      note,
      orderId,
      expiresInHours: expiresHours,
      isPermanent: isPerm,
      userId,
    });

    console.log('[QR Generate] QR created:', {
      id: qr.id,
      ref: qr.ref,
      upiString: qr.upiString,
      formattedDate: qr.formattedDate
    });

    // Normalize response to match frontend expectations
    const data = {
      id: qr.id,
      ref: qr.ref,
      upi_id: qr.upiId,
      recipient_name: qr.recipientName,
      amount: qr.amount,
      note: qr.note,
      order_id: qr.orderId,
      upi_string: qr.upiString,  // Critical: UPI string for QR generation
      qr_image_url: qr.qrImageUrl,
      created_at: qr.createdAt,
      is_permanent: qr.isPermanent,
      expires_at: qr.expiresAt,
      scan_count: qr.scans,
      is_active: qr.status === 'active',
      status: qr.status,
      // Formatted date/time for analysis
      formatted_date: qr.formattedDate,
      formatted_day: qr.formattedDay,
      formatted_time: qr.formattedTime,
      formatted_date_time: qr.formattedDateTime,
    };

    console.log('[QR Generate] Response data:', JSON.stringify(data, null, 2));
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('[QR Generate] Error:', err);
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const result = await qrService.listQRs(userId);

    // Normalize response - map items with formatted fields
    const items = (result.items || []).map(qr => ({
      id: qr.id,
      ref: qr.ref,
      upi_id: qr.upiId,
      recipient_name: qr.recipientName,
      amount: qr.amount,
      note: qr.note,
      order_id: qr.orderId,
      upi_string: qr.upiString,  // Critical: UPI string for QR generation
      qr_image_url: qr.qrImageUrl,
      created_at: qr.createdAt,
      is_permanent: qr.isPermanent,
      expires_at: qr.expiresAt,
      scan_count: qr.scans,
      is_active: qr.status === 'active',
      status: qr.status,
      // Formatted date/time for analysis
      formatted_date: qr.formattedDate,
      formatted_day: qr.formattedDay,
      formatted_time: qr.formattedTime,
      formatted_date_time: qr.formattedDateTime,
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
    console.error('[QR List Error]:', err.message);
    next(err);
  }
}

export async function scan(req, res, next) {
  try {
    await qrService.recordScan(req.params.ref);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function resolve(req, res, next) {
  try {
    const result = await qrService.getQRByRef(req.params.ref);
    if (result.error) {
      return res.status(result.status).json({ success: false, error: result.error });
    }

    // Normalize response
    const qr = result.data;
    const data = {
      id: qr.id,
      ref: qr.ref,
      upi_id: qr.upiId,
      recipient_name: qr.recipientName,
      amount: qr.amount,
      note: qr.note,
      order_id: qr.orderId,
      upi_string: qr.upiString,
      qr_image_url: qr.qrImageUrl,
      created_at: qr.createdAt,
      is_permanent: qr.isPermanent,
      expires_at: qr.expiresAt,
      scan_count: qr.scans,
      is_active: qr.status === 'active',
      status: qr.status,
      // Formatted date/time for analysis
      formatted_date: qr.formattedDate,
      formatted_day: qr.formattedDay,
      formatted_time: qr.formattedTime,
      formatted_date_time: qr.formattedDateTime,
    };

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const removed = await qrService.deleteQR(req.params.id);
    if (!removed) {
      return res.status(404).json({ success: false, error: 'QR code not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
