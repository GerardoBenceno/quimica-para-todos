import { Link } from 'react-router-dom'
import { useT } from '../services/i18nHooks'
import { routes } from '../app/routes'

export function NotFoundScreen() {
  const t = useT()
  return (
    <main id="main" className="state">
      <h1 className="t-22">{t('error.not_found')}</h1>
      <Link className="link" to={routes.home()}>
        {t('error.go_home')}
      </Link>
    </main>
  )
}
