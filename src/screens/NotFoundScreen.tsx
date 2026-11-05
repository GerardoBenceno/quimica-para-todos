import { Link } from 'react-router-dom'
import { useT } from '../services/i18nHooks'
import { routes } from '../app/routes'
import { AppShell } from '../ui/AppShell'
import { Carbo } from '../ui/Carbo'

/** Página o recurso inexistente dentro de la app (ruta, lección o intento). */
export function NotFoundScreen() {
  const t = useT()
  return (
    <AppShell>
      <main id="main" className="narrow page">
        <div className="empty">
          <Carbo expression="think" size={96} />
          <h1 className="t-28">{t('error.not_found')}</h1>
          <p className="t-body muted">{t('error.not_found_lead')}</p>
          <div className="confirm-actions">
            <Link className="btn btn-primary" to={routes.worlds()}>
              {t('error.go_map')}
            </Link>
            <Link className="link" to={routes.home()}>
              {t('error.go_home')}
            </Link>
          </div>
        </div>
      </main>
    </AppShell>
  )
}
