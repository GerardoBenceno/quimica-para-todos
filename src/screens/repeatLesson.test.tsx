import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { setupApp } from '../test/helpers'
import { useProgressStore } from '../stores/progressStore'
import { beginLesson, completeLesson, recordAnswer } from '../stores/actions'
import { lessonExercises } from '../core/game/lessonPlan'
import { gameValues, exerciseXp, lessonXp } from '../core/game/config'
import { presentationOrder, SHUFFLED_TYPES } from '../core/game/shuffle'
import { ResultScreen } from './ResultScreen'
import { LessonScreen } from './LessonScreen'

// Ids deterministas: el barajado depende del id del intento.
vi.mock('../core/ids', () => {
  let n = 0
  return { uuid: () => `id-${++n}` }
})

const LESSON = 'l_carbono_enlaces'
const state = () => useProgressStore.getState().state!

/** Responde todos los ejercicios del intento con la respuesta correcta. */
function answerAll(attemptId: string, plan: ReturnType<typeof lessonExercises>, g: ReturnType<typeof gameValues>) {
  for (const ex of plan) recordAnswer({ attemptId, exercise: ex, answer: ex.correct, verdict: 'correct', timeMs: 1000, g })
}

describe('Repetir lección', () => {
  it('abre un intento nuevo desde el primer ejercicio, con otro barajado y sin la recompensa de la primera vez', () => {
    const { bundle: b } = setupApp()
    const g = gameValues(b)
    const lesson = b.lessons.find((l) => l.id === LESSON)!
    const plan = lessonExercises(b, LESSON, { narrow: false, drawOnNarrow: false, view3d: false })
    const exXp = plan.reduce((sum, ex) => sum + exerciseXp(ex, g), 0)

    const first = beginLesson(LESSON, plan.length)
    answerAll(first.attemptId, plan, g)
    const o1 = completeLesson(b, lesson, first.attemptId, plan.length, g)
    expect(o1.firstCompletion).toBe(true)
    expect(o1.attempt.xp_earned).toBe(exXp + lessonXp(lesson, g))

    // Repetir: intento nuevo, desde el ejercicio 1.
    const again = beginLesson(LESSON, plan.length, { restart: true })
    expect(again.attemptId).not.toBe(first.attemptId)
    expect(again.startIndex).toBe(0)
    expect(again.correct).toBe(0)
    expect(state().in_progress).toEqual({ lesson_id: LESSON, answered: 0, total: plan.length })

    // Las opciones se barajan de nuevo: el orden se siembra con el id del intento.
    const shuffled = plan.filter((ex) => SHUFFLED_TYPES.has(ex.type) && (ex.payload.options?.length ?? 0) > 2)
    expect(shuffled.length).toBeGreaterThan(0)
    const order = (attemptId: string) => shuffled.map((ex) => presentationOrder(ex.type, ex.payload.options ?? [], attemptId, ex.id).map((o) => o.value).join('|'))
    expect(order(again.attemptId)).not.toEqual(order(first.attemptId))

    // Terminar la repetición no vuelve a dar xp_reward ni coin_reward.
    const xpBefore = state().user.xp_total
    const coinsBefore = state().user.coins
    answerAll(again.attemptId, plan, g)
    const o2 = completeLesson(b, lesson, again.attemptId, plan.length, g)
    expect(o2.firstCompletion).toBe(false)
    expect(o2.attempt.xp_earned).toBe(exXp)
    expect(state().user.xp_total - xpBefore).toBe(exXp)
    expect(state().user.coins - coinsBefore).toBe(o2.attempt.coins_earned)
    expect(state().lesson_attempts.filter((a) => a.lesson_id === LESSON && a.completed)).toHaveLength(2)
  })

  it('reinicia aunque quede un intento de la lección con todo respondido (sin restart se cerraría)', () => {
    const { bundle: b } = setupApp()
    const g = gameValues(b)
    const plan = lessonExercises(b, LESSON, { narrow: false, drawOnNarrow: false, view3d: false })
    const open = beginLesson(LESSON, plan.length)
    answerAll(open.attemptId, plan, g)
    expect(state().in_progress?.answered).toBe(plan.length)
    // Reanudar lleva al final (LessonScreen lo cierra); repetir empieza de cero.
    const resumed = beginLesson(LESSON, plan.length)
    expect(resumed).toMatchObject({ attemptId: open.attemptId, startIndex: plan.length })
    const again = beginLesson(LESSON, plan.length, { restart: true })
    expect(again.attemptId).not.toBe(open.attemptId)
    expect(again.startIndex).toBe(0)
  })

  it('el botón del resultado abre la lección en el primer ejercicio con un intento nuevo', () => {
    const { bundle: b } = setupApp()
    const g = gameValues(b)
    const lesson = b.lessons.find((l) => l.id === LESSON)!
    const plan = lessonExercises(b, LESSON, { narrow: false, drawOnNarrow: false, view3d: false })
    const first = beginLesson(LESSON, plan.length)
    answerAll(first.attemptId, plan, g)
    completeLesson(b, lesson, first.attemptId, plan.length, g)

    render(
      <MemoryRouter initialEntries={[`/resultado/${first.attemptId}`]}>
        <Routes>
          <Route path="/resultado/:attemptId" element={<ResultScreen />} />
          <Route path="/leccion/:lessonId" element={<LessonScreen />} />
        </Routes>
      </MemoryRouter>,
    )
    // Primera sesión: junto a "Ver el mapa de mundos".
    expect(screen.getByRole('button', { name: 'Ver el mapa de mundos' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Repetir lección' }))

    expect(screen.getByText(`Pregunta 1 de ${plan.length}`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comprobar' })).toBeInTheDocument()
    const attempts = state().lesson_attempts.filter((a) => a.lesson_id === LESSON)
    expect(attempts).toHaveLength(2)
    expect(attempts[1]).toMatchObject({ completed: false, xp_earned: 0 })
    expect(state().in_progress).toEqual({ lesson_id: LESSON, answered: 0, total: plan.length })
  })
})
