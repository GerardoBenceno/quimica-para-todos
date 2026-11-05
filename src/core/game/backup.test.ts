import { describe, expect, it } from 'vitest'
import { initialUserState } from './state'
import { makeBackup, readBackup } from './backup'

describe('respaldo del progreso', () => {
  it('exporta e importa adoptando el userId del dispositivo', () => {
    const s = initialUserState('u-origen', true, new Date('2026-11-05T00:00:00Z'), 'es')
    s.user.xp_total = 120
    const text = JSON.stringify(makeBackup(s))
    const r = readBackup(text, 'u-destino')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.state.user.id).toBe('u-destino')
      expect(r.state.streak.user_id).toBe('u-destino')
      expect(r.state.user.xp_total).toBe(120)
    }
  })
  it('rechaza lo que no es un respaldo', () => {
    expect(readBackup('no es json', 'u')).toEqual({ ok: false, error: 'not_json' })
    expect(readBackup('{"hola":1}', 'u')).toEqual({ ok: false, error: 'not_backup' })
    const s = initialUserState('u', true, new Date(), 'es')
    const b = makeBackup(s)
    b.state.version = 99
    expect(readBackup(JSON.stringify(b), 'u')).toEqual({ ok: false, error: 'version' })
  })
})
