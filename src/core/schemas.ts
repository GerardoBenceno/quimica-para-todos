import { z } from 'zod'

// Esquemas zod de cada archivo de un paquete de contenido. Un paquete mal
// formado falla al cargar con un mensaje que nombra el archivo y la ruta.

const id = z.string().min(1)
const nullableStr = z.string().nullable()

export const unlockRuleSchema = z
  .object({
    requires_world: id.optional(),
    requires_unit: id.optional(),
    requires_lesson: id.optional(),
    min_progress: z.number().min(0).max(1).optional(),
  })
  .nullable()

export const worldSchema = z.object({
  id,
  slug: z.string(),
  title_key: z.string(),
  description_key: nullableStr,
  icon_asset_id: nullableStr,
  order: z.number(),
  status: z.enum(['unlocked', 'locked', 'coming_soon']),
  unlock_rule: unlockRuleSchema,
  total_lessons: z.number().int().min(0),
  content_version: z.number(),
  is_active: z.boolean(),
})

export const unitSchema = z.object({
  id,
  world_id: id,
  title_key: z.string(),
  subtitle_key: nullableStr,
  order: z.number(),
  unlock_rule: unlockRuleSchema,
  content_version: z.number(),
  is_active: z.boolean(),
})

export const lessonSchema = z.object({
  id,
  unit_id: id,
  title_key: z.string(),
  order: z.number(),
  type: z.enum(['standard', 'timed_challenge', 'practice', 'diagnostic']),
  intro: z
    .object({
      text_key: nullableStr,
      image_asset_id: nullableStr,
      youtube_id: nullableStr,
    })
    .nullable(),
  xp_reward: z.number().nullable(),
  coin_reward: z.number().nullable(),
  star_count: z.number().nullable(),
  unlock_rule: unlockRuleSchema,
  content_version: z.number(),
  is_active: z.boolean(),
})

export const exerciseTypeSchema = z.enum([
  'multiple_choice',
  'true_false',
  'identify_group',
  'fill_blanks',
  'chat_complete',
  'diagnostic',
  'draw_structure',
  'choose_structure',
  'view_3d',
])

const optionSchema = z.object({ key: z.string(), value: z.string(), smiles: z.string().optional() })

export const payloadSchema = z.looseObject({
  options: z.array(optionSchema).optional(),
  structure_smiles: nullableStr.optional(),
  structure_asset_id: nullableStr.optional(),
  character_id: z.string().optional(),
  template: z.string().optional(),
  blanks: z.array(z.string()).optional(),
  bank: z.array(optionSchema).optional(),
  name_key: z.string().optional(),
  source_exercise_id: z.string().optional(),
  variant_of: z.string().optional(),
  base_type: exerciseTypeSchema.optional(),
})

export const exerciseSchema = z.object({
  id,
  lesson_id: nullableStr,
  type: exerciseTypeSchema,
  prompt_key: z.string(),
  payload: payloadSchema,
  correct: z.record(z.string(), z.string()),
  explanation_key: nullableStr,
  feedback_template_id: nullableStr,
  difficulty: z.number(),
  xp: z.number().nullable(),
  coins: z.number().nullable(),
  topic: z.string(),
  prerequisites: z.array(z.string()),
  structure_asset_id: nullableStr,
  smiles: nullableStr,
  is_diagnostic: z.boolean(),
  content_version: z.number(),
  is_active: z.boolean(),
})

export const diagnosticItemSchema = exerciseSchema.extend({
  weight: z.number().min(0),
  maps_to_world: id,
})

export const diagnosticSchema = z.object({
  items: z.array(diagnosticItemSchema),
  scoring: z
    .object({
      max_score: z.number(),
      thresholds: z
        .array(z.object({ max_ratio: z.number(), label: z.string(), recommended_world: id }))
        .min(1),
      note: z.string().optional(),
    })
    .nullable()
    .optional()
    .transform((v) => v ?? null),
})

export const feedbackTemplateSchema = z.object({
  id,
  key: z.string(),
  topic: z.string(),
  message_key: z.string(),
  hint_key: nullableStr,
  severity: z.enum(['info', 'correction']),
  content_version: z.number(),
  is_active: z.boolean(),
})

export const translationSchema = z.object({
  key: z.string().min(1),
  locale: z.string().min(2),
  value: z.string(),
  content_version: z.number(),
})

export const themeSchema = z.object({
  id,
  name: z.string(),
  is_default: z.boolean(),
  mode: z.enum(['light', 'dark']).optional(),
  colors: z.record(z.string(), z.string().regex(/^#[0-9A-Fa-f]{6}$/)),
  typography: z.object({
    font_family: z.string(),
    scale: z.number().positive(),
    fallback: z.array(z.string()).optional(),
    sizes: z.array(z.number().positive()).optional(),
    weights: z.array(z.number()).optional(),
    body_size: z.number().optional(),
    body_line_height: z.number().optional(),
    measure_ch: z.number().optional(),
  }),
  content_version: z.number(),
  is_active: z.boolean(),
})

export const characterSchema = z.object({
  id,
  name_key: z.string(),
  role: z.enum(['mascot', 'guide', 'antagonist']),
  sprite_asset_id: id,
  expressions: z.record(z.string(), z.string()),
  content_version: z.number(),
  is_active: z.boolean(),
})

export const assetSchema = z.object({
  id,
  kind: z.enum(['image', 'sprite', 'structure', 'video', 'icon', 'lottie']),
  uri: z.string(),
  locale: nullableStr,
  width: z.number().nullable(),
  height: z.number().nullable(),
  alt_key: nullableStr,
  license: nullableStr,
  content_version: z.number(),
  is_active: z.boolean(),
})

export const rewardSchema = z.object({
  id,
  type: z.enum(['xp', 'coins', 'chest', 'streak_freeze', 'cosmetic']),
  value: z.number(),
  title_key: z.string(),
  icon_asset_id: nullableStr,
  trigger: z.looseObject({
    on: z.string(),
    every: z.number().int().positive().optional(),
    cost_coins: z.number().min(0).optional(),
  }),
  content_version: z.number(),
  is_active: z.boolean(),
})

export const currencySchema = z.object({
  id,
  code: z.string(),
  name_key: z.string(),
  icon_asset_id: nullableStr,
})

export const appConfigSchema = z.object({
  id,
  key: z.string(),
  value: z.unknown(),
  description: nullableStr,
  updated_at: z.string(),
})

export const contentVersionSchema = z.object({
  id,
  version: z.number(),
  channel: z.enum(['stable', 'beta']),
  notes: nullableStr,
  min_app_version: nullableStr,
  created_at: z.string(),
})

export const accessSchema = z.object({
  default: z.enum(['free', 'premium']).optional(),
  ids: z.record(z.string(), z.enum(['free', 'premium'])).optional(),
})

export const manifestSchema = z.object({
  packs: z.array(z.string().regex(/^[a-z0-9_-]+$/)).min(1),
  files: z.record(z.string(), z.array(z.string().regex(/^[a-z0-9_]+\.json$/))),
})

export const featuresSchema = z.object({
  auth: z.boolean(),
  cloudSync: z.boolean(),
  payments: z.boolean(),
  ads: z.boolean(),
  analytics: z.boolean(),
  molecules3d: z.boolean(),
  aiFeedback: z.boolean(),
  social: z.boolean(),
})

export const uiConfigSchema = z.object({
  theme: z.string(),
  locale: z.string(),
  ui_strings: z.string(),
  narrow_breakpoint_px: z.number().int().positive(),
})

/** Archivo de un paquete -> esquema de un registro (o del documento completo). */
export const PACK_FILE_SCHEMAS = {
  'worlds.json': z.array(worldSchema),
  'units.json': z.array(unitSchema),
  'lessons.json': z.array(lessonSchema),
  'exercises.json': z.array(exerciseSchema),
  'diagnostic.json': diagnosticSchema,
  'feedback_templates.json': z.array(feedbackTemplateSchema),
  'translations_es.json': z.array(translationSchema),
  'themes.json': z.array(themeSchema),
  'characters.json': z.array(characterSchema),
  'assets.json': z.array(assetSchema),
  'rewards.json': z.array(rewardSchema),
  'currencies.json': z.array(currencySchema),
  'app_config.json': z.array(appConfigSchema),
  'content_versions.json': z.array(contentVersionSchema),
  'access.json': accessSchema,
} as const

export type PackFileName = keyof typeof PACK_FILE_SCHEMAS
export const PACK_FILE_NAMES = Object.keys(PACK_FILE_SCHEMAS) as PackFileName[]

/** Formatea un error de zod en una línea legible con archivo y ruta. */
export function formatZodError(file: string, err: z.ZodError): string {
  const first = err.issues.slice(0, 5).map((i) => `${i.path.join('.') || '(raíz)'}: ${i.message}`)
  return `${file}: ${first.join('; ')}`
}
