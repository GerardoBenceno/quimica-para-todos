import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { uuid } from '../core/ids'
import { scoreDiagnostic, type DiagnosticOutcome } from '../core/game/diagnostic'
import { firstOpenWorld, nextLesson } from '../core/game/unlock'
import type { Answer } from '../core/game/validate'
import { ExercisePlayer } from '../engine/ExercisePlayer'
import { useBundle, useContentStore } from '../stores/contentStore'
import { useProgressView } from '../stores/selectors'
import { saveDiagnostic } from '../stores/actions'
import { useT } from '../services/i18nHooks'
import { trackEvent } from '../app/analyticsEvents'
import { routes } from '../app/routes'
import { ChemText } from '../ui/ChemText'
import { Carbo } from '../ui/Carbo'
import { topicTitleKey } from './topics'

/** Diagnóstico saltable, resultado amable y directo a la primera lección. */
export function DiagnosticScreen() {
  const t = useT()
  const i18n = useContentStore((x) => x.i18n)
  const b = useBundle()
  const view = useProgressView()
  const navigate = useNavigate()
  const items = useMemo(() => b.diagnosticItems.filter((i) => i.is_active), [b])
  // Puntos de cada pregunta y total, leídos del weight de los ítems activos.
  const weightOf = useMemo(() => new Map(items.map((i) => [i.id, i.weight])), [items])
  const totalPoints = useMemo(() => items.reduce((sum, i) => sum + i.weight, 0), [items])
  const attemptId = useMemo(() => uuid(), [])
  const answers = useRef<Record<string, Answer>>({})
  const [outcome, setOutcome] = useState<DiagnosticOutcome | null>(null)

  useEffect(() => trackEvent('diagnostic_start', {}), [])

  const isOpen = (w: string) => {
    const s = view.worlds[w]?.status
    return !!s && s !== 'locked' && s !== 'coming_soon'
  }
  const firstLessonOf = (worldId: string | null) => (worldId ? nextLesson(b, view, worldId) : null) ?? nextLesson(b, view)

  // Sin ítems activos: saltar fuera del render (el efecto va antes de cualquier return).
  useEffect(() => {
    if (items.length === 0) skip()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length])

  const skip = () => {
    saveDiagnostic(items, answers.current, null)
    const lesson = firstLessonOf(firstOpenWorld(b, view))
    navigate(lesson ? routes.lesson(lesson) : routes.worlds(), { replace: true })
  }

  const finish = () => {
    if (!b.diagnosticScoring) return skip()
    const o = scoreDiagnostic(items, answers.current, b.diagnosticScoring, isOpen, firstOpenWorld(b, view))
    saveDiagnostic(items, answers.current, o)
    setOutcome(o)
  }

  if (outcome) {
    const world = b.worlds.find((w) => w.id === outcome.recommended_world_id)
    const lesson = firstLessonOf(outcome.recommended_world_id)
    // El nivel viene del seed como texto; si hay clave de UI para él, se usa.
    const levelKey = `diagnostic.level.${outcome.level_label.toLowerCase()}`
    const levelText = i18n?.has(levelKey) ? t(levelKey) : outcome.level_label
    return (
      <main id="main" className="narrow page diag-result">
        <Carbo expression="think" size={72} />
        <p className="muted">{t('diagnostic.result_kicker')}</p>
        <h1 className="t-28">{t('diagnostic.start_point', { world: world ? t(world.title_key) : '' })}</h1>
        <ul className="data-list panel">
          <li>
            <span>{t('diagnostic.level')}</span>
            <strong>{levelText}</strong>
          </li>
          <li>
            <span className="score-label">
              {t('diagnostic.score')}
              <span className="muted t-14">{t('diagnostic.total_points', { n: items.length, max: totalPoints })}</span>
            </span>
            <strong className="num">{t('diagnostic.score_value', { score: outcome.score, max: outcome.max })}</strong>
          </li>
        </ul>
        {outcome.weak_topics.length > 0 && (
          <section>
            <h2 className="t-18">{t('diagnostic.weak_title')}</h2>
            <ul className="plain-list">
              {outcome.weak_topics.map((tp) => (
                <li key={tp}>
                  <ChemText text={t(topicTitleKey(b, tp))} />
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="t-body muted">{t('diagnostic.friendly')}</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate(lesson ? routes.lesson(lesson) : routes.worlds(), { replace: true })}>
          {t('diagnostic.first_lesson')}
        </button>
      </main>
    )
  }

  if (items.length === 0) return null

  return (
    <ExercisePlayer
      exercises={items}
      attemptId={attemptId}
      mode="diagnostic"
      onRecord={(ex, answer) => {
        answers.current[ex.id] = answer
      }}
      onFinish={finish}
      onClose={skip}
      counterNote={(ex) => {
        const w = weightOf.get(ex.id)
        return w === undefined ? null : t('diagnostic.item_points', { n: w })
      }}
      footer={
        <div className="diag-footer">
          <div className="diag-note">
            <Carbo expression="think" size={40} />
            <p className="muted t-14">{t('diagnostic.only_start')}</p>
          </div>
          <button type="button" className="link" onClick={skip}>
            {t('diagnostic.skip')}
          </button>
        </div>
      }
    />
  )
}
