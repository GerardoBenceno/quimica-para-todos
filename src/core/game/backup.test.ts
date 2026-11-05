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
  it('rechaza un estado con claves correctas pero tipos malformados y completa campos de versiones viejas', () => {
    const s = initialUserState('u', true, new Date(), 'es')
    const bad = makeBackup(s) as unknown as { state: Record<string, unknown> }
    bad.state = { ...bad.state, lesson_attempts: {}, user: {} }
    expect(readBackup(JSON.stringify(bad), 'u')).toEqual({ ok: false, error: 'not_backup' })
    const old = makeBackup(s) as unknown as { state: { streak: Record<string, unknown>; in_progress?: unknown } }
    delete old.state.streak.freezes_available
    delete old.state.streak.freeze_week
    delete old.state.streak.freezes_used_week
    delete old.state.in_progress
    const r = readBackup(JSON.stringify(old), 'u')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.state.streak.freezes_available).toBe(0)
      expect(r.state.in_progress).toBeNull()
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
