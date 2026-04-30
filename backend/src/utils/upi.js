export function generateUPILink({ upiId, amount, orderId, recipientName, note }) {
  const params = new URLSearchParams();
  params.set('pa', upiId);
  params.set('pn', recipientName || 'PayApp Merchant');
  if (amount !== undefined && amount !== null && amount !== '') {
    params.set('am', String(amount));
  }
  params.set('cu', 'INR');
  if (orderId) {
    params.set('tr', orderId);
  }
  if (note) {
    params.set('tn', note);
  }
  return `upi://pay?${params.toString()}`;
}

export function getQRCodeImageUrl(data, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    data
  )}&format=png&margin=10`;
}
