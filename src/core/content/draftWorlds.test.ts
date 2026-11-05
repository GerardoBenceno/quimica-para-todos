import { describe, expect, it } from 'vitest'
import { loadBundleFromDisk } from '../../../scripts/packs'
import { enableDraftWorlds } from './draftWorlds'
import { draftRequested } from '../../app/flags'

describe('mundos en borrador', () => {
  const b = loadBundleFromDisk()
  it('sin lecciones, un mundo "Próximamente" sigue igual con cualquier modo', () => {
    const w = b.worlds.find((x) => x.status === 'coming_soon')!
    for (const mode of ['off', 'flag', 'draft'] as const) {
      const out = enableDraftWorlds(b, mode)
      if (b.lessons.every((l) => b.units.find((u) => u.id === l.unit_id)?.world_id !== w.id)) expect(out.worlds.find((x) => x.id === w.id)?.status).toBe('coming_soon')
    }
  })
  it('con lecciones: flag = bloqueado tras el mundo anterior; borrador = abierto', () => {
    const w = b.worlds.find((x) => x.status === 'coming_soon')!
    const unit = { ...b.units[0], id: 'tmp_u', world_id: w.id }
    const lesson = { ...b.lessons[0], id: 'tmp_l', unit_id: 'tmp_u' }
    const withLessons = { ...b, units: [...b.units, unit], lessons: [...b.lessons, lesson] }
    const flag = enableDraftWorlds(withLessons, 'flag').worlds.find((x) => x.id === w.id)!
    expect(flag.status).toBe('locked')
    expect(flag.unlock_rule?.requires_world).toBeDefined()
    const draft = enableDraftWorlds(withLessons, 'draft').worlds.find((x) => x.id === w.id)!
    expect(draft.status).toBe('unlocked')
    expect(enableDraftWorlds(withLessons, 'off').worlds.find((x) => x.id === w.id)!.status).toBe('coming_soon')
  })
  it('?borrador=1 antes o después del hash', () => {
    expect(draftRequested('https://x.test/app/?borrador=1#/aprender')).toBe(true)
    expect(draftRequested('https://x.test/app/#/aprender?borrador=1')).toBe(true)
    expect(draftRequested('https://x.test/app/#/aprender')).toBe(false)
  })
})
