import TransactionModel from './transaction.model.js';

/**
 * Get transaction history with enhanced date/time information
 * GET /api/transactions/history
 */
export async function getTransactionHistory(req, res, next) {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = null, 
      user_id = null,
      from_date = null,
      to_date = null,
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (user_id) query.user_id = user_id;
    
    // Date range filtering
    if (from_date || to_date) {
      query.created_date = {};
      if (from_date) {
        query.created_date.$gte = new Date(from_date);
      }
      if (to_date) {
        query.created_date.$lte = new Date(to_date);
      }
    }

    const result = await TransactionModel.findAllWithHistory({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      query,
    });

    res.json({ 
      success: true, 
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
      filters: {
        status,
        user_id,
        from_date,
        to_date,
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get transaction by ID with enhanced details
 * GET /api/transactions/history/:id
 */
export async function getTransactionDetails(req, res, next) {
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
 * Get transactions grouped by date for timeline view
 * GET /api/transactions/history/timeline
 */
export async function getTransactionTimeline(req, res, next) {
  try {
    const { limit = 50 } = req.query;
    const result = await TransactionModel.findTimeline(parseInt(limit, 10));
    
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Get transaction statistics with time-based insights
 * GET /api/transactions/history/stats
 */
export async function getTransactionStats(req, res, next) {
  try {
    const stats = await TransactionModel.getStats();
    
    // Add time-based insights
    const now = new Date();
    const hourAgo = new Date(now.getTime() - (60 * 60 * 1000));
    const dayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    
    const [lastHourCount, lastDayCount] = await Promise.all([
      TransactionModel.countTransactionsSince(hourAgo),
      TransactionModel.countTransactionsSince(dayAgo),
    ]);
    
    res.json({ 
      success: true, 
      data: {
        ...stats,
        recent: {
          last_hour: lastHourCount,
          last_24_hours: lastDayCount,
        }
      } 
    });
  } catch (err) {
    next(err);
  }
}
