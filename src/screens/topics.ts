import type { ContentBundle } from '../core/content/bundle'

/**
 * Nombre visible de un tema (topic) sin inventar textos: el título de la
 * primera lección que tiene ejercicios de ese tema; si no hay, el título del
 * mundo al que apunta el ítem de diagnóstico con ese tema.
 */
export function topicTitleKey(b: ContentBundle, topic: string): string {
  const lessonOrder = new Map(b.lessons.map((l, i) => [l.id, i]))
  const ex = b.exercises
    .filter((e) => e.is_active && e.topic === topic && e.lesson_id)
    .sort((a, z) => (lessonOrder.get(a.lesson_id!) ?? 0) - (lessonOrder.get(z.lesson_id!) ?? 0))[0]
  if (ex) {
    const l = b.lessons.find((x) => x.id === ex.lesson_id)
    if (l) return l.title_key
  }
  const item = b.diagnosticItems.find((i) => i.topic === topic)
  const w = item ? b.worlds.find((x) => x.id === item.maps_to_world) : null
  return w?.title_key ?? topic
}
