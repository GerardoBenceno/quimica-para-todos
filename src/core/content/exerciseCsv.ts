/**
 * Un ejercicio del editor del autor como filas de las plantillas CSV que acepta
 * scripts/import-pack-csv.ts (mismas columnas y convención de celdas que
 * scripts/pack-csv.ts: JSON en payload y correct, vacía = null, apóstrofo
 * inicial si un texto parece número, booleano o JSON). Solo cadenas, sin Node.
 */
import type { Exercise, FeedbackTemplate } from '../../models'

export interface Draft {
  pack: string
  slug: string
  lessonId: string
  type: 'multiple_choice' | 'true_false'
  prompt: string
  options: string[]
  correct: number
  explanation: string
  hint: string
  smiles: string
}

export const EXERCISE_COLUMNS = ['id', 'lesson_id', 'type', 'prompt_key', 'payload', 'correct', 'explanation_key', 'feedback_template_id', 'difficulty', 'xp', 'coins', 'topic', 'prerequisites', 'structure_asset_id', 'smiles', 'is_diagnostic', 'content_version', 'is_active']
export const FEEDBACK_COLUMNS = ['id', 'key', 'topic', 'message_key', 'hint_key', 'severity', 'content_version', 'is_active']
export const TRANSLATION_COLUMNS = ['key', 'locale', 'value', 'content_version']

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)

const NUMBER = /^-?\d+(\.\d+)?$/
export function cellToText(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean' || typeof v === 'number') return String(v)
  if (typeof v === 'string') return v === '' || v === 'true' || v === 'false' || NUMBER.test(v) || /^[[{']/.test(v) ? `'${v}` : v
  return JSON.stringify(v)
}
const quote = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
export const toCsv = (rows: string[][]) => rows.map((r) => r.map(quote).join(',')).join('\r\n') + '\r\n'

/** Errores de validación por campo (claves de UI). */
export function validateDraft(d: Draft): Partial<Record<keyof Draft, string>> {
  const e: Partial<Record<keyof Draft, string>> = {}
  if (!/^[a-z][a-z0-9]*$/.test(d.pack)) e.pack = 'editor.err_pack'
  if (!d.slug) e.slug = 'editor.err_slug'
  if (!d.lessonId) e.lessonId = 'editor.err_lesson'
  if (!d.prompt.trim()) e.prompt = 'editor.err_prompt'
  const n = d.type === 'true_false' ? 2 : 4
  const opts = d.options.slice(0, n)
  if (opts.some((o) => !o.trim())) e.options = 'editor.err_options'
  if (new Set(opts.map((o) => o.trim().toLowerCase())).size !== opts.length) e.options = 'editor.err_options_repeated'
  if (d.correct < 0 || d.correct >= n) e.correct = 'editor.err_correct'
  if (!d.explanation.trim()) e.explanation = 'editor.err_explanation'
  return e
}

/** Ids, claves y registros en memoria (los mismos que irán al CSV). */
export function buildExercise(d: Draft): { exercise: Exercise; template: FeedbackTemplate | null; translations: Record<string, string> } {
  const id = `${d.pack}_e_${d.slug}`
  const ftId = d.hint.trim() ? `${d.pack}_ft_${d.slug}` : null
  const n = d.type === 'true_false' ? 2 : 4
  const values = d.options.slice(0, n).map((o, i) => slugify(o) || `opcion_${i + 1}`)
  const translations: Record<string, string> = { [`ex.${id}.prompt`]: d.prompt.trim(), [`ex.${id}.explain`]: d.explanation.trim() }
  const options = values.map((v, i) => {
    translations[`ex.${id}.opt.${v}`] = d.options[i].trim()
    return { key: `ex.${id}.opt.${v}`, value: v }
  })
  if (ftId) {
    translations[`feedback.${ftId}.message`] = d.explanation.trim()
    translations[`feedback.${ftId}.hint`] = d.hint.trim()
  }
  const smiles = d.smiles.trim() || null
  const exercise: Exercise = {
    id,
    lesson_id: d.lessonId,
    type: d.type,
    prompt_key: `ex.${id}.prompt`,
    payload: { options, ...(smiles ? { structure_smiles: smiles } : {}) },
    correct: { value: values[d.correct] ?? values[0] },
    explanation_key: `ex.${id}.explain`,
    feedback_template_id: ftId,
    difficulty: 2,
    xp: 10,
    coins: 1,
    topic: d.lessonId,
    prerequisites: [],
    structure_asset_id: null,
    smiles,
    is_diagnostic: false,
    content_version: 1,
    is_active: true,
  }
  const template: FeedbackTemplate | null = ftId
    ? { id: ftId, key: ftId, topic: d.lessonId, message_key: `feedback.${ftId}.message`, hint_key: `feedback.${ftId}.hint`, severity: 'correction', content_version: 1, is_active: true }
    : null
  return { exercise, template, translations }
}

/** Archivos CSV listos para plantillas/<paquete>/. */
export function draftToCsv(drafts: Draft[], locale = 'es'): { ejercicios: string; traducciones: string; retroalimentacion: string } {
  const ex: string[][] = [EXERCISE_COLUMNS]
  const ft: string[][] = [FEEDBACK_COLUMNS]
  const tr: string[][] = [TRANSLATION_COLUMNS]
  for (const d of drafts) {
    const { exercise, template, translations } = buildExercise(d)
    ex.push(EXERCISE_COLUMNS.map((c) => cellToText((exercise as unknown as Record<string, unknown>)[c])))
    if (template) ft.push(FEEDBACK_COLUMNS.map((c) => cellToText((template as unknown as Record<string, unknown>)[c])))
    for (const [k, v] of Object.entries(translations)) tr.push([k, locale, cellToText(v), '1'])
  }
  return { ejercicios: toCsv(ex), traducciones: toCsv(tr), retroalimentacion: toCsv(ft) }
}
