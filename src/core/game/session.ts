import type { ContentBundle } from '../content/bundle'
import type { Exercise, ExerciseAttempt, Lesson, LessonAttempt, UserProgress } from '../../models'
import { uuid } from '../ids'
import { exerciseCoins, exerciseXp, lessonCoins, lessonXp, type GameValues } from './config'
import { progressKey, type UserState } from './state'
import { touchStreak, type StreakChange } from './streak'
import { computeProgress } from './unlock'
import { lessonsOfWorld, worldOfLesson } from './structure'
import type { Answer, Verdict } from './validate'

export function completedLessons(s: UserState): Set<string> {
  return new Set(
    Object.values(s.progress)
      .filter((p) => p.scope_type === 'lesson' && p.status === 'completed')
      .map((p) => p.scope_id),
  )
}

export function startLesson(s: UserState, lessonId: string, total: number, now: Date): { state: UserState; attempt: LessonAttempt } {
  const attempt: LessonAttempt = {
    id: uuid(),
    user_id: s.user.id,
    lesson_id: lessonId,
    started_at: now.toISOString(),
    finished_at: null,
    accuracy: null,
    xp_earned: 0,
    coins_earned: 0,
    stars: 0,
    duration_seconds: null,
    completed: false,
  }
  return {
    state: { ...s, lesson_attempts: [...s.lesson_attempts, attempt], in_progress: { lesson_id: lessonId, answered: 0, total } },
    attempt,
  }
}

export interface ExerciseRecord {
  attemptId: string | null
  exercise: Exercise
  answer: Answer
  verdict: Verdict
  timeMs: number
  now: Date
  g: GameValues
  /** En práctica de errores, acertar marca el error como resuelto. */
  practice?: boolean
}

/**
 * Registra un intento de ejercicio: exercise_attempts, mistakes en error,
 * XP y monedas del propio ejercicio en acierto, y la racha del día.
 * Un veredicto 'invalid' (estructura que no se puede sanear) no se registra.
 */
export function recordExercise(s: UserState, r: ExerciseRecord): { state: UserState; streak: StreakChange; xp: number; coins: number } {
  if (r.verdict === 'invalid') return { state: s, streak: 'none', xp: 0, coins: 0 }
  const correct = r.verdict === 'correct'
  const attempt: ExerciseAttempt = {
    id: uuid(),
    user_id: s.user.id,
    exercise_id: r.exercise.id,
    lesson_attempt_id: r.attemptId,
    given_answer: r.answer,
    is_correct: correct,
    time_ms: Math.round(r.timeMs),
    created_at: r.now.toISOString(),
  }
  const mistakes = { ...s.mistakes }
  const prev = mistakes[r.exercise.id]
  if (!correct) {
    mistakes[r.exercise.id] = {
      id: prev?.id ?? uuid(),
      user_id: s.user.id,
      exercise_id: r.exercise.id,
      topic: r.exercise.topic,
      count: (prev?.count ?? 0) + 1,
      last_failed_at: r.now.toISOString(),
      resolved: false,
    }
  } else if (prev && r.practice) {
    mistakes[r.exercise.id] = { ...prev, resolved: true }
  }
  const xp = correct ? exerciseXp(r.exercise, r.g) : 0
  const coins = correct ? exerciseCoins(r.exercise) : 0
  const lesson_attempts = r.attemptId
    ? s.lesson_attempts.map((a) => (a.id === r.attemptId ? { ...a, xp_earned: a.xp_earned + xp, coins_earned: a.coins_earned + coins } : a))
    : s.lesson_attempts
  const in_progress = s.in_progress && r.attemptId ? { ...s.in_progress, answered: s.in_progress.answered + 1 } : s.in_progress
  const next: UserState = {
    ...s,
    exercise_attempts: [...s.exercise_attempts, attempt],
    mistakes,
    lesson_attempts,
    in_progress,
    user: { ...s.user, xp_total: s.user.xp_total + xp, coins: s.user.coins + coins },
  }
  const t = touchStreak(next, r.now, r.g)
  return { state: t.state, streak: t.change, xp, coins }
}

/** Escribe user_progress de todos los scopes desde la vista calculada. */
export function syncProgress(b: ContentBundle, s: UserState, completed: Set<string>, now: Date): Record<string, UserProgress> {
  const view = computeProgress(b, completed)
  const out: Record<string, UserProgress> = { ...s.progress }
  const put = (scope: 'world' | 'unit' | 'lesson', id: string, status: string, progress: number) => {
    if (status === 'coming_soon') status = 'locked'
    const key = progressKey(scope, id)
    const prev = out[key]
    out[key] = {
      id: prev?.id ?? `${s.user.id}:${key}`,
      user_id: s.user.id,
      scope_type: scope,
      scope_id: id,
      status: status as UserProgress['status'],
      progress,
      stars: prev?.stars ?? 0,
      best_accuracy: prev?.best_accuracy ?? null,
      updated_at: now.toISOString(),
    }
  }
  for (const [id, v] of Object.entries(view.worlds)) put('world', id, v.status, v.progress)
  for (const [id, v] of Object.entries(view.units)) put('unit', id, v.status, v.progress)
  for (const [id, v] of Object.entries(view.lessons)) if (v.status === 'completed') put('lesson', id, v.status, 1)
  return out
}

export interface LessonFinish {
  attemptId: string
  lesson: Lesson
  correct: number
  total: number
  now: Date
  g: GameValues
}

export interface LessonOutcome {
  state: UserState
  attempt: LessonAttempt
  firstCompletion: boolean
  worldCompleted: string | null
}

/**
 * Completar una lección es responder todos sus ejercicios, no acertarlos.
 * La recompensa de la lección (xp_reward, coin_reward) se da en la primera
 * vez que se completa; repetirla solo suma lo de cada ejercicio.
 */
export function finishLesson(b: ContentBundle, s: UserState, f: LessonFinish): LessonOutcome {
  const before = completedLessons(s)
  const firstCompletion = !before.has(f.lesson.id)
  const bonusXp = firstCompletion ? lessonXp(f.lesson, f.g) : 0
  const bonusCoins = firstCompletion ? lessonCoins(f.lesson, f.g) : 0
  const accuracy = f.total === 0 ? 1 : f.correct / f.total
  let attempt = s.lesson_attempts.find((a) => a.id === f.attemptId)
  if (!attempt) throw new Error(`Intento de lección ${f.attemptId} inexistente`)
  attempt = {
    ...attempt,
    finished_at: f.now.toISOString(),
    accuracy,
    xp_earned: attempt.xp_earned + bonusXp,
    coins_earned: attempt.coins_earned + bonusCoins,
    duration_seconds: Math.max(0, Math.round((f.now.getTime() - new Date(attempt.started_at).getTime()) / 1000)),
    completed: true,
  }
  const after = new Set(before).add(f.lesson.id)
  let next: UserState = {
    ...s,
    lesson_attempts: s.lesson_attempts.map((a) => (a.id === attempt!.id ? attempt! : a)),
    user: { ...s.user, xp_total: s.user.xp_total + bonusXp, coins: s.user.coins + bonusCoins },
    in_progress: null,
    onboarding: { ...s.onboarding, first_lesson_done: true },
  }
  next = { ...next, progress: syncProgress(b, next, after, f.now) }
  const lp = next.progress[progressKey('lesson', f.lesson.id)]
  if (lp) next.progress[progressKey('lesson', f.lesson.id)] = { ...lp, best_accuracy: Math.max(lp.best_accuracy ?? 0, accuracy) }

  const world = worldOfLesson(b, f.lesson.id)
  let worldCompleted: string | null = null
  if (world) {
    const ls = lessonsOfWorld(b, world.id)
    const was = ls.every((l) => before.has(l.id))
    const now = ls.every((l) => after.has(l.id))
    if (now && !was) worldCompleted = world.id
  }
  return { state: next, attempt, firstCompletion, worldCompleted }
}
