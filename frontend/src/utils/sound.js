/**
 * Sound Utilities
 * Uses Web Audio API for all sounds - no external files required
 */

// Re-export payment sound functions
export { playPaymentSuccessSound, playPaymentInitiatedSound } from './paymentSound.js'

/**
 * Legacy playSuccessSound - now uses payment sound
 * Kept for backwards compatibility
 */
export async function playSuccessSound(options = {}) {
  const { volume = 0.65 } = options
  return playPaymentSuccessSound({ volume, allowFallback: true })
}
