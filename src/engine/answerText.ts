import type { Exercise } from '../models'
import { answerType } from '../core/game/validate'

/** Texto de la respuesta correcta, armado solo con claves del contenido. */
export function correctAnswerText(ex: Exercise, t: (k: string) => string): string {
  const type = answerType(ex)
  if (type === 'fill_blanks') {
    let s = ex.payload.template ?? ''
    for (const b of ex.payload.blanks ?? []) {
      const opt = (ex.payload.bank ?? []).find((o) => o.value === ex.correct[b])
      s = s.replace(`{${b}}`, opt ? t(opt.key) : ex.correct[b])
    }
    return s
  }
  if (type === 'draw_structure') return ex.payload.name_key ? t(ex.payload.name_key) : ''
  const opt = (ex.payload.options ?? []).find((o) => o.value === ex.correct.value)
  return opt ? t(opt.key) : (ex.correct.value ?? '')
}

/** SMILES de la figura del enunciado (solo la estructura que el ejercicio muestra). */
export function promptSmiles(ex: Exercise): string | null {
  const s = ex.payload.structure_smiles
  return typeof s === 'string' && s ? s : null
}

/** SMILES de la figura de la retroalimentación. */
export function feedbackSmiles(ex: Exercise): string | null {
  if (ex.type === 'draw_structure') return ex.correct.smiles ?? null
  return ex.smiles ?? promptSmiles(ex)
}
