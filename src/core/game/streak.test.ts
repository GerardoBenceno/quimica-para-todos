import { describe, expect, it } from 'vitest'
import { loadBundleFromDisk } from '../../../scripts/packs'
import { gameValues } from './config'
import { initialUserState } from './state'
import { displayedStreak, touchStreak } from './streak'

const g = gameValues(loadBundleFromDisk())
const at = (iso: string) => new Date(iso)

describe('racha: casos borde', () => {
  it('sube con el primer ejercicio del día y cruza la medianoche a la hora de corte', () => {
    let s = initialUserState('u', true, at('2026-11-05T10:00:00Z'), 'es')
    s = touchStreak(s, at('2026-11-05T10:00:00Z'), g).state
    expect(s.streak.count).toBe(1)
    expect(touchStreak(s, at('2026-11-05T23:00:00Z'), g).change).toBe('none')
    s = touchStreak(s, at('2026-11-06T10:00:00Z'), g).state
    expect(s.streak.count).toBe(2)
  })

  it('un cambio de zona horaria o reloj hacia atrás no suma un día extra', () => {
    let s = initialUserState('u', true, at('2026-11-06T10:00:00Z'), 'es')
    s = touchStreak(s, at('2026-11-06T10:00:00Z'), g).state
    const back = touchStreak(s, at('2026-11-05T12:00:00Z'), g)
    expect(back.change).toBe('none')
    expect(back.state.streak.last_active_date).toBe(s.streak.last_active_date)
  })

  it('la racha mostrada respeta el tope semanal de protectores, igual que al tocarla', () => {
    let s = initialUserState('u', true, at('2026-11-02T10:00:00Z'), 'es')
    s = touchStreak(s, at('2026-11-02T10:00:00Z'), g).state
    s = { ...s, streak: { ...s.streak, count: 10, freezes_available: 5 } }
    const later = at('2026-11-06T10:00:00Z') // 3 días perdidos
    const shown = displayedStreak(s, later, g)
    const touched = touchStreak(s, later, g)
    expect(shown === 0).toBe(touched.change === 'reset')
    if (touched.change === 'frozen') expect(shown).toBe(10)
  })
})
