import type { ReactNode } from 'react'
import { useContentStore } from '../stores/contentStore'
import { useProgressStore } from '../stores/progressStore'

/**
 * Estados de carga y error del arranque. Antes de que cargue la i18n no hay
 * textos disponibles, así que la carga se anuncia solo con aria-busy y el
 * error muestra el mensaje técnico del validador.
 */
export function AppGate({ children, onRetry }: { children: ReactNode; onRetry(): void }) {
  const status = useContentStore((s) => s.status)
  const error = useContentStore((s) => s.error)
  const i18n = useContentStore((s) => s.i18n)
  const progress = useProgressStore((s) => s.state)

  if (status === 'error') {
    return (
      <main className="state" role="alert">
        <h1 className="t-22">{i18n?.t('error.content_title') ?? '⚠'}</h1>
        <pre>{error}</pre>
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          {i18n?.t('error.retry') ?? '↻'}
        </button>
      </main>
    )
  }
  if (status !== 'ready' || !progress) {
    return <main className="state" aria-busy="true" aria-live="polite" />
  }
  return <>{children}</>
}
