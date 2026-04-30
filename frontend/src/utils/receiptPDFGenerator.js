import jsPDF from 'jspdf'

/**
 * Generate a professional PDF receipt from transaction data
 * @param {Object} transaction - Transaction object with all payment details
 * @returns {Promise<Blob>} - PDF blob for download
 */
export const generateReceiptPDF = async (transaction) => {
  // Create PDF with A4 size (210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20

  // Color scheme
  const colors = {
    primary: [25, 118, 210],      // Blue
    success: [76, 175, 80],       // Green
    failed: [244, 67, 54],        // Red
    pending: [255, 152, 0],       // Orange
    dark: [33, 33, 33],
    gray: [117, 117, 117],
    light: [245, 245, 245]
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'success': return colors.success
      case 'failed': return colors.failed
      case 'pending': return colors.pending
      default: return colors.gray
    }
  }

  const statusColor = getStatusColor(transaction.status)

  // Helper function to add text with color
  const addText = (text, x, y, size = 12, color = colors.dark, align = 'left', style = 'normal') => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
    doc.text(text, x, y, { align })
  }

  // Helper to draw rounded rectangle
  const drawRoundedRect = (x, y, width, height, radius = 3, fill = false, stroke = true) => {
    if (fill) {
      doc.setFillColor(...colors.light)
      doc.roundedRect(x, y, width, height, radius, radius, 'F')
    }
    if (stroke) {
      doc.setLineWidth(0.5)
      doc.setDrawColor(220, 220, 220)
      doc.roundedRect(x, y, width, height, radius, radius, 'S')
    }
  }

  // Draw header background
  doc.setFillColor(...statusColor)
  doc.rect(0, 0, pageWidth, 40, 'F')

  // Add company/app logo placeholder (circle)
  doc.setFillColor(255, 255, 255)
  doc.circle(margin, 20, 8, 'F')
  addText('₹', margin - 2, 23, 16, colors.primary, 'center', 'bold')

  // Add title
  addText('PAYMENT RECEIPT', pageWidth / 2, 15, 18, [255, 255, 255], 'center', 'bold')
  addText('Official Payment Confirmation', pageWidth / 2, 23, 10, [255, 255, 255], 'center', 'normal')

  // Status badge
  const statusLabel = (transaction.status || 'pending').toUpperCase()
  const statusWidth = doc.getTextWidth(statusLabel) + 10
  const statusX = (pageWidth - statusWidth) / 2
  doc.setFillColor(...statusColor)
  doc.roundedRect(statusX, 28, statusWidth, 8, 2, 2, 'F')
  addText(statusLabel, pageWidth / 2, 33.5, 10, [255, 255, 255], 'center', 'bold')

  // Current position for content
  let yPos = 55

  // Amount section
  drawRoundedRect(margin, yPos, pageWidth - (margin * 2), 25, 5, true, true)
  addText('Amount Paid', pageWidth / 2, yPos + 8, 11, colors.gray, 'center', 'normal')
  addText(`₹${transaction.amount}`, pageWidth / 2, yPos + 18, 28, colors.dark, 'center', 'bold')

  yPos += 35

  // Transaction details section
  addText('Transaction Details', margin, yPos, 14, colors.primary, 'left', 'bold')
  yPos += 8

  // Transaction ID box
  drawRoundedRect(margin, yPos, pageWidth - (margin * 2), 15, 4, true, true)
  addText('Transaction ID', margin + 3, yPos + 6, 9, colors.gray, 'left', 'normal')
  addText(transaction.transaction_id || 'N/A', pageWidth - margin - 3, yPos + 6, 9, colors.dark, 'right', 'bold')

  yPos += 22

  // Date and Time
  const dateObj = new Date(transaction.created_date)
  const dateStr = dateObj.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const timeStr = dateObj.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })

  drawRoundedRect(margin, yPos, (pageWidth - (margin * 2)) / 2 - 2, 15, 4, true, true)
  addText('Date', margin + 3, yPos + 6, 9, colors.gray, 'left', 'normal')
  addText(dateStr, margin + 3, yPos + 12, 9, colors.dark, 'left', 'normal')

  drawRoundedRect(margin + (pageWidth - (margin * 2)) / 2 + 2, yPos, (pageWidth - (margin * 2)) / 2 - 2, 15, 4, true, true)
  addText('Time', margin + (pageWidth - (margin * 2)) / 2 + 5, yPos + 6, 9, colors.gray, 'left', 'normal')
  addText(timeStr, margin + (pageWidth - (margin * 2)) / 2 + 5, yPos + 12, 9, colors.dark, 'left', 'normal')

  yPos += 22

  // Recipient details section
  addText('Recipient Information', margin, yPos, 14, colors.primary, 'left', 'bold')
  yPos += 8

  drawRoundedRect(margin, yPos, pageWidth - (margin * 2), 35, 4, true, true)

  // Recipient Name
  addText('Recipient Name', margin + 3, yPos + 7, 9, colors.gray, 'left', 'normal')
  addText(transaction.recipient_name || 'Unknown', pageWidth - margin - 3, yPos + 7, 10, colors.dark, 'right', 'bold')

  // UPI ID (if available)
  if (transaction.upi_id) {
    addText('UPI ID', margin + 3, yPos + 16, 9, colors.gray, 'left', 'normal')
    addText(transaction.upi_id, pageWidth - margin - 3, yPos + 16, 9, colors.dark, 'right', 'normal')
  }

  // Mobile Number (if available)
  if (transaction.mobile_number) {
    const mobileY = transaction.upi_id ? yPos + 25 : yPos + 16
    addText('Mobile Number', margin + 3, mobileY, 9, colors.gray, 'left', 'normal')
    addText(transaction.mobile_number, pageWidth - margin - 3, mobileY, 9, colors.dark, 'right', 'normal')
  }

  yPos += 42

  // Payment Method
  addText('Payment Method', margin, yPos, 14, colors.primary, 'left', 'bold')
  yPos += 8

  const paymentMethodLabel = transaction.payment_method === 'upi_id' ? 'UPI Payment' :
    transaction.payment_method === 'mobile_number' ? 'Mobile Number' :
    transaction.payment_method === 'qr_code' ? 'QR Code' :
    transaction.payment_method === 'payment_link' ? 'Payment Link' : 'Unknown'

  drawRoundedRect(margin, yPos, pageWidth - (margin * 2), 12, 4, true, true)
  addText(paymentMethodLabel, margin + 3, yPos + 7.5, 10, colors.dark, 'left', 'bold')

  yPos += 20

  // Note (if available)
  if (transaction.note && transaction.note.trim()) {
    addText('Payment Note', margin, yPos, 14, colors.primary, 'left', 'bold')
    yPos += 8

    // Split note into multiple lines if too long
    const noteLines = doc.splitTextToSize(transaction.note, pageWidth - (margin * 2) - 6)
    const noteHeight = noteLines.length * 6 + 8

    drawRoundedRect(margin, yPos, pageWidth - (margin * 2), noteHeight, 4, true, true)
    noteLines.forEach((line, index) => {
      addText(line, margin + 3, yPos + 7 + (index * 6), 9, colors.gray, 'left', 'italic')
    })

    yPos += noteHeight + 5
  }

  // Footer
  const footerY = pageHeight - 30
  doc.setFillColor(...colors.light)
  doc.rect(0, footerY - 5, pageWidth, 30, 'F')

  // Footer text
  addText('This is a computer-generated receipt and does not require a signature.', pageWidth / 2, footerY + 5, 8, colors.gray, 'center', 'italic')
  addText(`Generated by UPI Flow Pay • ${new Date().getFullYear()}`, pageWidth / 2, footerY + 12, 8, colors.gray, 'center', 'normal')
  addText('For support, contact: support@upiflowpay.local', pageWidth / 2, footerY + 19, 8, colors.primary, 'center', 'normal')

  // Add QR code placeholder (optional - can be enhanced with actual QR generation)
  const qrSize = 25
  const qrX = pageWidth - margin - qrSize - 5
  const qrY = footerY - qrSize - 5
  drawRoundedRect(qrX, qrY, qrSize, qrSize, 3, false, true)
  addText('Scan for', qrX + qrSize / 2, qrY + 10, 6, colors.gray, 'center', 'normal')
  addText('details', qrX + qrSize / 2, qrY + 15, 6, colors.gray, 'center', 'normal')

  // Return PDF as blob
  const pdfBlob = doc.output('blob')
  return pdfBlob
}

/**
 * Download PDF receipt
 * @param {Blob} pdfBlob - PDF blob from generateReceiptPDF
 * @param {string} transactionId - Transaction ID for filename
 */
export const downloadReceiptPDF = (pdfBlob, transactionId) => {
  const url = URL.createObjectURL(pdfBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `receipt_${transactionId}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Combined function to generate and download PDF receipt
 * @param {Object} transaction - Transaction object
 */
export const downloadPDFReceipt = async (transaction) => {
  try {
    const pdfBlob = await generateReceiptPDF(transaction)
    downloadReceiptPDF(pdfBlob, transaction.transaction_id)
    return true
  } catch (error) {
    console.error('Error generating PDF receipt:', error)
    throw error
  }
}

export default {
  generateReceiptPDF,
  downloadReceiptPDF,
  downloadPDFReceipt
}
