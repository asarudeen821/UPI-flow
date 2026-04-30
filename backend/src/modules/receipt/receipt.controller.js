import { Router } from 'express';
import { TransactionModel } from '../transaction/transaction.model.js';
import { generateReceiptPDF } from '../../utils/receiptPDFGenerator.js';

const router = Router();

/**
 * GET /api/receipts/:transactionId
 * Download a PDF receipt for a specific transaction
 */
router.get('/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    // Find transaction
    const transaction = await TransactionModel.findByTransactionId(transactionId);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Generate PDF
    const pdfBuffer = await generateReceiptPDF(transaction);

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt_${transactionId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[ReceiptController.download] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate receipt PDF',
      details: error.message
    });
  }
});

/**
 * GET /api/receipts/:transactionId/view
 * View a PDF receipt in browser (inline)
 */
router.get('/:transactionId/view', async (req, res) => {
  try {
    const { transactionId } = req.params;

    // Find transaction
    const transaction = await TransactionModel.findByTransactionId(transactionId);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Generate PDF
    const pdfBuffer = await generateReceiptPDF(transaction);

    // Set headers for inline viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="receipt_${transactionId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[ReceiptController.view] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate receipt PDF',
      details: error.message
    });
  }
});

export default router;
