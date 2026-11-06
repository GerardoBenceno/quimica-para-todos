import { usePrefsStore } from '../stores/prefsStore'

/**
 * Retroalimentación sonora opcional, sintetizada con Web Audio API: sin
 * archivos de audio, así funciona sin conexión y no agrega peso al precache.
 * Suena solo con la preferencia encendida (apagada por defecto) y con la
 * pestaña visible.
 */
type AudioCtor = new () => AudioContext

function audioCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

/** ¿El navegador expone Web Audio? (todos los actuales, incluido Safari en iOS). */
export const canPlaySound = () => audioCtor() !== null

/** Volumen pico (ganancia lineal, 0 a 1): bajo, para no sobresaltar en clase. */
export const SOUND_PEAK = 0.05

/** Notas de cada sonido: frecuencia (Hz), inicio y duración (s). */
export const SOUND_NOTES: Record<'correct' | 'incorrect', { wave: OscillatorType; notes: [number, number, number][] }> = {
  // Dos notas ascendentes y cortas (mi5 a la5).
  correct: { wave: 'sine', notes: [[659, 0, 0.09], [880, 0.08, 0.16]] },
  // Dos notas graves descendentes (si3 a sol3), más largas y opacas.
  incorrect: { wave: 'triangle', notes: [[247, 0, 0.16], [196, 0.13, 0.22]] },
}

let ctx: AudioContext | null = null

/** Toca el sonido del veredicto. Devuelve si sonó (para pruebas). */
export function playFeedbackSound(verdict: 'correct' | 'incorrect'): boolean {
  if (!usePrefsStore.getState().prefs.sound) return false
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false
  const Ctor = audioCtor()
  if (!Ctor) return false
  try {
    // Se crea al primer uso, que siempre sigue a un toque (Comprobar): así lo permiten las políticas de reproducción.
    ctx ??= new Ctor()
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
    const { wave, notes } = SOUND_NOTES[verdict]
    const t0 = ctx.currentTime + 0.01
    for (const [freq, start, dur] of notes) {
      const at = t0 + start
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = wave
      osc.frequency.setValueAtTime(freq, at)
      // Ataque de 15 ms y caída exponencial: sin chasquidos al empezar ni al cortar.
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(SOUND_PEAK, at + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(at)
      osc.stop(at + dur + 0.02)
    }
    return true
  } catch {
    return false
  }
}
