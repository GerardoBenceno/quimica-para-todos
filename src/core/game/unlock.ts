import type { ContentBundle } from '../content/bundle'
import type { ProgressStatus, UnlockRule } from '../../models'
import { activeWorlds, lessonsOfUnit, lessonsOfWorld, unitsOfWorld } from './structure'

export type WorldState = ProgressStatus | 'coming_soon'

export interface ScopeState {
  status: WorldState
  progress: number
  completed: number
  total: number
}

export interface ProgressView {
  worlds: Record<string, ScopeState>
  units: Record<string, ScopeState>
  lessons: Record<string, ScopeState>
}

/**
 * Evalúa desbloqueos a partir de las lecciones completadas.
 *  - Mundos: status 'unlocked' está disponible; 'locked' se abre con su
 *    unlock_rule; 'coming_soon' nunca se abre.
 *  - Unidades: disponibles si su mundo lo está y su unlock_rule se cumple.
 *  - Lecciones: el seed no trae reglas, así que dentro de una unidad la
 *    primera lección activa por order queda disponible al abrirse la unidad y
 *    cada siguiente pide completar la anterior. Una regla explícita de
 *    lección agrega requisitos.
 */
export function computeProgress(b: ContentBundle, completed: ReadonlySet<string>, inProgressLessonId: string | null = null): ProgressView {
  const view: ProgressView = { worlds: {}, units: {}, lessons: {} }

  const ratio = (done: number, total: number) => (total === 0 ? 0 : done / total)
  const worldProgress = (id: string) => {
    const ls = lessonsOfWorld(b, id)
    return ratio(ls.filter((l) => completed.has(l.id)).length, ls.length)
  }
  const unitProgress = (id: string) => {
    const ls = lessonsOfUnit(b, id)
    return ratio(ls.filter((l) => completed.has(l.id)).length, ls.length)
  }
  const ruleOk = (rule: UnlockRule | null) => {
    if (!rule) return true
    const min = rule.min_progress ?? 1
    if (rule.requires_world && worldProgress(rule.requires_world) < min) return false
    if (rule.requires_unit && unitProgress(rule.requires_unit) < min) return false
    if (rule.requires_lesson && !completed.has(rule.requires_lesson)) return false
    return true
  }

  for (const w of activeWorlds(b)) {
    const lessons = lessonsOfWorld(b, w.id)
    const done = lessons.filter((l) => completed.has(l.id)).length
    let status: WorldState
    if (w.status === 'coming_soon') status = 'coming_soon'
    else if (w.status === 'unlocked' || (w.unlock_rule && ruleOk(w.unlock_rule))) status = 'available'
    else status = 'locked'
    if (status === 'available' && lessons.length > 0) {
      if (done === lessons.length) status = 'completed'
      else if (done > 0) status = 'in_progress'
    }
    view.worlds[w.id] = { status, progress: ratio(done, lessons.length), completed: done, total: lessons.length }
    const worldOpen = status !== 'locked' && status !== 'coming_soon'

    for (const u of unitsOfWorld(b, w.id)) {
      const ul = lessonsOfUnit(b, u.id)
      const udone = ul.filter((l) => completed.has(l.id)).length
      const open = worldOpen && ruleOk(u.unlock_rule)
      let ustatus: ProgressStatus = open ? 'available' : 'locked'
      if (open && ul.length > 0) {
        if (udone === ul.length) ustatus = 'completed'
        else if (udone > 0) ustatus = 'in_progress'
      }
      view.units[u.id] = { status: ustatus, progress: ratio(udone, ul.length), completed: udone, total: ul.length }

      let prevDone = true
      for (const l of ul) {
        let lstatus: ProgressStatus
        if (completed.has(l.id)) lstatus = 'completed'
        else if (open && prevDone && ruleOk(l.unlock_rule)) lstatus = l.id === inProgressLessonId ? 'in_progress' : 'available'
        else lstatus = 'locked'
        // Una lección completada sigue abierta aunque luego cambie el contenido.
        view.lessons[l.id] = { status: lstatus, progress: lstatus === 'completed' ? 1 : 0, completed: lstatus === 'completed' ? 1 : 0, total: 1 }
        prevDone = completed.has(l.id)
      }
    }
  }
  return view
}

/** Siguiente lección disponible en orden de ruta, de cualquier mundo abierto. */
export function nextLesson(b: ContentBundle, view: ProgressView, worldId?: string): string | null {
  const worlds = worldId ? activeWorlds(b).filter((w) => w.id === worldId) : activeWorlds(b)
  for (const w of worlds) {
    for (const l of lessonsOfWorld(b, w.id)) {
      const s = view.lessons[l.id]?.status
      if (s === 'available' || s === 'in_progress') return l.id
    }
  }
  return null
}

/** Primer mundo abierto (para acotar la recomendación del diagnóstico). */
export function firstOpenWorld(b: ContentBundle, view: ProgressView): string | null {
  for (const w of activeWorlds(b)) {
    const s = view.worlds[w.id]?.status
    if (s && s !== 'locked' && s !== 'coming_soon') return w.id
  }
  return null
}
