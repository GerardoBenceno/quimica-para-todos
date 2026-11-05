import { useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useBundle } from '../stores/contentStore'
import { useUserState } from '../stores/progressStore'
import { useProgressView, useStreak } from '../stores/selectors'
import { lessonsOfWorld, worldOfLesson } from '../core/game/structure'
import { nextLesson } from '../core/game/unlock'
import { useT } from '../services/i18nHooks'
import { routes } from '../app/routes'
import { ChemText } from '../ui/ChemText'
import { StreakDots } from '../ui/StreakDots'
import { Carbo } from '../ui/Carbo'
import { AdSlot } from '../ui/AdSlot'
import { ChainLinks, MINI, PATH, VertexMark, miniX, miniY, type ChainLink, type VertexState } from '../ui/PathChain'
import { NotFoundScreen } from './NotFoundScreen'

function formatDuration(sec: number, t: (k: string, p?: Record<string, string | number>) => string) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? t('result.time_min_sec', { m, s }) : t('result.time_sec', { s })
}

/** Aciertos, experiencia y tiempo en una lista simple, la racha y la siguiente lección. */
export function ResultScreen() {
  const { attemptId = '' } = useParams()
  const t = useT()
  const b = useBundle()
  const s = useUserState()
  const view = useProgressView()
  const streak = useStreak()
  const navigate = useNavigate()
  const headRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headRef.current?.focus(), [])

  const attempt = s.lesson_attempts.find((a) => a.id === attemptId)
  const lesson = attempt ? b.lessons.find((l) => l.id === attempt.lesson_id) : null
  const world = lesson ? worldOfLesson(b, lesson.id) : null
  if (!attempt || !lesson || !world) return <NotFoundScreen />

  const answered = s.exercise_attempts.filter((e) => e.lesson_attempt_id === attempt.id)
  const correct = answered.filter((e) => e.is_correct).length
  const wrongIds = new Set(answered.filter((e) => !e.is_correct).map((e) => e.exercise_id))
  const lessons = lessonsOfWorld(b, world.id)
  const idx = lessons.findIndex((l) => l.id === lesson.id)
  const nextId = nextLesson(b, view, world.id) ?? nextLesson(b, view)
  const next = nextId ? b.lessons.find((l) => l.id === nextId) : null
  const nextIdx = next ? lessons.findIndex((l) => l.id === next.id) : -1
  const firstSession = s.lesson_attempts.filter((a) => a.completed).length === 1

  // Fragmento de la ruta: hasta 3 vértices antes del siguiente.
  const from = Math.max(0, (nextIdx >= 0 ? nextIdx : idx) - 3)
  const to = nextIdx >= 0 ? nextIdx : idx
  const shown = lessons.slice(from, to + 1)
  const states: VertexState[] = shown.map((l) => (view.lessons[l.id]?.status === 'completed' ? 'completed' : l.id === next?.id ? 'current' : 'locked'))
  const links: ChainLink[] = shown.slice(1).map((_, i) => ({ from: i, to: i + 1, style: shown[i + 1].id === next?.id ? 'drawn' : states[i + 1] === 'completed' ? 'solid' : 'dashed' }))
  const height = MINI.top * 2 + MINI.dy
  const mx = miniX
  const my = (i: number) => miniY(i, shown.length)

  return (
    <div className="shell">
      <div className="result-top panel-warm">
        <div className="narrow result-head">
          <Carbo expression="happy" size={96} className="result-carbo" />
          <div>
            <h1 className="t-28" tabIndex={-1} ref={headRef}>
              {t('result.title')}
            </h1>
            <p className="muted">
              <ChemText text={t(lesson.title_key)} />
            </p>
          </div>
        </div>
        <div className="narrow">
          <div className="chain chain-mini" style={{ height }} aria-hidden="true">
            <ChainLinks links={links} chests={[]} height={height} x={mx} y={my} />
            {shown.map((l, i) => (
              <span key={l.id} className={`vertex ${states[i]}`} style={{ left: mx(i) - PATH.r, top: my(i) - PATH.r }}>
                <VertexMark state={states[i]} n={from + i + 1} />
              </span>
            ))}
          </div>
          {next && nextIdx >= 0 && (
            <p className="muted t-15">
              <ChemText text={t('result.next_available', { n: nextIdx + 1, name: t(next.title_key) })} />
            </p>
          )}
        </div>
      </div>
      <main id="main" className="narrow page result">
        <ul className="data-list panel">
          <li>
            <span>{t('result.correct')}</span>
            <strong className="num">{t('result.correct_value', { n: correct, m: answered.length })}</strong>
          </li>
          <li>
            <span>{t('result.xp')}</span>
            <strong className="num">{t('result.xp_value', { n: attempt.xp_earned })}</strong>
          </li>
          {attempt.coins_earned > 0 && (
            <li>
              <span>{t('result.coins')}</span>
              <strong className="num">{t('result.coins_value', { n: attempt.coins_earned })}</strong>
            </li>
          )}
          <li>
            <span>{t('result.time')}</span>
            <strong className="num">{formatDuration(attempt.duration_seconds ?? 0, t)}</strong>
          </li>
        </ul>
        {streak > 0 && (
          <p className="streak-line">
            <StreakDots count={streak} />
            <span>
              {t('result.streak_prefix')} <strong>{t('result.streak_days', { n: streak })}</strong>.
            </span>
          </p>
        )}
        {wrongIds.size > 0 && (
          <p className="muted">
            {t('result.to_review', { n: wrongIds.size })}{' '}
            <Link className="link inline" to={routes.practice()}>
              {t('result.review_now', { n: wrongIds.size })}
            </Link>
          </p>
        )}
        <AdSlot placement="result" />
        <div className="result-actions">
          {firstSession ? (
            // Primera sesión: una victoria antes que un menú; ahora sí, el mapa.
            <button type="button" className="btn btn-primary btn-block" onClick={() => navigate(routes.worlds(), { replace: true })}>
              {t('result.see_map')}
            </button>
          ) : (
            <>
              {next && (
                <button type="button" className="btn btn-primary btn-block" onClick={() => navigate(routes.lesson(next.id), { replace: true, state: { autostart: true } })}>
                  {t(nextIdx >= 0 ? 'result.continue_with' : 'result.continue_next_world', { n: nextIdx + 1 })}
                </button>
              )}
              <button type="button" className="btn btn-secondary btn-block" onClick={() => navigate(routes.world(world.id), { replace: true })}>
                {t('result.back_to_path')}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
