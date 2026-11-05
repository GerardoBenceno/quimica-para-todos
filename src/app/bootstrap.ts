import { JsonPacksContentRepository } from '../adapters/local/JsonPacksContentRepository'
import { PregeneratedMoleculeRenderer } from '../adapters/local/PregeneratedMoleculeRenderer'
import { uiConfigSchema } from '../core/schemas'
import { initialUserState } from '../core/game/state'
import { LocalizationService } from '../services/localization'
import { AssetService } from '../services/assets'
import { applyTheme, pickTheme } from '../services/theme'
import { SafeLocalStore } from '../services/safeStorage'
import { useContentStore } from '../stores/contentStore'
import { useProgressStore } from '../stores/progressStore'
import { resolveFlags } from './flags'
import { registerServices } from './services'
import { selectAds, selectAnalytics, selectAuth, selectEntitlements, selectProgress } from './adapters'
import { selectEditor, selectMatcher, selectViewer3D } from './chemAdapters'
import { trackEvent } from './analyticsEvents'

const BASE = import.meta.env.BASE_URL

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return res.json()
}

/**
 * Arranque: flags, contenido, i18n, tema y registro de adaptadores. Si algo
 * falla, el store de contenido queda en estado de error con el mensaje.
 */
export async function bootstrap(): Promise<void> {
  const content = useContentStore.getState()
  try {
    const [featuresJson, uiJson] = await Promise.all([getJson('config/features.json'), getJson('config/ui.json')])
    const ui = uiConfigSchema.parse(uiJson)

    const contentRepo = new JsonPacksContentRepository(BASE)
    const loaded = await contentRepo.load()
    if (!loaded.ok) throw new Error(loaded.error.message)
    const bundle = loaded.value

    const flags = resolveFlags(bundle.appConfig, featuresJson)
    const store = new SafeLocalStore()
    const deps = { store, access: bundle.access, debug: import.meta.env.DEV }

    const i18n = new LocalizationService(ui.locale)
    i18n.addContent(bundle.translations)
    i18n.addUi((await getJson(ui.ui_strings)) as Record<string, string>)
    document.documentElement.lang = ui.locale

    const [auth, progress, entitlements, ads, analytics] = await Promise.all([
      selectAuth(flags, deps),
      selectProgress(flags, deps),
      selectEntitlements(flags, deps),
      selectAds(flags),
      selectAnalytics(flags, deps),
    ])
    registerServices({
      flags,
      content: contentRepo,
      progress,
      auth,
      entitlements,
      ads,
      analytics,
      molecules: new PregeneratedMoleculeRenderer(BASE),
      viewer3d: selectViewer3D(flags, BASE),
      editor: selectEditor(BASE),
      matcher: selectMatcher(BASE),
    })

    const user = await auth.currentUser()
    const saved = await progress.load(user.id)
    const state = saved ?? initialUserState(user.id, user.isAnonymous, new Date(), ui.locale)
    if (!saved) await progress.save(user.id, state)
    useProgressStore.getState().init(state, store.persistent)

    const theme = pickTheme(bundle.themes, state.user.theme_id ?? ui.theme)
    if (theme) applyTheme(theme)

    content.setReady({ bundle, i18n, assets: new AssetService(bundle.assets, BASE), ui, theme })
    trackEvent('app_open', {})
  } catch (e) {
    console.error(e)
    content.setError((e as Error).message)
  }
}
