import { create } from 'zustand'
import { KEY_PREFS } from '../core/storageKeys'
import { SafeLocalStore } from '../services/safeStorage'

/**
 * Preferencias del dispositivo (no viajan con el progreso ni con el respaldo):
 * hoy solo la vibración al responder. Se guardan en localStorage con respaldo
 * en memoria.
 */
export interface DevicePrefs {
  vibration: boolean
}

const DEFAULTS: DevicePrefs = { vibration: false }
const store = new SafeLocalStore()

function load(): DevicePrefs {
  try {
    const raw = store.get(KEY_PREFS)
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<DevicePrefs>) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

interface PrefsStore {
  prefs: DevicePrefs
  set(patch: Partial<DevicePrefs>): void
}

export const usePrefsStore = create<PrefsStore>((set, get) => ({
  prefs: load(),
  set: (patch) => {
    const prefs = { ...get().prefs, ...patch }
    set({ prefs })
    store.set(KEY_PREFS, JSON.stringify(prefs))
  },
}))

/** ¿El dispositivo puede vibrar? (Chrome y Firefox en Android; iOS no lo expone.) */
export const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

/** Vibración corta al acertar y doble al fallar, solo si la preferencia está activa. */
export function vibrateFor(verdict: 'correct' | 'incorrect') {
  if (!usePrefsStore.getState().prefs.vibration || !canVibrate()) return
  try {
    navigator.vibrate(verdict === 'correct' ? 30 : [40, 60, 40])
  } catch {
    /* sin vibración */
  }
}
