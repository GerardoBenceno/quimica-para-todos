import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KEY_PREFS } from '../core/storageKeys'

/** AudioContext mínimo que registra los osciladores creados. */
const created: { type: string; freq: number }[] = []
class FakeAudioContext {
  state = 'running'
  currentTime = 0
  destination = {}
  resume = async () => {}
  createOscillator() {
    const osc = {
      type: 'sine',
      frequency: { setValueAtTime: (f: number) => created.push({ type: osc.type, freq: f }) },
      connect: () => {},
      start: () => {},
      stop: () => {},
    }
    return osc
  }
  createGain() {
    return { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} }
  }
}

const setVisibility = (v: 'visible' | 'hidden') => Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v })

beforeEach(() => {
  localStorage.clear()
  created.length = 0
  vi.resetModules()
  ;(window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext
  setVisibility('visible')
})
afterEach(() => {
  delete (window as unknown as { AudioContext?: unknown }).AudioContext
})

describe('preferencia "Sonido al responder"', () => {
  it('está apagada por defecto y se guarda junto a la vibración en las preferencias del dispositivo', async () => {
    const { usePrefsStore } = await import('../stores/prefsStore')
    expect(usePrefsStore.getState().prefs).toEqual({ vibration: false, sound: false })
    usePrefsStore.getState().set({ sound: true })
    expect(JSON.parse(localStorage.getItem(KEY_PREFS)!)).toEqual({ vibration: false, sound: true })
    // Se conserva al volver a abrir la app.
    vi.resetModules()
    const again = await import('../stores/prefsStore')
    expect(again.usePrefsStore.getState().prefs.sound).toBe(true)
  })

  it('las preferencias guardadas antes del sonido lo cargan apagado', async () => {
    localStorage.setItem(KEY_PREFS, JSON.stringify({ vibration: true }))
    const { usePrefsStore } = await import('../stores/prefsStore')
    expect(usePrefsStore.getState().prefs).toEqual({ vibration: true, sound: false })
  })

  it('no suena apagado; encendido toca sonidos distintos al acertar y al fallar', async () => {
    const { usePrefsStore } = await import('../stores/prefsStore')
    const { playFeedbackSound, SOUND_PEAK } = await import('./sound')
    expect(playFeedbackSound('correct')).toBe(false)
    expect(created).toHaveLength(0)

    usePrefsStore.getState().set({ sound: true })
    expect(playFeedbackSound('correct')).toBe(true)
    const ok = created.splice(0)
    expect(playFeedbackSound('incorrect')).toBe(true)
    const bad = created.splice(0)
    expect(ok.length).toBeGreaterThan(0)
    expect(bad.length).toBeGreaterThan(0)
    expect(ok).not.toEqual(bad)
    expect(SOUND_PEAK).toBeLessThanOrEqual(0.1)
  })

  it('no suena con la pestaña oculta', async () => {
    const { usePrefsStore } = await import('../stores/prefsStore')
    const { playFeedbackSound } = await import('./sound')
    usePrefsStore.getState().set({ sound: true })
    setVisibility('hidden')
    expect(playFeedbackSound('incorrect')).toBe(false)
    expect(created).toHaveLength(0)
  })
})
