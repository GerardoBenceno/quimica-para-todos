// Acciones del usuario: aplican la lógica pura de core/game sobre el estado,
// lo guardan con ProgressRepository y emiten los eventos de analítica.
import type { ContentBundle } from '../core/content/bundle'
import type { DiagnosticItem, Exercise, Lesson } from '../models'
import type { GameValues } from '../core/game/config'
import type { Answer, Verdict } from '../core/game/validate'
import type { DiagnosticOutcome } from '../core/game/diagnostic'
import { finishLesson, recordExercise, startLesson } from '../core/game/session'
import { buyFreeze, claimChest, type ChestNode } from '../core/game/rewards'
import { uuid } from '../core/ids'
import { trackEvent } from '../app/analyticsEvents'
import { useProgressStore } from './progressStore'

const store = () => useProgressStore.getState()

/** Empieza o reanuda una lección. Devuelve el intento y desde qué ejercicio seguir. */
export function beginLesson(lessonId: string, total: number): { attemptId: string; startIndex: number; correct: number } {
  const s = store().state!
  const ip = s.in_progress
  if (ip && ip.lesson_id === lessonId && ip.total === total) {
    const attempt = [...s.lesson_attempts].reverse().find((a) => a.lesson_id === lessonId && !a.completed)
    if (attempt) {
      // Si ya se respondieron todos (se cerró antes de "Continuar"), startIndex = total
      // y LessonScreen cierra la lección en lugar de repetirla desde cero.
      const correct = s.exercise_attempts.filter((e) => e.lesson_attempt_id === attempt.id && e.is_correct).length
      return { attemptId: attempt.id, startIndex: Math.min(ip.answered, total), correct }
    }
  }
  let attemptId = ''
  store().update((st) => {
    const r = startLesson(st, lessonId, total, new Date())
    attemptId = r.attempt.id
    return r.state
  })
  trackEvent('lesson_start', { lesson_id: lessonId })
  return { attemptId, startIndex: 0, correct: 0 }
}

export function recordAnswer(p: { attemptId: string | null; exercise: Exercise; answer: Answer; verdict: Verdict; timeMs: number; g: GameValues; practice?: boolean }) {
  store().update((st) => recordExercise(st, { ...p, now: new Date() }).state)
  if (p.verdict !== 'invalid') {
    trackEvent('exercise_attempt', { exercise_id: p.exercise.id, is_correct: p.verdict === 'correct', topic: p.exercise.topic, time_ms: Math.round(p.timeMs) })
  }
}

export function completeLesson(b: ContentBundle, lesson: Lesson, attemptId: string, total: number, g: GameValues) {
  const s = store().state!
  const correct = s.exercise_attempts.filter((e) => e.lesson_attempt_id === attemptId && e.is_correct).length
  let outcome: ReturnType<typeof finishLesson> | null = null
  store().update((st) => {
    outcome = finishLesson(b, st, { attemptId, lesson, correct, total, now: new Date(), g })
    return outcome.state
  })
  const o = outcome!
  trackEvent('lesson_finish', { lesson_id: lesson.id, duration: o.attempt.duration_seconds ?? 0, accuracy: o.attempt.accuracy ?? 0 })
  if (o.worldCompleted) trackEvent('world_complete', { world_id: o.worldCompleted })
  return o
}

export function saveDiagnostic(items: DiagnosticItem[], answers: Record<string, Answer>, outcome: DiagnosticOutcome | null) {
  store().update((st) => {
    const next = { ...st, onboarding: { ...st.onboarding, welcomed: true, diagnostic_done: true } }
    if (!outcome) return next
    return {
      ...next,
      user: { ...next.user, recommended_world_id: outcome.recommended_world_id },
      diagnostic_results: [
        ...next.diagnostic_results,
        {
          id: uuid(),
          user_id: st.user.id,
          score: outcome.score,
          level_label: outcome.level_label,
          recommended_world_id: outcome.recommended_world_id,
          weak_topics: outcome.weak_topics,
          answers: Object.fromEntries(items.map((i) => [i.id, answers[i.id] ?? null])),
          created_at: new Date().toISOString(),
        },
      ],
    }
  })
  trackEvent('diagnostic_finish', { score: outcome?.score ?? 0, ratio: outcome?.ratio ?? 0, skipped: outcome === null })
}

export function openChest(node: ChestNode) {
  store().update((st) => claimChest(st, node, new Date()))
  trackEvent('reward_claim', { reward_id: node.reward.id, value: node.reward.value })
}

export function purchaseFreeze(b: ContentBundle, g: GameValues): boolean {
  let ok = false
  store().update((st) => {
    const r = buyFreeze(b, st, g, new Date())
    ok = !!r
    return r ?? st
  })
  if (ok) trackEvent('coin_spend', { item: 'streak_freeze', amount: g.freezeCost })
  return ok
}
