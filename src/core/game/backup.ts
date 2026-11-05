import { USER_STATE_VERSION, type UserState } from './state'
import { APP_SLUG } from '../../app/brand'

/**
 * Respaldo del progreso local como archivo JSON. El archivo lleva un sobre
 * con la app, la versión del documento y la fecha; al importar se valida la
 * forma mínima y el progreso se adopta bajo el userId del dispositivo actual,
 * porque el UUID anónimo es de cada navegador.
 */
export interface BackupFile {
  app: string
  version: number
  exported_at: string
  state: UserState
}

export function makeBackup(state: UserState, now = new Date()): BackupFile {
  return { app: APP_SLUG, version: USER_STATE_VERSION, exported_at: now.toISOString(), state }
}

export const backupFileName = (now = new Date()) => `${APP_SLUG}-progreso-${now.toISOString().slice(0, 10)}.json`

export type BackupError = 'not_json' | 'not_backup' | 'version'

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

/** Lee un respaldo y devuelve el estado listo para guardar bajo `userId`. */
export function readBackup(text: string, userId: string): { ok: true; state: UserState } | { ok: false; error: BackupError } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'not_json' }
  }
  if (!isRecord(parsed) || parsed.app !== APP_SLUG || !isRecord(parsed.state)) return { ok: false, error: 'not_backup' }
  const s = parsed.state
  if (s.version !== USER_STATE_VERSION || parsed.version !== USER_STATE_VERSION) return { ok: false, error: 'version' }
  if (!isUserStateShape(s)) return { ok: false, error: 'not_backup' }
  const state = normalizeUserState(structuredClone(s) as unknown as UserState)
  state.user.id = userId
  state.streak.user_id = userId
  state.streak.id = `streak_${userId}`
  return { ok: true, state }
}

/** Forma mínima con tipos (no solo claves): evita guardar un documento que rompa las pantallas. */
export function isUserStateShape(s: unknown): boolean {
  if (!isRecord(s) || !isRecord(s.user) || !isRecord(s.streak) || !isRecord(s.onboarding)) return false
  if (!Array.isArray(s.lesson_attempts) || !Array.isArray(s.exercise_attempts) || !Array.isArray(s.diagnostic_results) || !Array.isArray(s.user_rewards)) return false
  if (!isRecord(s.progress) || !isRecord(s.mistakes)) return false
  const u = s.user
  if (typeof u.id !== 'string' || typeof u.xp_total !== 'number' || typeof u.coins !== 'number' || typeof u.longest_streak !== 'number') return false
  if (typeof s.streak.count !== 'number') return false
  return true
}

/** Completa campos que versiones anteriores del documento no traían. */
export function normalizeUserState(state: UserState): UserState {
  state.streak.freezes_available = typeof state.streak.freezes_available === 'number' ? state.streak.freezes_available : 0
  state.streak.freezes_used_week = typeof state.streak.freezes_used_week === 'number' ? state.streak.freezes_used_week : 0
  state.streak.freeze_week = typeof state.streak.freeze_week === 'string' ? state.streak.freeze_week : null
  state.streak.freezes_used = typeof state.streak.freezes_used === 'number' ? state.streak.freezes_used : 0
  state.in_progress = state.in_progress && typeof state.in_progress.lesson_id === 'string' ? state.in_progress : null
  state.user.theme_id = typeof state.user.theme_id === 'string' ? state.user.theme_id : null
  state.user.recommended_world_id = typeof state.user.recommended_world_id === 'string' ? state.user.recommended_world_id : null
  return state
}
