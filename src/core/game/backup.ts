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
  const required = ['user', 'progress', 'lesson_attempts', 'exercise_attempts', 'mistakes', 'diagnostic_results', 'user_rewards', 'streak', 'onboarding']
  if (!required.every((k) => k in s) || !isRecord(s.user) || !isRecord(s.streak)) return { ok: false, error: 'not_backup' }
  const state = structuredClone(s) as unknown as UserState
  state.user.id = userId
  state.streak.user_id = userId
  state.streak.id = `streak_${userId}`
  return { ok: true, state }
}
