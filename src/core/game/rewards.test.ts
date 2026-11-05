import { describe, expect, it } from 'vitest'
import { loadBundleFromDisk } from '../../../scripts/packs'
import { gameValues } from './config'
import { initialUserState, type UserState } from './state'
import { activityDay, displayedStreak, touchStreak } from './streak'
import { buyFreeze, chestNodes, claimChest } from './rewards'

const b = loadBundleFromDisk()
const g = gameValues(b)
const at = (iso: string) => new Date(iso)
const fresh = (): UserState => initialUserState('u', true, at('2026-11-02T10:00:00'), 'es')

describe('racha', () => {
  it('sube con el primer ejercicio del día y no con los siguientes', () => {
    let s = touchStreak(fresh(), at('2026-11-02T10:00:00'), g).state
    expect(s.streak.count).toBe(1)
    s = touchStreak(s, at('2026-11-02T18:00:00'), g).state
    expect(s.streak.count).toBe(1)
    const r = touchStreak(s, at('2026-11-03T09:00:00'), g)
    expect(r.change).toBe('incremented')
    expect(r.state.streak.count).toBe(2)
    expect(r.state.user.longest_streak).toBe(2)
  })

  it('el día cambia a la hora reset_hour_local del seed', () => {
    expect(g.resetHourLocal).toBe(4)
    expect(activityDay(at('2026-11-03T03:59:00'), 4)).toBe('2026-11-02')
    expect(activityDay(at('2026-11-03T04:00:00'), 4)).toBe('2026-11-03')
  })

  it('se reinicia si falta un día sin congelación', () => {
    let s = touchStreak(fresh(), at('2026-11-02T10:00:00'), g).state
    s = touchStreak(s, at('2026-11-03T10:00:00'), g).state
    const r = touchStreak(s, at('2026-11-05T10:00:00'), g)
    expect(r.change).toBe('reset')
    expect(r.state.streak.count).toBe(1)
    expect(displayedStreak(s, at('2026-11-05T10:00:00'), g)).toBe(0)
  })

  it('una congelación comprada cubre un día faltante', () => {
    let s = touchStreak(fresh(), at('2026-11-02T10:00:00'), g).state
    s = { ...s, user: { ...s.user, coins: 100 } }
    s = buyFreeze(b, s, g, at('2026-11-02T11:00:00'))!
    expect(s.user.coins).toBe(100 - g.freezeCost)
    expect(s.streak.freezes_available).toBe(1)
    const r = touchStreak(s, at('2026-11-04T10:00:00'), g)
    expect(r.change).toBe('frozen')
    expect(r.state.streak.count).toBe(2)
    expect(r.state.streak.freezes_available).toBe(0)
  })

  it('no se puede comprar sin monedas', () => {
    expect(buyFreeze(b, fresh(), g, at('2026-11-02T10:00:00'))).toBeNull()
  })
})

describe('cofres', () => {
  it('cuelgan cada trigger.every lecciones y se abren una sola vez', () => {
    const s = fresh()
    const every = b.rewards.find((r) => r.type === 'chest')!.trigger.every!
    const nodes = chestNodes(b, 'w_carbono', s, new Set(['l_carbono_enlaces', 'l_organico']))
    expect(nodes.map((n) => n.afterIndex)).toEqual([every, every * 2, every * 3])
    expect(nodes[0].status).toBe('ready')
    expect(nodes[1].status).toBe('locked')
    const s2 = claimChest(s, nodes[0], at('2026-11-02T10:00:00'))
    expect(s2.user.coins).toBe(nodes[0].reward.value)
    const again = chestNodes(b, 'w_carbono', s2, new Set(['l_carbono_enlaces', 'l_organico']))
    expect(again[0].status).toBe('claimed')
    expect(claimChest(s2, again[0], at('2026-11-02T10:00:00'))).toBe(s2)
  })
})
