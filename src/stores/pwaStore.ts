import { create } from 'zustand'

/**
 * Estado de la PWA: si hay una versión nueva esperando (el service worker la
 * instaló y falta recargar) y si el navegador ofrece instalar la app
 * (evento beforeinstallprompt, solo Chromium). Lo alimenta app/pwa.ts.
 */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PwaStore {
  needRefresh: boolean
  updateSW: (() => Promise<void>) | null
  install: InstallPromptEvent | null
  installed: boolean
  setNeedRefresh(update: () => Promise<void>): void
  setInstall(e: InstallPromptEvent | null): void
  setInstalled(): void
}

export const usePwaStore = create<PwaStore>((set) => ({
  needRefresh: false,
  updateSW: null,
  install: null,
  installed: false,
  setNeedRefresh: (updateSW) => set({ needRefresh: true, updateSW }),
  setInstall: (install) => set({ install }),
  setInstalled: () => set({ installed: true, install: null }),
}))

/** Escucha el evento de instalación del navegador (si existe). */
export function listenInstallPrompt() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    usePwaStore.getState().setInstall(e as InstallPromptEvent)
  })
  window.addEventListener('appinstalled', () => usePwaStore.getState().setInstalled())
}

/** Pide instalar; devuelve si el usuario aceptó. */
export async function promptInstall(): Promise<boolean> {
  const e = usePwaStore.getState().install
  if (!e) return false
  await e.prompt()
  const { outcome } = await e.userChoice
  if (outcome === 'accepted') usePwaStore.getState().setInstalled()
  else usePwaStore.getState().setInstall(null)
  return outcome === 'accepted'
}
