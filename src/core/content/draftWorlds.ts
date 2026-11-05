import type { ContentBundle } from './bundle'
import { lessonsOfWorld } from '../game/structure'

/**
 * Mundos "Próximamente" que ya tienen lecciones en algún paquete (por ejemplo
 * w_estereo con el paquete estereo). Con el flag mundoEstereo encendido pasan
 * a "locked" con desbloqueo tras el mundo anterior por orden; con ?borrador=1
 * quedan abiertos de inmediato para revisarlos. Sin flag ni borrador, siguen
 * como "Próximamente" y sus lecciones no se ofrecen. No modifica el seed.
 */
export function enableDraftWorlds(bundle: ContentBundle, mode: 'off' | 'flag' | 'draft'): ContentBundle {
  if (mode === 'off') return bundle
  const ordered = bundle.worlds.filter((w) => w.is_active).sort((a, b) => a.order - b.order)
  const worlds = bundle.worlds.map((w) => {
    if (w.status !== 'coming_soon' || lessonsOfWorld(bundle, w.id).length === 0) return w
    if (mode === 'draft') return { ...w, status: 'unlocked' as const, unlock_rule: null }
    const previous = ordered.filter((x) => x.order < w.order && x.status !== 'coming_soon').at(-1)
    return previous ? { ...w, status: 'locked' as const, unlock_rule: { requires_world: previous.id, min_progress: 1 } } : { ...w, status: 'unlocked' as const, unlock_rule: null }
  })
  return { ...bundle, worlds }
}
