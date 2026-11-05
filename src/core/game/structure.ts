import type { ContentBundle } from '../content/bundle'
import type { Lesson, Unit, World } from '../../models'

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order

export function activeWorlds(b: ContentBundle): World[] {
  return b.worlds.filter((w) => w.is_active).sort(byOrder)
}

export function unitsOfWorld(b: ContentBundle, worldId: string): Unit[] {
  return b.units.filter((u) => u.is_active && u.world_id === worldId).sort(byOrder)
}

export function lessonsOfUnit(b: ContentBundle, unitId: string): Lesson[] {
  return b.lessons.filter((l) => l.is_active && l.unit_id === unitId).sort(byOrder)
}

/** Lecciones de un mundo en orden de ruta (unidad, luego lección). */
export function lessonsOfWorld(b: ContentBundle, worldId: string): Lesson[] {
  return unitsOfWorld(b, worldId).flatMap((u) => lessonsOfUnit(b, u.id))
}

export function unitOf(b: ContentBundle, lessonId: string): Unit | null {
  const l = b.lessons.find((x) => x.id === lessonId)
  return l ? (b.units.find((u) => u.id === l.unit_id) ?? null) : null
}

export function worldOfLesson(b: ContentBundle, lessonId: string): World | null {
  const u = unitOf(b, lessonId)
  return u ? (b.worlds.find((w) => w.id === u.world_id) ?? null) : null
}
