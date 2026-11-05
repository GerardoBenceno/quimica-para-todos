import { registerSW } from 'virtual:pwa-register'
import { listenInstallPrompt, usePwaStore } from '../stores/pwaStore'

/**
 * Registra el service worker (solo en producción). Cuando hay una versión nueva
 * instalada, el aviso discreto de AppShell ofrece recargar; no se recarga sola
 * a mitad de un ejercicio.
 */
export function registerServiceWorker() {
  listenInstallPrompt()
  if (import.meta.env.DEV) return
  const update = registerSW({
    immediate: true,
    onNeedRefresh() {
      usePwaStore.getState().setNeedRefresh(() => update(true))
    },
  })
}
