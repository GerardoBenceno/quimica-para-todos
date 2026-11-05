import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolveFlags } from './flags'
import { selectAds, selectAnalytics, selectAuth, selectEntitlements, selectProgress } from './adapters'
import { MemoryStore } from '../services/safeStorage'
import { LocalAnonymousAuthService } from '../adapters/local/LocalAnonymousAuthService'
import { LocalProgressRepository } from '../adapters/local/LocalProgressRepository'
import { FreeEntitlementsService } from '../adapters/local/FreeEntitlementsService'
import { NoopAdsService } from '../adapters/noop/NoopAdsService'
import { NoopAnalyticsService } from '../adapters/noop/NoopAnalyticsService'
import { loadBundleFromDisk } from '../../scripts/packs'

const features = JSON.parse(readFileSync('public/config/features.json', 'utf8'))

describe('feature flags', () => {
  it('features.json manda sobre los flags del seed', () => {
    const b = loadBundleFromDisk()
    const flags = resolveFlags(b.appConfig, features)
    // El seed trae molecules_3d=false; features.json lo enciende.
    expect(flags.molecules3d).toBe(true)
    expect(flags.cloudSync).toBe(false)
    expect(flags.payments).toBe(false)
  })

  it('sin features.json, los flags del seed son el valor por defecto', () => {
    const b = loadBundleFromDisk()
    const flags = resolveFlags(b.appConfig, {})
    expect(flags.molecules3d).toBe(false)
    expect(flags.auth).toBe(false)
  })
})

describe('selección de adaptadores según flags', () => {
  const deps = { store: new MemoryStore(), access: {}, debug: false }
  const off = resolveFlags([], features)

  it('con los flags apagados usa los adaptadores locales y no-op', async () => {
    expect(await selectAuth(off, deps)).toBeInstanceOf(LocalAnonymousAuthService)
    expect(await selectProgress(off, deps)).toBeInstanceOf(LocalProgressRepository)
    expect(await selectEntitlements(off, deps)).toBeInstanceOf(FreeEntitlementsService)
    expect(await selectAds(off)).toBeInstanceOf(NoopAdsService)
    expect(await selectAnalytics(off, deps)).toBeInstanceOf(NoopAnalyticsService)
  })

  it('con flags encendidos carga los adaptadores futuros (stubs)', async () => {
    const on = { ...off, auth: true, cloudSync: true, payments: true, ads: true, analytics: true }
    const auth = await selectAuth(on, deps)
    expect(auth.constructor.name).toBe('SupabaseAuthService')
    await expect(auth.currentUser()).rejects.toThrow(/NotImplemented/)
    expect((await selectProgress(on, deps)).constructor.name).toBe('SupabaseProgressRepository')
    expect((await selectEntitlements(on, deps)).constructor.name).toBe('ServerEntitlementsService')
    expect((await selectAds(on)).enabled).toBe(true)
  })

  it('EntitlementsService devuelve free por defecto', () => {
    const e = new FreeEntitlementsService({})
    expect(e.accessOf('w_carbono')).toBe('free')
    expect(e.hasAccess('w_carbono')).toBe(true)
  })
})

describe('adaptadores locales', () => {
  it('el usuario anónimo conserva su UUID', async () => {
    const store = new MemoryStore()
    const a = new LocalAnonymousAuthService(store)
    const u1 = await a.currentUser()
    const u2 = await a.currentUser()
    expect(u1.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(u2.id).toBe(u1.id)
  })
})
