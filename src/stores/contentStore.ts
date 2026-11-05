import { create } from 'zustand'
import type { ContentBundle } from '../core/content/bundle'
import type { LocalizationService } from '../services/localization'
import type { AssetService } from '../services/assets'
import type { Theme } from '../models'

export interface UiConfig {
  theme: string
  locale: string
  ui_strings: string
  narrow_breakpoint_px: number
}

interface ContentState {
  status: 'loading' | 'ready' | 'error'
  error: string | null
  bundle: ContentBundle | null
  i18n: LocalizationService | null
  assets: AssetService | null
  ui: UiConfig | null
  theme: Theme | null
  setReady(p: { bundle: ContentBundle; i18n: LocalizationService; assets: AssetService; ui: UiConfig; theme: Theme | null }): void
  setError(message: string): void
  setTheme(theme: Theme): void
}

export const useContentStore = create<ContentState>((set) => ({
  status: 'loading',
  error: null,
  bundle: null,
  i18n: null,
  assets: null,
  ui: null,
  theme: null,
  setReady: (p) => set({ status: 'ready', error: null, ...p }),
  setError: (message) => set({ status: 'error', error: message }),
  setTheme: (theme) => set({ theme }),
}))

/** Acceso a contenido ya cargado; solo se usa debajo de la puerta de carga. */
export function useBundle(): ContentBundle {
  const b = useContentStore((s) => s.bundle)
  if (!b) throw new Error('Contenido no cargado')
  return b
}
