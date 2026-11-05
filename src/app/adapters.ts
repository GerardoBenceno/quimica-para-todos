// Registro de adaptadores según los flags. Un flag solo decide qué adaptador
// se usa; los adaptadores futuros se cargan con import() dinámico y por eso
// no entran al bundle mientras su flag esté apagado.
import type {
  AdsService,
  AnalyticsService,
  AuthService,
  EntitlementsService,
  ProgressRepository,
} from '../ports'
import type { AccessLevel } from '../models'
import type { FeatureFlags } from './flags'
import type { KeyValueStore } from '../services/safeStorage'
import { LocalAnonymousAuthService } from '../adapters/local/LocalAnonymousAuthService'
import { LocalProgressRepository } from '../adapters/local/LocalProgressRepository'
import { FreeEntitlementsService } from '../adapters/local/FreeEntitlementsService'
import { NoopAdsService } from '../adapters/noop/NoopAdsService'
import { NoopAnalyticsService } from '../adapters/noop/NoopAnalyticsService'

export interface AdapterDeps {
  store: KeyValueStore
  access: Record<string, AccessLevel>
  debug: boolean
}

export async function selectAuth(flags: FeatureFlags, deps: AdapterDeps): Promise<AuthService> {
  if (flags.auth) {
    const m = await import('../adapters/supabase')
    return new m.SupabaseAuthService(m.readSupabaseEnv())
  }
  return new LocalAnonymousAuthService(deps.store)
}

export async function selectProgress(flags: FeatureFlags, deps: AdapterDeps): Promise<ProgressRepository> {
  const local = new LocalProgressRepository(deps.store)
  if (flags.cloudSync) {
    const m = await import('../adapters/supabase')
    return new m.SupabaseProgressRepository(m.readSupabaseEnv(), local)
  }
  return local
}

export async function selectEntitlements(flags: FeatureFlags, deps: AdapterDeps): Promise<EntitlementsService> {
  if (flags.payments) {
    const m = await import('../adapters/supabase')
    return new m.ServerEntitlementsService(m.readSupabaseEnv())
  }
  return new FreeEntitlementsService(deps.access)
}

export async function selectAds(flags: FeatureFlags): Promise<AdsService> {
  if (flags.ads) {
    const m = await import('../adapters/future/ProviderAdsService')
    return new m.ProviderAdsService()
  }
  return new NoopAdsService()
}

export async function selectAnalytics(flags: FeatureFlags, deps: AdapterDeps): Promise<AnalyticsService> {
  if (flags.analytics) {
    const m = await import('../adapters/future/ProviderAnalyticsService')
    return new m.ProviderAnalyticsService()
  }
  return new NoopAnalyticsService(deps.debug)
}
