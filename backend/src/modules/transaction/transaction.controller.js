import TransactionModel from './transaction.model.js';

/**
 * Create a new transaction with dual-entry bookkeeping
 * POST /api/transactions
 */
export async function createTransaction(req, res, next) {
  try {
    const {
      payment_method,
      upi_id,
      mobile_number,
      recipient_name,
      recipient_id,
      amount,
      note,
      status,
      transaction_id,
      user_id,
      gateway_order_id,
      payment_id,
      direction = 'sent',
      sender_name,
      // For received transactions
      receiver_user_id = null,
      receiver_upi_id = null,
    } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(422).json({ success: false, error: 'Valid amount is required' });
    }

    if (!payment_method) {
      return res.status(422).json({ success: false, error: 'Payment method is required' });
    }

    // Check for duplicate transaction
    if (transaction_id) {
      const existing = await TransactionModel.findByTransactionId(transaction_id);
      if (existing) {
        return res.status(400).json({ 
          success: false, 
          error: 'Duplicate transaction ID',
          data: existing
        });
      }
    }

    // Create sender's transaction (money sent)
    const senderTransaction = await TransactionModel.create({
      payment_method,
      upi_id,
      mobile_number,
      recipient_name,
      recipient_id,
      amount,
      note: note || '',
      status: status || 'pending',
      transaction_id: transaction_id || `TXN${Date.now()}${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
      user_id: user_id || 'user_1',
      gateway_order_id,
      payment_id,
      direction: 'sent',
      sender_name: sender_name || null,
    });

    // Create receiver's transaction (money received) if receiver exists
    let receiverTransaction = null;
    if (receiver_user_id || receiver_upi_id) {
      receiverTransaction = await TransactionModel.create({
        payment_method: 'upi_id',
        upi_id: receiver_upi_id || upi_id,
        mobile_number: null,
        recipient_name: sender_name || 'Unknown Sender',
        recipient_id: null,
        amount,
        note: note || '',
        status: status || 'pending',
        transaction_id: senderTransaction.transaction_id, // Same transaction ID for linking
        user_id: receiver_user_id || 'user_2',
        gateway_order_id,
        payment_id,
        direction: 'received',
        sender_name: sender_name || recipient_name,
      });
    }

    // Get Socket.IO instance for real-time updates
    const io = req.app.get('io');
    
    if (io) {
      // Emit real-time events
      io.emit('transaction:created', senderTransaction);
      
      if (receiverTransaction) {
        io.emit('transaction:received', receiverTransaction);
      }

      // Emit payment notification
      io.emit('payment:notification', {
        type: status === 'success' ? 'completed' : 'initiated',
        data: senderTransaction,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[TransactionController] Transaction created:', {
      senderId: senderTransaction.id,
      receiverId: receiverTransaction?.id || null,
      amount,
      direction
    });

    res.status(201).json({ 
      success: true, 
      data: senderTransaction,
      receiver_data: receiverTransaction,
      message: 'Transaction created successfully'
    });
  } catch (err) {
    console.error('[TransactionController] Create error:', err.message);
    next(err);
  }
}

/**
 * Get all transactions with pagination
 * GET /api/transactions
 */
export async function getAllTransactions(req, res, next) {
  try {
    const { page = 1, limit = 20, status = null, user_id = null, direction = null } = req.query;
    
    console.log('[TransactionController] Fetching transactions:', { page, limit, status, user_id, direction });

    const result = await TransactionModel.findAll({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      status,
      user_id,
    });

    // Filter by direction if specified
    let items = result.items;
    if (direction) {
      items = items.filter(t => t.direction === direction);
    }

    console.log('[TransactionController] Transactions fetched:', items.length);

    res.json({
      success: true,
      data: items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      }
    });
  } catch (err) {
    console.error('[TransactionController] Get all error:', err.message);
    next(err);
  }
}

/**
 * Get transaction by ID
 * GET /api/transactions/:id
 */
export async function getTransactionById(req, res, next) {
  try {
    const { id } = req.params;
    const transaction = await TransactionModel.findById(id);

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    res.json({ success: true, data: transaction });
  } catch (err) {
    next(err);
  }
}

/**
 * Update transaction status
 * PATCH /api/transactions/:id/status
 */
export async function updateTransactionStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, error } = req.body;

    if (!status) {
      return res.status(422).json({ success: false, error: 'Status is required' });
    }

    const validStatuses = ['pending', 'success', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(422).json({ 
        success: false, 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const updated = await TransactionModel.updateStatus(id, status, error);
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('transaction:updated', updated);
      io.emit('payment:notification', {
        type: status === 'success' ? 'completed' : status === 'failed' ? 'failed' : 'updated',
        data: updated,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Get transaction analytics
 * GET /api/transactions/analytics/:userId
 */
export async function getAnalytics(req, res, next) {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    console.log('[TransactionController] Getting analytics for user:', userId, 'days:', days);

    // Get all transactions for the user
    const transactions = await TransactionModel.findAll({
      page: 1,
      limit: 1000, // Get more for analytics
      user_id: userId,
    });

    let totalSent = 0;
    let totalReceived = 0;
    const monthly = {};
    const daily = {};
    const categoryWise = {};

    const now = new Date();
    const daysAgo = new Date(now.getTime() - (parseInt(days, 10) * 24 * 60 * 60 * 1000));

    transactions.items.forEach((tx) => {
      if (tx.status !== 'success') return;

      const txDate = new Date(tx.created_date);
      if (txDate < daysAgo) return;

      const month = txDate.toLocaleString('default', { month: 'short', year: '2-digit' });
      const day = txDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

      if (!monthly[month]) monthly[month] = 0;
      if (!daily[day]) daily[day] = 0;

      if (tx.direction === 'sent') {
        totalSent += tx.amount;
        monthly[month] -= tx.amount;
        daily[day] -= tx.amount;
      } else if (tx.direction === 'received') {
        totalReceived += tx.amount;
        monthly[month] += tx.amount;
        daily[day] += tx.amount;
      }

      // Category-wise (by recipient)
      const recipient = tx.recipient_name || tx.upi_id || 'Unknown';
      if (!categoryWise[recipient]) {
        categoryWise[recipient] = { count: 0, total: 0 };
      }
      categoryWise[recipient].count += 1;
      categoryWise[recipient].total += tx.amount;
    });

    // Get chart data
    const chartData = await TransactionModel.getChartData(parseInt(days, 10));

    // Get top recipients
    const topRecipients = await TransactionModel.getTopRecipients(5);

    res.json({
      success: true,
      data: {
        totalSent,
        totalReceived,
        netBalance: totalReceived - totalSent,
        monthly,
        daily,
        categoryWise,
        chartData,
        topRecipients,
        transactionCount: transactions.items.length,
        successCount: transactions.items.filter(t => t.status === 'success').length,
      }
    });
  } catch (err) {
    console.error('[TransactionController] Analytics error:', err.message);
    next(err);
  }
}

/**
 * Get transaction timeline (grouped by date)
 * GET /api/transactions/timeline
 */
export async function getTimeline(req, res, next) {
  try {
    const { limit = 50, user_id = null } = req.query;
    
    const result = await TransactionModel.findTimeline(parseInt(limit, 10), user_id);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get transaction statistics
 * GET /api/transactions/stats
 */
export async function getStats(req, res, next) {
  try {
    const stats = await TransactionModel.getStats();
    
    // Add recent activity
    const now = new Date();
    const hourAgo = new Date(now.getTime() - (60 * 60 * 1000));
    const dayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const weekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    const [lastHourCount, lastDayCount, lastWeekCount] = await Promise.all([
      TransactionModel.countTransactionsSince(hourAgo),
      TransactionModel.countTransactionsSince(dayAgo),
      TransactionModel.countTransactionsSince(weekAgo),
    ]);

    res.json({
      success: true,
      data: {
        ...stats,
        recent: {
          last_hour: lastHourCount,
          last_24_hours: lastDayCount,
          last_7_days: lastWeekCount,
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Search transactions
 * GET /api/transactions/search?q=query
 */
export async function searchTransactions(req, res, next) {
  try {
    const { q, page = 1, limit = 20, user_id = null } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(422).json({ 
        success: false, 
        error: 'Search query must be at least 2 characters' 
      });
    }

    const result = await TransactionModel.findAll({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      user_id,
    });

    // Filter results based on search query
    const query = q.toLowerCase();
    const filtered = result.items.filter(tx => 
      (tx.upi_id || '').toLowerCase().includes(query) ||
      (tx.mobile_number || '').toLowerCase().includes(query) ||
      (tx.recipient_name || '').toLowerCase().includes(query) ||
      (tx.sender_name || '').toLowerCase().includes(query) ||
      (tx.transaction_id || '').toLowerCase().includes(query) ||
      (tx.note || '').toLowerCase().includes(query)
    );

    res.json({
      success: true,
      data: filtered,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: filtered.length,
      }
    });
  } catch (err) {
    next(err);
  }
}
