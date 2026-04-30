import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

/**
 * Generate a professional PDF receipt from transaction data
 * @param {Object} transaction - Transaction object with all payment details
 * @returns {Promise<Buffer>} - PDF buffer
 */
export const generateReceiptPDF = (transaction) => {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF document with A4 size
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });

      const chunks = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Color scheme
      const colors = {
        primary: '#1976D2',      // Blue
        success: '#4CAF50',       // Green
        failed: '#F44336',        // Red
        pending: '#FF9800',       // Orange
        dark: '#212121',
        gray: '#757575',
        light: '#F5F5F5'
      };

      // Get status color
      const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
          case 'success': return colors.success;
          case 'failed': return colors.failed;
          case 'pending': return colors.pending;
          default: return colors.gray;
        }
      };

      const statusColor = getStatusColor(transaction.status);
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // Draw header background
      doc.fillColor(statusColor)
         .rect(0, 0, pageWidth, 110)
         .fill();

      // Add logo placeholder (circle with rupee symbol)
      doc.fillColor('#FFFFFF')
         .circle(70, 55, 22)
         .fill();
      
      doc.fontSize(20)
         .fillColor(colors.primary)
         .text('₹', 58, 48, { align: 'center' });

      // Add title
      doc.fontSize(22)
         .fillColor('#FFFFFF')
         .font('Helvetica-Bold')
         .text('PAYMENT RECEIPT', 0, 35, { align: 'center' });
      
      doc.fontSize(11)
         .font('Helvetica')
         .text('Official Payment Confirmation', 0, 55, { align: 'center' });

      // Status badge
      const statusLabel = (transaction.status || 'pending').toUpperCase();
      const statusWidth = doc.widthOfString(statusLabel) + 20;
      
      doc.fillColor(statusColor)
         .roundedRect((pageWidth - statusWidth) / 2, 75, statusWidth, 25, 5)
         .fill();
      
      doc.fontSize(12)
         .fillColor('#FFFFFF')
         .font('Helvetica-Bold')
         .text(statusLabel, 0, 83, { align: 'center' });

      // Current Y position for content
      let yPos = 140;

      // Amount section
      doc.fillColor(colors.light)
         .strokeColor('#DCDCDC')
         .lineWidth(1)
         .roundedRect(50, yPos, pageWidth - 100, 70, 8)
         .fillAndStroke();
      
      doc.fontSize(13)
         .fillColor(colors.gray)
         .font('Helvetica')
         .text('Amount Paid', 0, yPos + 12, { align: 'center' });
      
      doc.fontSize(36)
         .fillColor(colors.dark)
         .font('Helvetica-Bold')
         .text(`₹${transaction.amount}`, 0, yPos + 35, { align: 'center' });

      yPos += 95;

      // Transaction details section title
      doc.fontSize(16)
         .fillColor(colors.primary)
         .font('Helvetica-Bold')
         .text('Transaction Details', 50, yPos, { align: 'left' });
      
      yPos += 20;

      // Transaction ID box
      doc.fillColor(colors.light)
         .strokeColor('#DCDCDC')
         .lineWidth(1)
         .roundedRect(50, yPos, pageWidth - 100, 40, 6)
         .fillAndStroke();
      
      doc.fontSize(11)
         .fillColor(colors.gray)
         .font('Helvetica')
         .text('Transaction ID', 60, yPos + 10, { align: 'left' });
      
      doc.fontSize(11)
         .fillColor(colors.dark)
         .font('Helvetica-Bold')
         .text(transaction.transaction_id || 'N/A', pageWidth - 60, yPos + 10, { align: 'right' });

      yPos += 55;

      // Date and Time
      const dateObj = new Date(transaction.created_date);
      const dateStr = dateObj.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const timeStr = dateObj.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      // Date box
      doc.fillColor(colors.light)
         .strokeColor('#DCDCDC')
         .lineWidth(1)
         .roundedRect(50, yPos, (pageWidth - 100) / 2 - 5, 45, 6)
         .fillAndStroke();
      
      doc.fontSize(11)
         .fillColor(colors.gray)
         .font('Helvetica')
         .text('Date', 60, yPos + 10, { align: 'left' });
      
      doc.fontSize(10)
         .fillColor(colors.dark)
         .font('Helvetica')
         .text(dateStr, 60, yPos + 22, { align: 'left', width: (pageWidth - 100) / 2 - 20 });

      // Time box
      doc.fillColor(colors.light)
         .strokeColor('#DCDCDC')
         .lineWidth(1)
         .roundedRect(pageWidth / 2 + 5, yPos, (pageWidth - 100) / 2 - 5, 45, 6)
         .fillAndStroke();
      
      doc.fontSize(11)
         .fillColor(colors.gray)
         .font('Helvetica')
         .text('Time', pageWidth / 2 + 15, yPos + 10, { align: 'left' });
      
      doc.fontSize(10)
         .fillColor(colors.dark)
         .font('Helvetica')
         .text(timeStr, pageWidth / 2 + 15, yPos + 22, { align: 'left', width: (pageWidth - 100) / 2 - 20 });

      yPos += 65;

      // Recipient details section title
      doc.fontSize(16)
         .fillColor(colors.primary)
         .font('Helvetica-Bold')
         .text('Recipient Information', 50, yPos, { align: 'left' });
      
      yPos += 20;

      // Recipient details box
      const recipientBoxHeight = transaction.upi_id && transaction.mobile_number ? 80 : 
                                  transaction.upi_id || transaction.mobile_number ? 55 : 35;
      
      doc.fillColor(colors.light)
         .strokeColor('#DCDCDC')
         .lineWidth(1)
         .roundedRect(50, yPos, pageWidth - 100, recipientBoxHeight, 6)
         .fillAndStroke();
      
      doc.fontSize(11)
         .fillColor(colors.gray)
         .font('Helvetica')
         .text('Recipient Name', 60, yPos + 10, { align: 'left' });
      
      doc.fontSize(11)
         .fillColor(colors.dark)
         .font('Helvetica-Bold')
         .text(transaction.recipient_name || 'Unknown', pageWidth - 60, yPos + 10, { align: 'right' });

      let recipientY = yPos + 25;
      
      if (transaction.upi_id) {
        doc.fontSize(11)
           .fillColor(colors.gray)
           .font('Helvetica')
           .text('UPI ID', 60, recipientY, { align: 'left' });
        
        doc.fontSize(10)
           .fillColor(colors.dark)
           .font('Helvetica')
           .text(transaction.upi_id, pageWidth - 60, recipientY, { align: 'right' });
        
        recipientY += 25;
      }

      if (transaction.mobile_number) {
        doc.fontSize(11)
           .fillColor(colors.gray)
           .font('Helvetica')
           .text('Mobile Number', 60, recipientY, { align: 'left' });
        
        doc.fontSize(10)
           .fillColor(colors.dark)
           .font('Helvetica')
           .text(transaction.mobile_number, pageWidth - 60, recipientY, { align: 'right' });
      }

      yPos += recipientBoxHeight + 15;

      // Payment Method
      doc.fontSize(16)
         .fillColor(colors.primary)
         .font('Helvetica-Bold')
         .text('Payment Method', 50, yPos, { align: 'left' });
      
      yPos += 20;

      const paymentMethodLabel = transaction.payment_method === 'upi_id' ? 'UPI Payment' :
        transaction.payment_method === 'mobile_number' ? 'Mobile Number' :
        transaction.payment_method === 'qr_code' ? 'QR Code' :
        transaction.payment_method === 'payment_link' ? 'Payment Link' : 'Unknown';

      doc.fillColor(colors.light)
         .strokeColor('#DCDCDC')
         .lineWidth(1)
         .roundedRect(50, yPos, pageWidth - 100, 35, 6)
         .fillAndStroke();
      
      doc.fontSize(12)
         .fillColor(colors.dark)
         .font('Helvetica-Bold')
         .text(paymentMethodLabel, 60, yPos + 10, { align: 'left' });

      yPos += 55;

      // Note (if available)
      if (transaction.note && transaction.note.trim()) {
        doc.fontSize(16)
           .fillColor(colors.primary)
           .font('Helvetica-Bold')
           .text('Payment Note', 50, yPos, { align: 'left' });
        
        yPos += 20;

        doc.fillColor(colors.light)
           .strokeColor('#DCDCDC')
           .lineWidth(1)
           .roundedRect(50, yPos, pageWidth - 100, 50, 6)
           .fillAndStroke();
        
        doc.fontSize(11)
           .fillColor(colors.gray)
           .font('Helvetica-Oblique')
           .text(transaction.note, 60, yPos + 10, { 
             align: 'left', 
             width: pageWidth - 120,
             lines: 3
           });

        yPos += 70;
      }

      // Footer
      const footerY = pageHeight - 80;
      
      doc.fillColor(colors.light)
         .rect(0, footerY, pageWidth, 80)
         .fill();
      
      doc.fontSize(9)
         .fillColor(colors.gray)
         .font('Helvetica-Oblique')
         .text('This is a computer-generated receipt and does not require a signature.', 0, footerY + 15, { align: 'center' });

      doc.fontSize(9)
         .font('Helvetica')
         .text(`Generated by UPI Flow Pay • ${new Date().getFullYear()}`, 0, footerY + 30, { align: 'center' });

      doc.fontSize(9)
         .fillColor(colors.primary)
         .text('For support, contact: support@upiflowpay.local', 0, footerY + 45, { align: 'center' });

      // Add QR code placeholder
      const qrSize = 70;
      const qrX = pageWidth - 100;
      const qrY = footerY - qrSize - 10;
      
      doc.strokeColor('#DCDCDC')
         .lineWidth(1)
         .roundedRect(qrX, qrY, qrSize, qrSize, 5)
         .stroke();
      
      doc.fontSize(8)
         .fillColor(colors.gray)
         .font('Helvetica')
         .text('Scan for', qrX + qrSize / 2, qrY + 25, { align: 'center' });
      
      doc.fontSize(8)
         .text('details', qrX + qrSize / 2, qrY + 38, { align: 'center' });

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export default { generateReceiptPDF };
