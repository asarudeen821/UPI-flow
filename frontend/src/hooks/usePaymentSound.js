import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

import { playPaymentSuccessSound, playPaymentInitiatedSound } from '@/utils/paymentSound'

/**
 * usePaymentSound
 * Plays a pleasant payment success chime when payment completes successfully.
 * - Uses Web Audio API for clear, pleasant sound
 * - Handles autoplay restrictions with fallback
 * - Throttles repeats and cleans up properly
 */
export function usePaymentSound(options = {}) {
  const {
    selector = (state) => state.payment?.liveStatus,
    idSelector = (state) => state.payment?.order?.orderId || state.payment?.lastEvent?.orderId,
    playOnMount = false,
    enabledDefault = true,
    volumeDefault = 0.7,
    vibrate = true,
    transactionKey: transactionKeyOverride = null,
  } = options

  const status = selector ? useSelector(selector) : undefined
  const txnId = selector ? useSelector(idSelector) : undefined
  const resolvedTxnKey = transactionKeyOverride || txnId || null

  const [enabled, setEnabledState] = useState(() => {
    if (typeof window === 'undefined') return enabledDefault
    const stored = window.localStorage.getItem('payment_sound_enabled')
    return stored === null ? enabledDefault : stored === 'true'
  })

  const [volume, setVolumeState] = useState(() => {
    if (typeof window === 'undefined') return volumeDefault
    const stored = window.localStorage.getItem('payment_sound_volume')
    if (stored === null) return volumeDefault
    const parsed = Number.parseFloat(stored)
    return Number.isNaN(parsed) ? volumeDefault : Math.min(1, Math.max(0, parsed))
  })

  const prevStatusRef = useRef(status)
  const lastPlayedKeyRef = useRef(null)
  const hasPlayedRef = useRef(false)

  const persist = useCallback((key, value) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(key, value)
  }, [])

  const setEnabled = useCallback(
    (value) => {
      setEnabledState(value)
      persist('payment_sound_enabled', value ? 'true' : 'false')
    },
    [persist]
  )

  const setVolume = useCallback(
    (value) => {
      const next = Math.min(1, Math.max(0, value))
      setVolumeState(next)
      persist('payment_sound_volume', String(next))
    },
    [persist]
  )

  const play = useCallback(async () => {
    if (!enabled) return
    await playPaymentSuccessSound({ volume })
    if (vibrate && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([60, 40, 60])
    }
  }, [enabled, vibrate, volume])

  const playInitiated = useCallback(async () => {
    if (!enabled) return
    await playPaymentInitiatedSound({ volume: volume * 0.7 })
  }, [enabled, volume])

  // Optional manual trigger on mount
  useEffect(() => {
    if (playOnMount) {
      const storageKey = resolvedTxnKey ? `payment_sound_played_${resolvedTxnKey}` : null
      if (storageKey && typeof window !== 'undefined') {
        if (window.sessionStorage.getItem(storageKey) === 'true') return
        window.sessionStorage.setItem(storageKey, 'true')
      }
      play()
    }
  }, [play, playOnMount, resolvedTxnKey])

  // Detect transition pending -> success
  useEffect(() => {
    if (status === undefined) return
    const prev = prevStatusRef.current
    const key = resolvedTxnKey ? `${resolvedTxnKey}:${status}` : status
    const storageKey = resolvedTxnKey ? `payment_sound_played_${resolvedTxnKey}` : null

    // Reset per new pending state to allow next transaction
    if (status === 'pending') {
      hasPlayedRef.current = false
      lastPlayedKeyRef.current = null
    }

    if (storageKey && typeof window !== 'undefined') {
      if (window.sessionStorage.getItem(storageKey) === 'true') {
        prevStatusRef.current = status
        return
      }
    }

    if (prev === 'pending' && status === 'success' && !hasPlayedRef.current) {
      if (lastPlayedKeyRef.current !== key) {
        lastPlayedKeyRef.current = key
        hasPlayedRef.current = true
        if (storageKey && typeof window !== 'undefined') {
          window.sessionStorage.setItem(storageKey, 'true')
        }
        play()
      }
    }

    prevStatusRef.current = status
  }, [status, resolvedTxnKey, play])

  return {
    playSuccess: play,
    playInitiated,
    enabled,
    setEnabled,
    volume,
    setVolume,
  }
}

export default usePaymentSound
