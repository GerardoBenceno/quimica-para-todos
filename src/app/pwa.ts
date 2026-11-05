import { registerSW } from 'virtual:pwa-register'

/** Registra el service worker (solo en producción) con actualización automática. */
export function registerServiceWorker() {
  if (import.meta.env.DEV) return
  registerSW({ immediate: true })
}
