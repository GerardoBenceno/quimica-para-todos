import type { Exercise } from '../../models'
import { answerShape } from '../exerciseTypes'

export type Answer = Record<string, string>
export type Verdict = 'correct' | 'incorrect' | 'invalid'

/** Tipo efectivo para responder: view_3d responde como su ejercicio de origen. */
export function answerType(ex: Exercise): string {
  return ex.type === 'view_3d' ? (ex.payload.base_type ?? 'multiple_choice') : ex.type
}

/** ¿Hay respuesta suficiente para habilitar Comprobar? */
export function hasAnswer(ex: Exercise, answer: Answer | null): boolean {
  if (!answer) return false
  const shape = answerShape(answerType(ex))
  if (shape === 'blanks') return (ex.payload.blanks ?? []).every((b) => !!answer[b])
  if (shape === 'structure') return !!answer.smiles
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
