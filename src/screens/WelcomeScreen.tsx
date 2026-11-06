import { Link, useNavigate } from 'react-router-dom'
import { useT } from '../services/i18nHooks'
import { useProgressStore } from '../stores/progressStore'
import { BrandLogo } from '../ui/BrandMark'
import { Carbo } from '../ui/Carbo'
import { routes } from '../app/routes'

/** Bienvenida: el logo, un botón y sin registro. Carbo en reposo sobre un bloque pastel plano. */
export function WelcomeScreen() {
  const t = useT()
  const navigate = useNavigate()
  const update = useProgressStore((s) => s.update)

  const start = () => {
    update((s) => ({ ...s, onboarding: { ...s.onboarding, welcomed: true } }))
    navigate(routes.diagnostic())
  }

  return (
    <main id="main" className="welcome">
      <div className="container">
        <div className="welcome-card panel-warm">
          <div className="welcome-inner">
            <BrandLogo height={132} />
            <h1 className="t-36">{t('app.tagline')}</h1>
            <p className="t-body muted">{t('welcome.lead')}</p>
            <button type="button" className="btn btn-primary" onClick={start}>
              {t('welcome.start')}
            </button>
            <p className="t-14 muted">{t('welcome.no_signup')}</p>
            <Link className="link t-15" to={routes.about()}>
              {t('welcome.about')}
            </Link>
          </div>
          <div className="welcome-art illus-block" aria-hidden="true">
            <Carbo expression="idle" size={200} priority />
          </div>
        </div>
      </div>
    </main>
  )
}
