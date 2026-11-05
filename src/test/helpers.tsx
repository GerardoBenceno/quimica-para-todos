import type { ReactNode } from 'react'
import { readFileSync } from 'node:fs'
import { MemoryRouter } from 'react-router-dom'
import { loadBundleFromDisk } from '../../scripts/packs'
import { LocalizationService } from '../services/localization'
import { AssetService } from '../services/assets'
import { useContentStore } from '../stores/contentStore'
import { useProgressStore } from '../stores/progressStore'
import { initialUserState } from '../core/game/state'
import { registerServices } from '../app/services'
import { ALL_OFF } from '../app/flags'
import { LocalProgressRepository } from '../adapters/local/LocalProgressRepository'
import { LocalAnonymousAuthService } from '../adapters/local/LocalAnonymousAuthService'
import { FreeEntitlementsService } from '../adapters/local/FreeEntitlementsService'
import { NoopAdsService } from '../adapters/noop/NoopAdsService'
import { NoopAnalyticsService } from '../adapters/noop/NoopAnalyticsService'
import { MemoryStore } from '../services/safeStorage'
import type { MoleculeRenderer } from '../ports'

/** Prepara stores y servicios con el contenido real y adaptadores en memoria. */
export function setupApp(overrides: Partial<Parameters<typeof registerServices>[0]> = {}) {
  const bundle = loadBundleFromDisk()
  const i18n = new LocalizationService('es')
  i18n.addContent(bundle.translations)
  i18n.addUi(JSON.parse(readFileSync('public/config/i18n/ui_es.json', 'utf8')))
  const store = new MemoryStore()
  const molecules: MoleculeRenderer = { entry: async () => null, svg: async () => '<svg xmlns="http://www.w3.org/2000/svg"></svg>' }
  registerServices({
    flags: { ...ALL_OFF },
    content: { load: async () => ({ ok: true, value: bundle }) },
    progress: new LocalProgressRepository(store),
    auth: new LocalAnonymousAuthService(store),
    entitlements: new FreeEntitlementsService(),
    ads: new NoopAdsService(),
    analytics: new NoopAnalyticsService(),
    molecules,
    viewer3d: null,
    editor: null,
    matcher: null,
    ...overrides,
  })
  useContentStore.getState().setReady({
    bundle,
    i18n,
    assets: new AssetService(bundle.assets, '/'),
    ui: { theme: 'web_theme_claro_prusia', locale: 'es', ui_strings: '', narrow_breakpoint_px: 600 },
    theme: null,
  })
  useProgressStore.getState().init(initialUserState('test-user', true, new Date(), 'es'), false)
  return { bundle, i18n }
}

export function Router({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>
}
