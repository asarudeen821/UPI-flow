/**
 * Dashboard Service
 * Analytics and metrics for payment dashboard
 */

import { getCollection } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(publicKey, days = 7) {
  try {
    const payments = getCollection('payments');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get all payments for the period
    const allPayments = await payments.find({
      publicKey,
      createdAt: { $gte: startDate.toISOString() }
    }).toArray();
    
    // Calculate stats
    const stats = {
      total: {
        count: allPayments.length,
        amount: allPayments.reduce((sum, p) => sum + p.amount, 0)
      },
      success: {
        count: allPayments.filter(p => p.status === 'success').length,
        amount: allPayments.filter(p => p.status === 'success').reduce((sum, p) => sum + p.amount, 0)
      },
      failed: {
        count: allPayments.filter(p => p.status === 'failed').length
      },
      pending: {
        count: allPayments.filter(p => p.status === 'pending' || p.status === 'processing').length
      },
      successRate: allPayments.length > 0 
        ? Math.round((allPayments.filter(p => p.status === 'success').length / allPayments.length) * 100)
        : 0
    };
    
    // Daily breakdown for chart
    const dailyStats = await getDailyStats(payments, publicKey, startDate, days);
    
    return {
      success: true,
      data: {
        stats,
        chart: dailyStats,
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString()
        }
      }
    };
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get daily statistics for chart
 */
async function getDailyStats(payments, publicKey, startDate, days) {
  const dailyData = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const dayPayments = await payments.find({
      publicKey,
      createdAt: {
        $gte: date.toISOString(),
        $lt: nextDate.toISOString()
      },
      status: 'success'
    }).toArray();
    
    dailyData.push({
      date: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      amount: dayPayments.reduce((sum, p) => sum + p.amount, 0),
      count: dayPayments.length
    });
  }
  
  return dailyData;
}

/**
 * Get recent payments
 */
export async function getRecentPayments(publicKey, limit = 10) {
  try {
    const payments = getCollection('payments');
    
    const recentPayments = await payments.find({ publicKey })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    
    return {
      success: true,
      data: recentPayments.map(p => ({
        paymentId: p.paymentId,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        gateway: p.gateway,
        paymentMethod: p.paymentMethod,
        customer: {
          name: p.customer?.name,
          email: p.customer?.email
        },
        product: {
          name: p.product?.name
        },
        createdAt: p.createdAt
      }))
    };
  } catch (error) {
    logger.error('Get recent payments error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get gateway-wise breakdown
 */
export async function getGatewayBreakdown(publicKey, days = 7) {
  try {
    const payments = getCollection('payments');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const breakdown = await payments.aggregate([
      {
        $match: {
          publicKey,
          createdAt: { $gte: startDate.toISOString() }
        }
      },
      {
        $group: {
          _id: '$gateway',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          }
        }
      }
    ]).toArray();
    
    return {
      success: true,
      data: breakdown.map(b => ({
        gateway: b._id,
        count: b.count,
        amount: b.totalAmount,
        successCount: b.successCount,
        successRate: b.count > 0 ? Math.round((b.successCount / b.count) * 100) : 0
      }))
    };
  } catch (error) {
    logger.error('Get gateway breakdown error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get payment method usage
 */
export async function getMethodUsage(publicKey, days = 7) {
  try {
    const payments = getCollection('payments');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const usage = await payments.aggregate([
      {
        $match: {
          publicKey,
          createdAt: { $gte: startDate.toISOString() },
          status: 'success',
          paymentMethod: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();
    
    return {
      success: true,
      data: usage.map(u => ({
        method: u._id,
        count: u.count,
        amount: u.totalAmount,
        percentage: 0 // Will be calculated on frontend
      }))
    };
  } catch (error) {
    logger.error('Get method usage error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  getDashboardStats,
  getRecentPayments,
  getGatewayBreakdown,
  getMethodUsage
};
