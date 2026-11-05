import type { ContentBundle } from '../content/bundle'
import type { Exercise } from '../../models'

export interface PlanOptions {
  /** Pantalla de menos de narrow_breakpoint_px. */
  narrow: boolean
  /** ¿El editor de estructuras es usable en pantallas angostas? */
  drawOnNarrow: boolean
  /** ¿Está encendido el visor 3D (flag molecules3d)? */
  view3d: boolean
  /** SMILES con 3D disponible; un view_3d sin 3D cae a su ejercicio de origen. */
  has3d?: (smiles: string) => boolean
}

/**
 * Ejercicios de una lección en orden de paquete. Reglas de composición:
 *  - view_3d (payload.source_exercise_id) ocupa el lugar de su ejercicio de
 *    origen cuando el visor está encendido y hay 3D; si no, queda el origen.
 *  - choose_structure con payload.variant_of solo aparece en pantallas
 *    angostas sin editor usable, en el lugar de su draw_structure.
 *  - draw_structure sin variante se omite en esas pantallas y no cuenta para
 *    completar la lección.
 */
export function lessonExercises(b: ContentBundle, lessonId: string, opts: PlanOptions): Exercise[] {
  const all = b.exercises.filter((e) => e.is_active && e.lesson_id === lessonId)
  const byId = new Map(all.map((e) => [e.id, e]))
  const swapNarrow = opts.narrow && !opts.drawOnNarrow

  const replacements = new Map<string, Exercise>()
  for (const e of all) {
    if (e.type === 'view_3d' && e.payload.source_exercise_id) {
      const smiles = (e.payload.structure_smiles ?? e.smiles) as string | null
      const ok = opts.view3d && !!smiles && (opts.has3d ? opts.has3d(smiles) : true)
      if (ok) replacements.set(e.payload.source_exercise_id, e)
    }
    if (e.type === 'choose_structure' && e.payload.variant_of && swapNarrow && byId.has(e.payload.variant_of)) {
      replacements.set(e.payload.variant_of, e)
    }
  }

  const out: Exercise[] = []
  for (const e of all) {
    if (e.type === 'view_3d' && e.payload.source_exercise_id) continue
    if (e.type === 'choose_structure' && e.payload.variant_of) continue
    const r = replacements.get(e.id)
    if (r) {
      out.push(r)
      continue
    }
    if (e.type === 'draw_structure' && swapNarrow) continue
    out.push(e)
  }
  return out
}
