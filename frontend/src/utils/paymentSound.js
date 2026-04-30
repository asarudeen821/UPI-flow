/**
 * Payment Success Sound — GPay / PhonePe style
 * Two-tone warm bell chime using Web Audio API (no external files needed)
 */

function createBellTone(ctx, frequency, startTime, duration, volume) {
  // Bell = sine fundamental + harmonics that decay quickly (metallic feel)
  const harmonics = [
    { ratio: 1,    gainMul: 1.0  },
    { ratio: 2.76, gainMul: 0.5  },
    { ratio: 5.40, gainMul: 0.25 },
    { ratio: 8.93, gainMul: 0.12 },
  ]

  harmonics.forEach(({ ratio, gainMul }) => {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.value = frequency * ratio

    // Sharp attack, long exponential decay — classic bell envelope
    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(volume * gainMul, startTime + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(startTime)
    osc.stop(startTime + duration + 0.01)
  })
}

/**
 * Play a GPay / PhonePe style payment success sound.
 * Two ascending bell tones (E5 → B5) with a warm, resonant decay.
 */
export function playPaymentSuccessSound(options = {}) {
  if (typeof window === 'undefined') return Promise.resolve()

  const { volume = 0.55 } = options

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return Promise.resolve()

    const ctx = new AudioContext()

    // Resume context if suspended (browser autoplay policy)
    const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve()

    resume.then(() => {
      const now = ctx.currentTime

      // First tone  — E5 (659 Hz), short
      createBellTone(ctx, 659.25, now,        1.2, volume)
      // Second tone — B5 (987 Hz), slightly louder, starts 160 ms later
      createBellTone(ctx, 987.77, now + 0.16, 1.6, volume * 1.1)

      // Subtle low-frequency "thud" for body (like GPay's bass hit)
      const thud  = ctx.createOscillator()
      const tGain = ctx.createGain()
      thud.type = 'sine'
      thud.frequency.setValueAtTime(120, now)
      thud.frequency.exponentialRampToValueAtTime(60, now + 0.08)
      tGain.gain.setValueAtTime(volume * 0.4, now)
      tGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)
      thud.connect(tGain)
      tGain.connect(ctx.destination)
      thud.start(now)
      thud.stop(now + 0.13)

      setTimeout(() => ctx.close().catch(() => {}), 2200)
    }).catch(() => {})

    return Promise.resolve()
  } catch {
    return Promise.resolve()
  }
}

/**
 * Soft two-note rising tone played when payment is initiated.
 */
export function playPaymentInitiatedSound(options = {}) {
  if (typeof window === 'undefined') return Promise.resolve()

  const { volume = 0.35 } = options

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return Promise.resolve()

    const ctx = new AudioContext()
    const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve()

    resume.then(() => {
      const now = ctx.currentTime
      createBellTone(ctx, 523.25, now,       0.5, volume)       // C5
      createBellTone(ctx, 659.25, now + 0.1, 0.6, volume * 0.8) // E5
      setTimeout(() => ctx.close().catch(() => {}), 800)
    }).catch(() => {})

    return Promise.resolve()
  } catch {
    return Promise.resolve()
  }
}

export default { playPaymentSuccessSound, playPaymentInitiatedSound }
