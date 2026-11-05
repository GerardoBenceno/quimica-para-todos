import type { Exercise } from '../../models'
import type { ContentBundle } from './bundle'

export interface Issue {
  level: 'error' | 'warning'
  message: string
}

/** Tipos cuya respuesta es elegir un value entre payload.options. */
export const OPTION_TYPES = new Set([
  'multiple_choice',
  'true_false',
  'identify_group',
  'chat_complete',
  'diagnostic',
  'choose_structure',
])

/** Todas las claves i18n que referencia un ejercicio. */
export function exerciseKeys(ex: Exercise): string[] {
  const keys = [ex.prompt_key]
  if (ex.explanation_key) keys.push(ex.explanation_key)
  for (const o of ex.payload.options ?? []) keys.push(o.key)
  for (const o of ex.payload.bank ?? []) keys.push(o.key)
  if (ex.payload.name_key) keys.push(ex.payload.name_key)
  return keys
}

/** Todos los SMILES que una pantalla podría necesitar dibujar. */
export function referencedSmiles(bundle: ContentBundle): Set<string> {
  const out = new Set<string>()
  const add = (s: unknown) => {
    if (typeof s === 'string' && s.length > 0) out.add(s)
  }
  for (const ex of [...bundle.exercises, ...bundle.diagnosticItems]) {
    add(ex.smiles)
    add(ex.payload.structure_smiles)
    for (const o of ex.payload.options ?? []) add(o.smiles)
    if (ex.type === 'draw_structure') add(ex.correct.smiles)
  }
  return out
}

/**
 * Revisión de integridad referencial y de respuestas. Se usa al cargar (los
 * errores detienen la app con un mensaje claro) y en scripts/validate-content.ts.
 */
export function checkIntegrity(
  bundle: ContentBundle,
  opts: { locale?: string; molIndex?: Record<string, unknown> | null } = {},
): Issue[] {
  const issues: Issue[] = []
  const e = (message: string) => issues.push({ level: 'error', message })
  const w = (message: string) => issues.push({ level: 'warning', message })

  const worlds = new Set(bundle.worlds.map((x) => x.id))
  const units = new Set(bundle.units.map((x) => x.id))
  const lessons = new Set(bundle.lessons.map((x) => x.id))
  const exercises = new Set(bundle.exercises.map((x) => x.id))
  const assets = new Set(bundle.assets.map((x) => x.id))
  const templates = new Set(bundle.feedbackTemplates.map((x) => x.id))
  const characters = new Set(bundle.characters.map((x) => x.id))

  // Prefijo obligatorio para los ids de paquetes distintos de base.
  for (const [rid, pack] of Object.entries(bundle.origin)) {
    if (pack !== 'base' && !rid.startsWith(`${pack}_`)) {
      e(`el id "${rid}" del paquete ${pack} debe llevar el prefijo "${pack}_"`)
    }
  }

  const checkRule = (owner: string, rule: { requires_world?: string; requires_unit?: string; requires_lesson?: string } | null) => {
    if (!rule) return
    if (rule.requires_world && !worlds.has(rule.requires_world)) e(`${owner}: requires_world "${rule.requires_world}" no existe`)
    if (rule.requires_unit && !units.has(rule.requires_unit)) e(`${owner}: requires_unit "${rule.requires_unit}" no existe`)
    if (rule.requires_lesson && !lessons.has(rule.requires_lesson)) e(`${owner}: requires_lesson "${rule.requires_lesson}" no existe`)
  }
  const checkAsset = (owner: string, aid: string | null | undefined) => {
    if (aid && !assets.has(aid)) e(`${owner}: asset "${aid}" no existe`)
  }

  for (const wd of bundle.worlds) {
    checkRule(`world ${wd.id}`, wd.unlock_rule)
    checkAsset(`world ${wd.id}`, wd.icon_asset_id)
    const real = bundle.lessons.filter(
      (l) => l.is_active && bundle.units.some((u) => u.id === l.unit_id && u.world_id === wd.id && u.is_active),
    ).length
    if (wd.is_active && wd.status !== 'coming_soon' && real !== wd.total_lessons) {
      w(`world ${wd.id}: total_lessons=${wd.total_lessons} pero tiene ${real} lecciones activas; la app usa el conteo real`)
    }
  }
  for (const u of bundle.units) {
    if (!worlds.has(u.world_id)) e(`unit ${u.id}: world_id "${u.world_id}" no existe`)
    checkRule(`unit ${u.id}`, u.unlock_rule)
  }
  for (const l of bundle.lessons) {
    if (!units.has(l.unit_id)) e(`lesson ${l.id}: unit_id "${l.unit_id}" no existe`)
    checkRule(`lesson ${l.id}`, l.unlock_rule)
    checkAsset(`lesson ${l.id}`, l.intro?.image_asset_id)
  }

  const checkExercise = (ex: Exercise, where: string) => {
    if (ex.lesson_id && !lessons.has(ex.lesson_id)) e(`${where} ${ex.id}: lesson_id "${ex.lesson_id}" no existe`)
    if (ex.feedback_template_id && !templates.has(ex.feedback_template_id)) {
      e(`${where} ${ex.id}: feedback_template_id "${ex.feedback_template_id}" no existe`)
    }
    checkAsset(`${where} ${ex.id}`, ex.structure_asset_id)
    checkAsset(`${where} ${ex.id}`, ex.payload.structure_asset_id)
    if (ex.payload.character_id && !characters.has(ex.payload.character_id)) {
      e(`${where} ${ex.id}: character_id "${ex.payload.character_id}" no existe`)
    }
    for (const ref of [ex.payload.source_exercise_id, ex.payload.variant_of]) {
      if (ref && !exercises.has(ref)) e(`${where} ${ex.id}: referencia a ejercicio "${ref}" que no existe`)
    }
    const effectiveType = ex.type === 'view_3d' ? ex.payload.base_type : ex.type
    if (effectiveType && OPTION_TYPES.has(effectiveType)) {
      const values = (ex.payload.options ?? []).map((o) => o.value)
      if (values.length < 2) e(`${where} ${ex.id}: necesita al menos 2 opciones`)
      if (new Set(values).size !== values.length) e(`${where} ${ex.id}: opciones con value repetido`)
      if (!values.includes(ex.correct.value ?? '')) {
        e(`${where} ${ex.id}: la respuesta correcta "${ex.correct.value}" no está en sus opciones`)
      }
    } else if (effectiveType === 'fill_blanks') {
      const bank = new Set((ex.payload.bank ?? []).map((o) => o.value))
      for (const b of ex.payload.blanks ?? []) {
        if (!(b in ex.correct)) e(`${where} ${ex.id}: el hueco "${b}" no tiene respuesta correcta`)
        else if (!bank.has(ex.correct[b])) e(`${where} ${ex.id}: la respuesta "${ex.correct[b]}" del hueco ${b} no está en el banco`)
        if (!ex.payload.template?.includes(`{${b}}`)) e(`${where} ${ex.id}: la plantilla no contiene {${b}}`)
      }
    } else if (effectiveType === 'draw_structure') {
      if (!ex.correct.smiles) e(`${where} ${ex.id}: draw_structure necesita correct.smiles`)
      if (!ex.payload.name_key) e(`${where} ${ex.id}: draw_structure necesita payload.name_key`)
    }
    if (ex.type === 'view_3d' && !ex.payload.structure_smiles && !ex.smiles) {
      e(`${where} ${ex.id}: view_3d necesita un SMILES`)
    }
  }
  for (const ex of bundle.exercises) checkExercise(ex, 'exercise')
  for (const it of bundle.diagnosticItems) {
    checkExercise(it, 'diagnostic')
    if (!worlds.has(it.maps_to_world)) e(`diagnostic ${it.id}: maps_to_world "${it.maps_to_world}" no existe`)
  }
  if (bundle.diagnosticScoring) {
    let prev = 0
    for (const t of bundle.diagnosticScoring.thresholds) {
      if (!worlds.has(t.recommended_world)) e(`diagnostic.scoring: recommended_world "${t.recommended_world}" no existe`)
      if (t.max_ratio < prev) e('diagnostic.scoring: los umbrales deben ir en orden creciente')
      prev = t.max_ratio
    }
    if (prev < 1) e('diagnostic.scoring: el último umbral debe cubrir ratio 1.0')
  }

  for (const c of bundle.characters) {
    checkAsset(`character ${c.id}`, c.sprite_asset_id)
    for (const a of Object.values(c.expressions)) checkAsset(`character ${c.id}`, a)
  }
  for (const r of bundle.rewards) checkAsset(`reward ${r.id}`, r.icon_asset_id)
  for (const c of bundle.currencies) checkAsset(`currency ${c.id}`, c.icon_asset_id)

  // Cobertura i18n al 100 % para el locale pedido.
  if (opts.locale) {
    const have = new Set(bundle.translations.filter((t) => t.locale === opts.locale).map((t) => t.key))
    const need = new Set<string>()
    const add = (k: string | null | undefined) => {
      if (k) need.add(k)
    }
    for (const x of bundle.worlds) (add(x.title_key), add(x.description_key))
    for (const x of bundle.units) (add(x.title_key), add(x.subtitle_key))
    for (const x of bundle.lessons) (add(x.title_key), add(x.intro?.text_key))
    for (const x of [...bundle.exercises, ...bundle.diagnosticItems]) exerciseKeys(x).forEach(add)
    for (const x of bundle.feedbackTemplates) (add(x.message_key), add(x.hint_key))
    for (const x of bundle.assets) add(x.alt_key)
    for (const x of bundle.characters) add(x.name_key)
    for (const x of bundle.rewards) add(x.title_key)
    for (const x of bundle.currencies) add(x.name_key)
    for (const k of need) if (!have.has(k)) e(`i18n (${opts.locale}): falta la clave "${k}"`)
  }

  // Toda estructura usada debe estar pregenerada en public/mol/index.json.
  if (opts.molIndex) {
    for (const s of referencedSmiles(bundle)) {
      if (!(s in opts.molIndex)) e(`mol: el SMILES "${s}" no tiene entrada en public/mol/index.json`)
    }
  }

  return issues
}
