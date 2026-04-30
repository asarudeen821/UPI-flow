import { useEffect } from 'react';
import { playPaymentSuccessSound } from '../utils/paymentSound';

/**
 * Global Payment Notification Sound Handler
 * Listens to real-time payment:notification events and plays sound on success
 * This component should be mounted once at the app root level
 */
export function PaymentNotificationSound() {
  useEffect(() => {
    const handlePaymentNotification = async (event) => {
      const { type, data } = event.detail || {};

      // Play sound only for completed payments
      if (type === 'completed' && data) {
        const txnKey = data.id || data.orderId || data.transaction_id;
        const storageKey = txnKey ? `payment_sound_played_${txnKey}` : null;

        // Prevent duplicate sounds for the same transaction
        if (storageKey && typeof window !== 'undefined') {
          if (window.sessionStorage.getItem(storageKey) === 'true') {
            return;
          }
          window.sessionStorage.setItem(storageKey, 'true');
        }

        // Check if sound is enabled
        const soundEnabled = window.localStorage.getItem('payment_sound_enabled');
        if (soundEnabled === 'false') return;

        // Get volume setting
        const volumeStr = window.localStorage.getItem('payment_sound_volume');
        const volume = volumeStr ? parseFloat(volumeStr) : 0.7;

        // Play success sound using Web Audio API
        await playPaymentSuccessSound({ volume });

        // Vibrate if supported
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([60, 40, 60]);
        }
      }
    };

    // Listen to payment notification events
    window.addEventListener('payment:notification', handlePaymentNotification);

    return () => {
      window.removeEventListener('payment:notification', handlePaymentNotification);
    };
  }, []);

  return null; // This component doesn't render anything
}

export default PaymentNotificationSound;
