import { Link, useNavigate } from 'react-router-dom'
import { APP_DISPLAY_NAME, APP_REPO_URL } from '../app/brand'
import { routes } from '../app/routes'
import { useBundle } from '../stores/contentStore'
import { useProgressStore } from '../stores/progressStore'
import { useT } from '../services/i18nHooks'
import { AppShell } from '../ui/AppShell'
import { BrandMark } from '../ui/BrandMark'

/**
 * Acerca del proyecto: qué es, qué contiene (contado desde el contenido
 * cargado), cómo guarda los datos, con qué está hecho y el autor. Los datos
 * del autor que no están en el repositorio quedan como [completar].
 */
export function AboutScreen() {
  const t = useT()
  const b = useBundle()
  const navigate = useNavigate()
  const welcomed = useProgressStore((s) => s.state?.onboarding.welcomed)
  const worlds = b.worlds.filter((w) => w.is_active && w.status !== 'coming_soon')
  const soon = b.worlds.filter((w) => w.is_active && w.status === 'coming_soon')
  const lessons = b.lessons.filter((l) => l.is_active)
  const exercises = b.exercises.filter((e) => e.is_active && e.lesson_id && lessons.some((l) => l.id === e.lesson_id))
  const items = b.diagnosticItems.filter((i) => i.is_active)

  const body = (
    <main id="main" className="narrow page">
      <div className="brand">
        <BrandMark />
        <span>{APP_DISPLAY_NAME}</span>
      </div>
      <h1 className="t-28">{t('about.title', { app: APP_DISPLAY_NAME })}</h1>
      <p className="t-body">{t('about.lead')}</p>

      <section className="section about-section" aria-labelledby="about-content">
        <h2 id="about-content" className="t-18">
          {t('about.content_title')}
        </h2>
        <p>{t('about.content', { worlds: worlds.length, lessons: lessons.length, exercises: exercises.length, items: items.length, soon: soon.length })}</p>
        <p className="muted">{t('about.content_note')}</p>
      </section>

      <section className="section about-section" aria-labelledby="about-data">
        <h2 id="about-data" className="t-18">
          {t('about.data_title')}
        </h2>
        <p>{t('about.data')}</p>
        <p>{t('about.offline')}</p>
      </section>

      <section className="section about-section" aria-labelledby="about-engines">
        <h2 id="about-engines" className="t-18">
          {t('about.engines_title')}
        </h2>
        <p>{t('about.engines')}</p>
        <p>{t('about.mascot')}</p>
      </section>

      <section className="section about-section" aria-labelledby="about-author">
        <h2 id="about-author" className="t-18">
          {t('about.author_title')}
        </h2>
        <p>{t('about.author')}</p>
        <p>{t('about.contact')}</p>
        <p>{t('about.license')}</p>
      </section>

      <div className="about-links">
        <a className="link" href={APP_REPO_URL} target="_blank" rel="noopener noreferrer">
          {t('about.source')}
        </a>
        <span className="muted t-14 version-line">{t('about.version', { version: __APP_VERSION__ })}</span>
      </div>
      {welcomed ? (
        <button type="button" className="link" onClick={() => navigate(-1)}>
          {t('about.back')}
        </button>
      ) : (
        <Link className="link" to={routes.welcome()}>
          {t('about.back')}
        </Link>
      )}
    </main>
  )
  return welcomed ? <AppShell>{body}</AppShell> : <div className="shell">{body}</div>
}
