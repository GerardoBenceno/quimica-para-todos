import { Link, useNavigate, useParams } from 'react-router-dom'
import { useBundle } from '../stores/contentStore'
import { useUserState } from '../stores/progressStore'
import { useCompleted, useProgressView } from '../stores/selectors'
import { lessonsOfWorld } from '../core/game/structure'
import { chestNodes } from '../core/game/rewards'
import { openChest } from '../stores/actions'
import { useT } from '../services/i18nHooks'
import { routes } from '../app/routes'
import { AppShell } from '../ui/AppShell'
import { ProgressBar } from '../ui/ProgressBar'
import { ChemText } from '../ui/ChemText'
import { BackIcon, ChestIcon } from '../ui/icons'
import { ChainLinks, PATH, VertexMark, vertexX, vertexY, type ChainLink, type VertexState } from '../ui/PathChain'
import { NotFoundScreen } from './NotFoundScreen'

/**
 * Ruta del mundo: cadena en zigzag (120°) donde cada vértice es una lección.
 * Completada en tinta con palomita, en curso en azul de Prusia con halo,
 * bloqueada en blanco con borde. Los cofres cuelgan como ramificaciones.
 */
export function WorldPathScreen() {
  const { worldId = '' } = useParams()
  const t = useT()
  const b = useBundle()
  const s = useUserState()
  const view = useProgressView()
  const completed = useCompleted()
  const navigate = useNavigate()
  const world = b.worlds.find((w) => w.id === worldId && w.is_active)
  const wv = view.worlds[worldId]
  if (!world || !wv) return <NotFoundScreen />
  if (wv.status === 'locked' || wv.status === 'coming_soon') {
    return (
      <AppShell>
        <main id="main" className="narrow page">
          <h1 className="t-28">{t(world.title_key)}</h1>
          <p>{t(wv.status === 'coming_soon' ? 'map.coming_soon' : 'map.locked')}</p>
          <Link className="link" to={routes.worlds()}>
            {t('path.back_to_map')}
          </Link>
        </main>
      </AppShell>
    )
  }

  const lessons = lessonsOfWorld(b, worldId)
  const states: VertexState[] = lessons.map((l) => {
    const st = view.lessons[l.id]?.status
    return st === 'completed' ? 'completed' : st === 'available' || st === 'in_progress' ? 'current' : 'locked'
  })
  const currentIndex = states.indexOf('current')
  const links: ChainLink[] = lessons.slice(1).map((_, i) => ({
    from: i,
    to: i + 1,
    style: states[i] === 'completed' && states[i + 1] !== 'locked' ? 'solid' : 'dashed',
  }))
  const chests = chestNodes(b, worldId, s, completed)
  const height = vertexY(Math.max(0, lessons.length - 1)) + PATH.top + 24
  const title = t(world.title_key)

  return (
    <AppShell hideHeaderOnNarrow>
      <div className="path-header">
        <div className="narrow">
          <div className="path-head-row">
            <Link className="icon-btn" to={routes.worlds()} aria-label={t('path.back_to_map')}>
              <BackIcon />
            </Link>
            <div>
              <h1 className="t-28">{title}</h1>
              <p className="muted">{t('path.completed_count', { n: wv.completed, m: wv.total })}</p>
            </div>
          </div>
          <ProgressBar value={wv.progress} label={t('map.progress_label', { world: title })} />
        </div>
      </div>
      <main id="main" className="narrow path-main">
        <div className="chain" style={{ height }}>
          <ChainLinks links={links} chests={chests.map((c) => ({ index: c.afterIndex - 1, solid: c.status !== 'locked' }))} height={height} />
          <ol className="chain-list">
            {lessons.map((l, i) => {
              const st = states[i]
              const status =
                st === 'completed'
                  ? t('path.status_completed')
                  : st === 'current'
                    ? s.in_progress?.lesson_id === l.id
                      ? t('lesson.progress_short', { n: s.in_progress.answered, m: s.in_progress.total })
                      : t('path.status_available')
                    : i > 0
                      ? t('path.status_opens_after', { n: i })
                      : t('map.locked')
              const name = t(l.title_key)
              const style = { left: vertexX(i) - PATH.r, top: vertexY(i) - PATH.r }
              const labelStyle = { left: vertexX(i) + PATH.r + 16, top: vertexY(i) - 22 }
              return (
                <li key={l.id}>
                  {st === 'locked' ? (
                    <span className={`vertex ${st}`} style={style} role="img" aria-label={t('path.vertex_label', { n: i + 1, name, status })}>
                      <VertexMark state={st} n={i + 1} />
                    </span>
                  ) : (
                    <Link
                      className={`vertex ${st}`}
                      style={style}
                      to={routes.lesson(l.id)}
                      aria-label={t('path.vertex_label', { n: i + 1, name, status })}
                      aria-current={i === currentIndex ? 'step' : undefined}
                    >
                      <VertexMark state={st} n={i + 1} />
                    </Link>
                  )}
                  <div className={`vertex-label ${st}`} style={labelStyle} aria-hidden="true">
                    <span className="vertex-name">
                      <ChemText text={name} />
                    </span>
                    <span className="vertex-status">{status}</span>
                  </div>
                </li>
              )
            })}
          </ol>
          {chests.map((c) => {
            const i = c.afterIndex - 1
            const style = { left: vertexX(i) - PATH.chestOffset - PATH.chestSize / 2, top: vertexY(i) - PATH.chestSize / 2 }
            const label = t('path.chest_label', { value: c.reward.value, title: t(c.reward.title_key), status: t(`path.chest_${c.status}`) })
            return (
              <div key={c.id} className="chest-wrap" style={style}>
                <button type="button" className={`chest ${c.status}`} disabled={c.status !== 'ready'} onClick={() => openChest(c)} aria-label={label}>
                  <ChestIcon />
                </button>
                <span className="chest-value" aria-hidden="true">
                  {c.status === 'claimed' ? t('path.chest_claimed_short') : t('path.chest_value', { value: c.reward.value })}
                </span>
              </div>
            )
          })}
        </div>
        {currentIndex >= 0 && (
          <button type="button" className="btn btn-primary btn-block" onClick={() => navigate(routes.lesson(lessons[currentIndex].id), { state: { autostart: true } })}>
            {t('path.continue_with', { n: currentIndex + 1 })}
          </button>
        )}
      </main>
    </AppShell>
  )
}
