import { describe, expect, it } from 'vitest'
import { loadBundleFromDisk } from '../../../scripts/packs'
import { computeProgress } from './unlock'
import { initialUserState } from './state'
import { completedLessons, startLesson } from './session'
import { startHereLesson } from './startHere'

const base = loadBundleFromDisk()
// En el seed solo w_carbono está abierto al inicio; para distinguir el camino
// del diagnóstico se abre también w_grupos en una copia del bundle.
const b = structuredClone(base)
b.worlds.find((w) => w.id === 'w_grupos')!.status = 'unlocked'
const now = new Date('2026-11-05T12:00:00Z')
const view = (s: ReturnType<typeof initialUserState>) => computeProgress(b, completedLessons(s), s.in_progress?.lesson_id ?? null)

describe('"Empieza aquí"', () => {
  it('con diagnóstico marca la primera lección del mundo recomendado', () => {
    const s = initialUserState('u', true, now, 'es')
    s.user.recommended_world_id = 'w_grupos'
    expect(startHereLesson(b, s, view(s))).toBe('l_grupos_intro')
  })

  it('sin diagnóstico (saltado) marca la primera lección del primer mundo abierto', () => {
    const s = initialUserState('u', true, now, 'es')
    expect(s.user.recommended_world_id).toBeNull()
    expect(startHereLesson(b, s, view(s))).toBe('l_carbono_enlaces')
  })

  it('si el mundo recomendado no está abierto, cae al primer mundo abierto', () => {
    const s = initialUserState('u', true, now, 'es')
    s.user.recommended_world_id = 'w_nomenclatura_alcanos'
    expect(startHereLesson(base, s, computeProgress(base, new Set()))).toBe('l_carbono_enlaces')
  })

  it('desaparece en cuanto se empieza la lección marcada', () => {
    for (const rec of ['w_grupos', null]) {
      const s0 = initialUserState('u', true, now, 'es')
      s0.user.recommended_world_id = rec
      const marked = startHereLesson(b, s0, view(s0))!
      const { state: s1 } = startLesson(s0, marked, 4, now)
      expect(startHereLesson(b, s1, view(s1))).toBeNull()
      // Aunque se abandone la lección (sin lección en curso), el intento ya cuenta.
      const s2 = { ...s1, in_progress: null }
      expect(startHereLesson(b, s2, view(s2))).toBeNull()
    }
  })
})
