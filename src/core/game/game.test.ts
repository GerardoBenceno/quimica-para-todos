import { describe, expect, it } from 'vitest'
import { loadBundleFromDisk } from '../../../scripts/packs'
import { computeProgress, firstOpenWorld, nextLesson } from './unlock'
import { scoreDiagnostic } from './diagnostic'
import { presentationOrder } from './shuffle'
import { validateAnswer } from './validate'
import { gameValues } from './config'
import { initialUserState } from './state'
import { finishLesson, recordExercise, startLesson, completedLessons } from './session'
import { lessonsOfWorld } from './structure'
import { lessonExercises } from './lessonPlan'

const b = loadBundleFromDisk()
const lessonsOf = (w: string) => lessonsOfWorld(b, w).map((l) => l.id)

describe('unlock_rule y desbloqueo secuencial', () => {
  it('al inicio solo w_carbono está abierto y su primera lección disponible', () => {
    const v = computeProgress(b, new Set())
    expect(v.worlds.w_carbono.status).toBe('available')
    expect(v.worlds.w_grupos.status).toBe('locked')
    expect(v.worlds.w_estereo.status).toBe('coming_soon')
    expect(v.lessons.l_carbono_enlaces.status).toBe('available')
    expect(v.lessons.l_organico.status).toBe('locked')
    // u_hibridacion pide u_intro_carbono al 100 %.
    expect(v.units.u_hibridacion.status).toBe('locked')
    expect(v.lessons.l_sp3.status).toBe('locked')
  })

  it('cada lección pide completar la anterior dentro de la unidad', () => {
    const v = computeProgress(b, new Set(['l_carbono_enlaces']))
    expect(v.lessons.l_organico.status).toBe('available')
    expect(v.lessons.l_sp3.status).toBe('locked')
  })

  it('requires_unit abre la unidad al completar la anterior', () => {
    const v = computeProgress(b, new Set(['l_carbono_enlaces', 'l_organico']))
    expect(v.units.u_hibridacion.status).toBe('available')
    expect(v.lessons.l_sp3.status).toBe('available')
    expect(v.worlds.w_carbono.progress).toBeCloseTo(2 / 6)
  })

  it('requires_world abre el mundo siguiente al completar el anterior', () => {
    const v = computeProgress(b, new Set(lessonsOf('w_carbono')))
    expect(v.worlds.w_carbono.status).toBe('completed')
    expect(v.worlds.w_grupos.status).toBe('available')
    expect(v.worlds.w_nomenclatura_alcanos.status).toBe('locked')
    expect(nextLesson(b, v)).toBe('l_grupos_intro')
  })

  it('una regla explícita de lección agrega requisitos', () => {
    const bb = structuredClone(b)
    bb.lessons.find((l) => l.id === 'l_organico')!.unlock_rule = { requires_world: 'w_grupos', min_progress: 1 }
    const v = computeProgress(bb, new Set(['l_carbono_enlaces']))
    expect(v.lessons.l_organico.status).toBe('locked')
  })
})

describe('DiagnosticScorer con diagnostic.scoring', () => {
  const items = b.diagnosticItems
  const scoring = b.diagnosticScoring!
  const all = Object.fromEntries(items.map((i) => [i.id, { value: i.correct.value }]))
  const isOpen = (w: string) => w === 'w_carbono'

  it('suma weight de aciertos y usa la suma de weight de ítems activos como máximo', () => {
    const o = scoreDiagnostic(items, all, scoring, isOpen, 'w_carbono')
    expect(o.max).toBe(92)
    expect(o.score).toBe(92)
    expect(o.ratio).toBe(1)
    expect(o.level_label).toBe('Avanzado')
    expect(o.weak_topics).toEqual([])
  })

  it('los límites de los umbrales son inclusivos', () => {
    // 10+10+10+7 no existe; usamos ítems para 0.4 exacto no alcanzable, así que probamos con scoring sintético.
    const s2 = { ...scoring, thresholds: [{ max_ratio: 0.5, label: 'A', recommended_world: 'w_carbono' }, { max_ratio: 1, label: 'B', recommended_world: 'w_carbono' }] }
    const two = items.slice(0, 2).map((i) => ({ ...i, weight: 1 }))
    const o = scoreDiagnostic(two, { [two[0].id]: { value: two[0].correct.value } }, s2, isOpen, 'w_carbono')
    expect(o.ratio).toBe(0.5)
    expect(o.level_label).toBe('A')
  })

  it('sin aciertos es Principiante, con temas débiles y mundo acotado al primero abierto', () => {
    const o = scoreDiagnostic(items, {}, scoring, isOpen, 'w_carbono')
    expect(o.level_label).toBe('Principiante')
    expect(o.recommended_world_id).toBe('w_carbono')
    expect(o.weak_topics.length).toBeGreaterThan(0)
  })

  it('ignora ítems inactivos y acota un mundo recomendado cerrado', () => {
    const its = items.map((i, k) => ({ ...i, is_active: k < 4 }))
    const s2 = { ...scoring, thresholds: [{ max_ratio: 1, label: 'X', recommended_world: 'w_grupos' }] }
    const o = scoreDiagnostic(its, all, s2, isOpen, firstOpenWorld(b, computeProgress(b, new Set())))
    expect(o.max).toBe(10 + 10 + 10 + 12)
    expect(o.suggested_world_id).toBe('w_grupos')
    expect(o.recommended_world_id).toBe('w_carbono')
  })
})

describe('barajado de opciones', () => {
  const ex = b.exercises.find((e) => e.id === 'e_carbono_enlaces')!
  const opts = ex.payload.options!

  it('el orden cambia entre intentos y se conserva dentro de un intento', () => {
    const a1 = presentationOrder(ex.type, opts, 'intento-1', ex.id).map((o) => o.value)
    const a1bis = presentationOrder(ex.type, opts, 'intento-1', ex.id).map((o) => o.value)
    expect(a1).toEqual(a1bis)
    const orders = new Set(Array.from({ length: 30 }, (_, i) => presentationOrder(ex.type, opts, `intento-${i}`, ex.id).map((o) => o.value).join()))
    expect(orders.size).toBeGreaterThan(5)
    // La correcta no queda siempre primero.
    const firsts = new Set(Array.from({ length: 30 }, (_, i) => presentationOrder(ex.type, opts, `x${i}`, ex.id)[0].value))
    expect(firsts.size).toBeGreaterThan(1)
  })

  it('true_false conserva su orden', () => {
    const tf = b.exercises.find((e) => e.type === 'true_false')!
    for (let i = 0; i < 10; i++) expect(presentationOrder(tf.type, tf.payload.options!, `i${i}`, tf.id)).toEqual(tf.payload.options)
  })

  it('la validación es por value, no por posición', () => {
    const shuffled = presentationOrder(ex.type, opts, 'z', ex.id)
    const pos = shuffled.findIndex((o) => o.value === ex.correct.value)
    expect(validateAnswer(ex, { value: shuffled[pos].value })).toBe('correct')
    expect(validateAnswer(ex, { value: String(pos) === ex.correct.value ? 'nada' : String(pos) })).toBe('incorrect')
  })
})

describe('validación genérica por tipo', () => {
  it('fill_blanks exige cada hueco', () => {
    const ex = b.exercises.find((e) => e.type === 'fill_blanks')!
    expect(validateAnswer(ex, { b1: 'etil', b2: 'metil' })).toBe('correct')
    expect(validateAnswer(ex, { b1: 'metil', b2: 'etil' })).toBe('incorrect')
    expect(validateAnswer(ex, { b1: 'etil' })).toBe('incorrect')
  })
  it.each(['multiple_choice', 'true_false', 'identify_group', 'chat_complete'])('%s valida contra correct.value', (type) => {
    const ex = b.exercises.find((e) => e.type === type)!
    expect(validateAnswer(ex, { value: ex.correct.value })).toBe('correct')
    const wrong = ex.payload.options!.find((o) => o.value !== ex.correct.value)!
    expect(validateAnswer(ex, { value: wrong.value })).toBe('incorrect')
  })
})

describe('sesión de lección: XP, monedas, errores y completar', () => {
  const g = gameValues(b)
  it('usa los valores de cada registro, con app_config como respaldo', () => {
    expect(g.hintCost).toBe(10)
    expect(g.freezeCost).toBe(50)
    expect(g.xpPerLesson).toBe(20)
  })

  it('completar es responder todo, no acertar todo; la recompensa de lección solo la primera vez', () => {
    let s = initialUserState('u1', true, new Date('2026-11-05T12:00:00'), 'es')
    const lesson = b.lessons.find((l) => l.id === 'l_carbono_enlaces')!
    const exs = lessonExercises(b, lesson.id, { narrow: false, drawOnNarrow: true, view3d: false })
    const st = startLesson(s, lesson.id, exs.length, new Date())
    s = st.state
    exs.forEach((ex, i) => {
      const verdict = i === 0 ? 'incorrect' : 'correct'
      s = recordExercise(s, { attemptId: st.attempt.id, exercise: ex, answer: {}, verdict, timeMs: 1000, now: new Date('2026-11-05T12:00:00'), g }).state
    })
    const xpEx = exs.slice(1).reduce((a, e) => a + (e.xp ?? 0), 0)
    expect(s.mistakes[exs[0].id].count).toBe(1)
    expect(s.streak.count).toBe(1)
    const o = finishLesson(b, s, { attemptId: st.attempt.id, lesson, correct: exs.length - 1, total: exs.length, now: new Date(), g })
    expect(o.firstCompletion).toBe(true)
    expect(o.state.user.xp_total).toBe(xpEx + (lesson.xp_reward ?? 0))
    expect(completedLessons(o.state).has(lesson.id)).toBe(true)
    // Repetirla no vuelve a dar la recompensa de la lección.
    const again = startLesson(o.state, lesson.id, exs.length, new Date())
    const o2 = finishLesson(b, again.state, { attemptId: again.attempt.id, lesson, correct: 0, total: exs.length, now: new Date(), g })
    expect(o2.firstCompletion).toBe(false)
    expect(o2.state.user.xp_total).toBe(o.state.user.xp_total)
  })
})
