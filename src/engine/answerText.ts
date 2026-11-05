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

/** Normaliza para comparar textos: minúsculas, sin acentos, sin puntuación ni espacios repetidos. */
const normalizeText = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * ¿Dos textos dicen prácticamente lo mismo? Iguales tras normalizar, uno
 * contenido en el otro, o al menos 80 % de palabras en común (Jaccard).
 */
export function nearlySameText(a: string, b: string): boolean {
  const x = normalizeText(a)
  const y = normalizeText(b)
  if (!x || !y) return false
  if (x === y || x.includes(y) || y.includes(x)) return true
  const wx = new Set(x.split(' '))
  const wy = new Set(y.split(' '))
  let common = 0
  for (const w of wx) if (wy.has(w)) common++
  return common / (wx.size + wy.size - common) >= 0.8
}
