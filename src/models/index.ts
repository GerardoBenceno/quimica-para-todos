// Tipos que respetan exactamente los campos del seed (seed/*.json) y del
// modelo de la guía técnica, sección G. Los campos extra de los tipos web
// (draw_structure, choose_structure, view_3d) viven solo en el payload.

import type { ExerciseTypeName } from '../core/exerciseTypes'

export type Id = string

export type WorldStatus = 'unlocked' | 'locked' | 'coming_soon'
export type LessonType = 'standard' | 'timed_challenge' | 'practice' | 'diagnostic'
export type ProgressStatus = 'locked' | 'available' | 'in_progress' | 'completed'
export type ScopeType = 'world' | 'unit' | 'lesson'
export type RewardType = 'xp' | 'coins' | 'chest' | 'streak_freeze' | 'cosmetic'
export type AssetKind = 'image' | 'sprite' | 'structure' | 'video' | 'icon' | 'lottie'

/** Tipos de ejercicio del seed más los tipos web (catálogo en core/exerciseTypes.ts). */
export type ExerciseType = ExerciseTypeName

export interface UnlockRule {
  requires_world?: Id
  requires_unit?: Id
  requires_lesson?: Id
  min_progress?: number
}

export interface World {
  id: Id
  slug: string
  title_key: string
  description_key: string | null
  icon_asset_id: Id | null
  order: number
  status: WorldStatus
  unlock_rule: UnlockRule | null
  total_lessons: number
  content_version: number
  is_active: boolean
}

export interface Unit {
  id: Id
  world_id: Id
  title_key: string
  subtitle_key: string | null
  order: number
  unlock_rule: UnlockRule | null
  content_version: number
  is_active: boolean
}

export interface LessonIntro {
  text_key: string | null
  image_asset_id: Id | null
  youtube_id: string | null
}

export interface Lesson {
  id: Id
  unit_id: Id
  title_key: string
  order: number
  type: LessonType
  intro: LessonIntro | null
  xp_reward: number | null
  coin_reward: number | null
  star_count: number | null
  unlock_rule: UnlockRule | null
  content_version: number
  is_active: boolean
}

export interface ExerciseOption {
  key: string
  value: string
  /** Solo en choose_structure: SMILES de la estructura que se dibuja. */
  smiles?: string
}

export interface ExercisePayload {
  options?: ExerciseOption[]
  structure_smiles?: string | null
  structure_asset_id?: Id | null
  character_id?: Id
  template?: string
  blanks?: string[]
  bank?: ExerciseOption[]
  /** draw_structure: clave i18n del nombre que se pide dibujar. */
  name_key?: string
  /** draw_structure, choose_structure y view_3d: ejercicio del seed de origen. */
  source_exercise_id?: Id
  /** choose_structure: ejercicio draw_structure al que sustituye en pantallas angostas. */
  variant_of?: Id
  /** view_3d: tipo del ejercicio de origen, que define cómo se responde. */
  base_type?: ExerciseType
  [extra: string]: unknown
}

export type CorrectAnswer = Record<string, string>

export interface Exercise {
  id: Id
  lesson_id: Id | null
  type: ExerciseType
  prompt_key: string
  payload: ExercisePayload
  correct: CorrectAnswer
  explanation_key: string | null
  feedback_template_id: Id | null
  difficulty: number
  xp: number | null
  coins: number | null
  topic: string
  prerequisites: string[]
  structure_asset_id: Id | null
  smiles: string | null
  is_diagnostic: boolean
  content_version: number
  is_active: boolean
}

export interface DiagnosticItem extends Exercise {
  weight: number
  maps_to_world: Id
}

export interface DiagnosticThreshold {
  max_ratio: number
  label: string
  recommended_world: Id
}

export interface DiagnosticScoring {
  max_score: number
  thresholds: DiagnosticThreshold[]
  note?: string
}

export interface Diagnostic {
  items: DiagnosticItem[]
  scoring: DiagnosticScoring | null
}

export interface FeedbackTemplate {
  id: Id
  key: string
  topic: string
  message_key: string
  hint_key: string | null
  severity: 'info' | 'correction'
  content_version: number
  is_active: boolean
}

export interface Translation {
  key: string
  locale: string
  value: string
  content_version: number
}

export interface Theme {
  id: Id
  name: string
  is_default: boolean
  /** Campo web: 'light' o 'dark', para color-scheme. */
  mode?: 'light' | 'dark'
  colors: Record<string, string>
  typography: {
    font_family: string
    scale: number
    fallback?: string[]
    sizes?: number[]
    weights?: number[]
    body_size?: number
    body_line_height?: number
    measure_ch?: number
  }
  content_version: number
  is_active: boolean
}

export interface Character {
  id: Id
  name_key: string
  role: 'mascot' | 'guide' | 'antagonist'
  sprite_asset_id: Id
  expressions: Record<string, Id>
  content_version: number
  is_active: boolean
}

export interface Asset {
  id: Id
  kind: AssetKind
  uri: string
  locale: string | null
  width: number | null
  height: number | null
  alt_key: string | null
  license: string | null
  content_version: number
  is_active: boolean
}

export interface RewardTrigger {
  on: string
  every?: number
  cost_coins?: number
}

export interface Reward {
  id: Id
  type: RewardType
  value: number
  title_key: string
  icon_asset_id: Id | null
  trigger: RewardTrigger
  content_version: number
  is_active: boolean
}

export interface Currency {
  id: Id
  code: string
  name_key: string
  icon_asset_id: Id | null
}

export interface AppConfig {
  id: Id
  key: string
  value: unknown
  description: string | null
  updated_at: string
}

export interface ContentVersion {
  id: Id
  version: number
  channel: 'stable' | 'beta'
  notes: string | null
  min_app_version: string | null
  created_at: string
}

export type AccessLevel = 'free' | 'premium'

/** packs/<nombre>/access.json: acceso por paquete y por id. */
export interface PackAccess {
  default?: AccessLevel
  ids?: Record<Id, AccessLevel>
}

// ---------------------------------------------------------------------------
// Datos del usuario (local y, en el futuro, remotos)
// ---------------------------------------------------------------------------

export interface UserProgress {
  id: Id
  user_id: Id
  scope_type: ScopeType
  scope_id: Id
  status: ProgressStatus
  progress: number
  stars: number
  best_accuracy: number | null
  updated_at: string
}

export interface DiagnosticResult {
  id: Id
  user_id: Id
  score: number
  level_label: string
  recommended_world_id: Id
  weak_topics: string[]
  answers: Record<Id, unknown>
  created_at: string
}

export interface UserReward {
  id: Id
  user_id: Id
  reward_id: Id
  source: string
  obtained_at: string
  claimed: boolean
}

export interface Streak {
  id: Id
  user_id: Id
  last_active_date: string | null
  count: number
  freezes_used: number
  updated_at: string
}

export interface Mistake {
  id: Id
  user_id: Id
  exercise_id: Id
  topic: string
  count: number
  last_failed_at: string
  resolved: boolean
}

export interface LessonAttempt {
  id: Id
  user_id: Id
  lesson_id: Id
  started_at: string
  finished_at: string | null
  accuracy: number | null
  xp_earned: number
  coins_earned: number
  stars: number
  duration_seconds: number | null
  completed: boolean
}

export interface ExerciseAttempt {
  id: Id
  user_id: Id
  exercise_id: Id
  lesson_attempt_id: Id | null
  given_answer: unknown
  is_correct: boolean
  time_ms: number
  created_at: string
}

export interface User {
  id: Id
  is_anonymous: boolean
  display_name: string | null
  locale: string
  theme_id: Id | null
  coins: number
  xp_total: number
  current_streak: number
  longest_streak: number
  recommended_world_id: Id | null
  created_at: string
  updated_at: string
}
