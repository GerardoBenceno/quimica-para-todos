import type { Exercise } from '../../models'

export type Answer = Record<string, string>
export type Verdict = 'correct' | 'incorrect' | 'invalid'

/** Tipo efectivo para responder: view_3d responde como su ejercicio de origen. */
export function answerType(ex: Exercise): string {
  return ex.type === 'view_3d' ? (ex.payload.base_type ?? 'multiple_choice') : ex.type
}

/** ¿Hay respuesta suficiente para habilitar Comprobar? */
export function hasAnswer(ex: Exercise, answer: Answer | null): boolean {
  if (!answer) return false
  const t = answerType(ex)
  if (t === 'fill_blanks') return (ex.payload.blanks ?? []).every((b) => !!answer[b])
  if (t === 'draw_structure') return !!answer.smiles
  return !!answer.value
}

/**
 * Validación genérica contra correct: cada clave de correct debe coincidir
 * con la respuesta. Opciones: { value }. fill_blanks: un value por hueco.
 * draw_structure se valida aparte con RDKit (ver engine/types/DrawStructure).
 */
export function validateAnswer(ex: Exercise, answer: Answer): Verdict {
  const keys = Object.keys(ex.correct)
  if (keys.length === 0) return 'incorrect'
  return keys.every((k) => answer[k] === ex.correct[k]) ? 'correct' : 'incorrect'
}
