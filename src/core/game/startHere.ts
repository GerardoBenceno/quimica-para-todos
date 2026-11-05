import type { ContentBundle } from '../content/bundle'
import type { UserState } from './state'
import { completedLessons } from './session'
import { firstOpenWorld, nextLesson, type ProgressView } from './unlock'

const isOpen = (status: string | undefined) => !!status && status !== 'locked' && status !== 'coming_soon'

/**
 * Lección marcada con "Empieza aquí": solo mientras no hay ninguna lección
 * empezada (sin intentos, sin lección en curso y sin lecciones completadas).
 * Es la primera lección del mundo recomendado por el diagnóstico si ese mundo
 * está abierto; si el estudiante saltó el diagnóstico (o el recomendado no
 * está abierto), la del primer mundo abierto. Devuelve null en otro caso.
 */
export function startHereLesson(b: ContentBundle, s: UserState, view: ProgressView): string | null {
  if (s.lesson_attempts.length > 0 || s.in_progress || completedLessons(s).size > 0) return null
  const rec = s.user.recommended_world_id
  const worldId = rec && isOpen(view.worlds[rec]?.status) ? rec : firstOpenWorld(b, view)
  return worldId ? nextLesson(b, view, worldId) : null
}
