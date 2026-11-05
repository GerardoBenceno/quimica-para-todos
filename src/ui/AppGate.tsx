import type { ReactNode } from 'react'
import { APP_DISPLAY_NAME } from '../app/brand'
import { useContentStore } from '../stores/contentStore'
import { useProgressStore } from '../stores/progressStore'
import { BrandMark } from './BrandMark'

/**
 * Estados de carga y error del arranque. Los textos de interfaz se cargan
 * antes que el contenido, así el error se explica en palabras claras y el
 * detalle técnico queda plegado. Si ni los textos cargaron, se muestra el
 * mensaje técnico tal cual.
 */
export function AppGate({ children, onRetry }: { children: ReactNode; onRetry(): void }) {
  const status = useContentStore((s) => s.status)
  const error = useContentStore((s) => s.error)
  const i18n = useContentStore((s) => s.i18n)
  const progress = useProgressStore((s) => s.state)

  if (status === 'error') {
    const t = (k: string) => (i18n?.has(k) ? i18n.t(k) : null)
    return (
      <main className="state" role="alert">
        <div className="brand">
          <BrandMark />
          <span>{APP_DISPLAY_NAME}</span>
        </div>
        <div className="panel state-panel">
          <h1 className="t-22">{t('error.content_title') ?? error}</h1>
          {t('error.content_lead') && <p className="t-body muted">{t('error.content_lead')}</p>}
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            {t('error.retry') ?? '↻'}
          </button>
          {t('error.content_title') && (
            <details className="tech-detail">
              <summary>{t('error.technical_detail')}</summary>
              <pre>{error}</pre>
            </details>
          )}
        </div>
      </main>
    )
  }
  if (status !== 'ready' || !progress) {
    return (
      <main className="state state-loading" aria-busy="true" aria-live="polite">
        <div className="brand brand-loading">
          <BrandMark size={40} />
          <span>{APP_DISPLAY_NAME}</span>
        </div>
      </main>
    )
  }
  return <>{children}</>
}
