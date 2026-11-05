import type { ContentBundle } from '../content/bundle'
import type { Exercise, Lesson, Reward } from '../../models'

/**
 * Valores de juego. Ninguno vive en el código: cada uno sale de su registro
 * (ejercicio, lección, recompensa) con app_config como respaldo.
 *  - XP de ejercicio: exercise.xp -> app_config rewards.xp.per_exercise
 *  - Monedas de ejercicio: exercise.coins -> 0 (app_config no define respaldo)
 *  - XP de lección: lesson.xp_reward -> rewards.xp.per_lesson
 *  - Monedas de lección: lesson.coin_reward -> rewards.coins.per_lesson
 *  - Costo de congelar racha: reward streak_freeze (trigger.cost_coins) -> rewards.coins.streak_freeze_cost
 *  - Costo de pista: rewards.coins.hint_cost
 *  - Racha: streak.rules (reset_hour_local, freeze_max_per_week)
 *  - Bono de reto contrarreloj: rewards.xp.timed_bonus
 */
export function configValue(bundle: ContentBundle, key: string): Record<string, unknown> {
  const v = bundle.appConfig.find((c) => c.key === key)?.value
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export interface GameValues {
  xpPerExercise: number
  xpPerLesson: number
  coinsPerLesson: number
  hintCost: number
  freezeCost: number
  freezeMaxPerWeek: number
  resetHourLocal: number
  timedBonus: number
}

export function gameValues(bundle: ContentBundle): GameValues {
  const xp = configValue(bundle, 'rewards.xp')
  const coins = configValue(bundle, 'rewards.coins')
  const streak = configValue(bundle, 'streak.rules')
  const freeze = freezeReward(bundle)
  return {
    xpPerExercise: num(xp.per_exercise) ?? 0,
    xpPerLesson: num(xp.per_lesson) ?? 0,
    coinsPerLesson: num(coins.per_lesson) ?? 0,
    hintCost: num(coins.hint_cost) ?? 0,
    freezeCost: num(freeze?.trigger.cost_coins) ?? num(coins.streak_freeze_cost) ?? 0,
    freezeMaxPerWeek: num(streak.freeze_max_per_week) ?? 0,
    resetHourLocal: num(streak.reset_hour_local) ?? 0,
    timedBonus: num(xp.timed_bonus) ?? 0,
  }
}

export function exerciseXp(ex: Exercise, g: GameValues): number {
  return ex.xp ?? g.xpPerExercise
}
export function exerciseCoins(ex: Exercise): number {
  return ex.coins ?? 0
}
export function lessonXp(l: Lesson, g: GameValues): number {
  return l.xp_reward ?? g.xpPerLesson
}
export function lessonCoins(l: Lesson, g: GameValues): number {
  return l.coin_reward ?? g.coinsPerLesson
}

/** Recompensa que se compra para congelar la racha. */
export function freezeReward(bundle: ContentBundle): Reward | null {
  return bundle.rewards.find((r) => r.is_active && r.type === 'streak_freeze' && r.trigger.on === 'purchase') ?? null
}

/** Cofres que se otorgan cada N lecciones completadas de la ruta. */
export function chestRewards(bundle: ContentBundle): Reward[] {
  return bundle.rewards.filter((r) => r.is_active && r.type === 'chest' && r.trigger.on === 'lesson_complete' && (r.trigger.every ?? 0) > 0)
}
