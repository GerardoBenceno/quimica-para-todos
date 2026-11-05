import { Link, useNavigate } from 'react-router-dom'
import { useBundle } from '../stores/contentStore'
import { useUserState } from '../stores/progressStore'
import { useProgressView, useStartHere } from '../stores/selectors'
import { activeWorlds, worldOfLesson } from '../core/game/structure'
import { nextLesson } from '../core/game/unlock'
import { useT } from '../services/i18nHooks'
import { routes } from '../app/routes'
import { AppShell } from '../ui/AppShell'
import { WorldIcon } from '../ui/WorldIcon'
import { ProgressBar } from '../ui/ProgressBar'
import { AdSlot } from '../ui/AdSlot'
import { LockBadge } from '../ui/LockBadge'
import { CheckIcon, LockIcon } from '../ui/icons'
import { LessonIntro } from './LessonIntro'

/** Mapa de mundos como índice (tabla de contenidos) y la lección en curso. */
export function WorldMapScreen() {
  const t = useT()
  const b = useBundle()
  const s = useUserState()
  const view = useProgressView()
  const navigate = useNavigate()
  const worlds = activeWorlds(b)
  const ipStatus = s.in_progress ? view.lessons[s.in_progress.lesson_id]?.status : undefined
  const current =
    (ipStatus && ipStatus !== 'locked' ? s.in_progress!.lesson_id : null) ??
    (s.user.recommended_world_id ? nextLesson(b, view, s.user.recommended_world_id) : null) ??
    nextLesson(b, view)
  const startHere = useStartHere()
  const startWorld = startHere ? worldOfLesson(b, startHere)?.id : null
  const pending = Object.values(s.mistakes).filter((m) => !m.resolved).length

  return (
    <AppShell>
      <main id="main" className="container home">
        <section className="home-index" aria-labelledby="tu-ruta">
          <h2 id="tu-ruta" className="t-18">
            {t('map.title')}
          </h2>
          <ol className="world-list panel">
            {worlds.map((w) => {
              const v = view.worlds[w.id]
              const title = t(w.title_key)
              const open = v && v.status !== 'locked' && v.status !== 'coming_soon'
              const isCurrent = v?.status === 'in_progress' || (current && b.units.find((u) => u.id === b.lessons.find((l) => l.id === current)?.unit_id)?.world_id === w.id && v?.status !== 'completed')
              const req = w.unlock_rule?.requires_world ? b.worlds.find((x) => x.id === w.unlock_rule!.requires_world) : null
              return (
                <li key={w.id} className={`world-row ${isCurrent ? 'current' : ''} ${open ? '' : 'closed'} ${v?.status === 'coming_soon' ? 'soon' : ''}`}>
                  <WorldIcon worldId={w.id} label={title} size={64} />
                  <div className="world-text">
                    {open ? (
                      <Link className="row-link" to={routes.world(w.id)} aria-current={isCurrent ? 'true' : undefined}>
                        {title}
                      </Link>
                    ) : (
                      <span className="row-title">{title}</span>
                    )}
                    <LockBadge scopeId={w.id} />
                    <div className="world-status t-14">
                      {v?.status === 'completed' && (
                        <>
                          <CheckIcon size={14} className="ok-mark" />
                          {t('map.lessons_count', { n: v.completed, m: v.total })}
                        </>
                      )}
                      {v?.status === 'in_progress' && <span className="accent-text">{t('map.in_progress', { n: v.completed, m: v.total })}</span>}
                      {v?.status === 'available' && t('map.lessons_count', { n: v.completed, m: v.total })}
                      {v?.status === 'locked' && (
                        <>
                          <LockIcon size={14} />
                          {req ? t('map.unlock_requires', { world: t(req.title_key) }) : t('map.locked')}
                        </>
                      )}
                      {v?.status === 'coming_soon' && t('map.coming_soon')}
                      {s.user.recommended_world_id === w.id && open && v?.status !== 'completed' && <span className="tag">{t('map.recommended')}</span>}
                      {startWorld === w.id && <span className="tag">{t('start_here.label')}</span>}
                    </div>
                    {v?.status === 'in_progress' && <ProgressBar value={v.progress} label={t('map.progress_label', { world: title })} />}
                  </div>
                </li>
              )
            })}
          </ol>
          {pending > 0 && (
            <div className="panel review-box">
              <p>{t('map.review_pending', { n: pending })}</p>
              <Link className="link" to={routes.practice()}>
                {t('map.review_now')}
              </Link>
            </div>
          )}
          <AdSlot placement="world_map" />
        </section>
        <div className="home-current">
          {current ? (
            <LessonIntro lessonId={current} headingLevel={1} startHere={current === startHere} onStart={() => navigate(routes.lesson(current), { state: { autostart: true } })} />
          ) : (
            <h1 className="t-28">{t('map.all_done')}</h1>
          )}
        </div>
      </main>
    </AppShell>
  )
}
