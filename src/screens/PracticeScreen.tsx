import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { uuid } from '../core/ids'
import { useBundle } from '../stores/contentStore'
import { useUserState } from '../stores/progressStore'
import { useGameValues } from '../stores/selectors'
import { recordAnswer } from '../stores/actions'
import { ExercisePlayer } from '../engine/ExercisePlayer'
import { useT } from '../services/i18nHooks'
import { routes } from '../app/routes'
import { AppShell } from '../ui/AppShell'
import { Carbo } from '../ui/Carbo'
import type { Exercise } from '../models'

/** Práctica de errores: reofrece los ejercicios fallados, primero los de mayor count. */
export function PracticeScreen() {
  const t = useT()
  const b = useBundle()
  const s = useUserState()
  const g = useGameValues()
  const [session, setSession] = useState<{ id: string; exercises: Exercise[]; correct: number } | null>(null)
  const [done, setDone] = useState<{ correct: number; total: number } | null>(null)

  const queue = useMemo(() => {
    const byId = new Map(b.exercises.filter((e) => e.is_active).map((e) => [e.id, e]))
    return Object.values(s.mistakes)
      .filter((m) => !m.resolved && byId.has(m.exercise_id))
      .sort((a, z) => z.count - a.count || z.last_failed_at.localeCompare(a.last_failed_at))
      .map((m) => ({ mistake: m, exercise: byId.get(m.exercise_id)! }))
  }, [b, s.mistakes])

  if (session) {
    return (
      <ExercisePlayer
        exercises={session.exercises}
        attemptId={session.id}
        mode="practice"
        onRecord={(ex, answer, verdict, timeMs) => {
          if (verdict === 'correct') session.correct++
          recordAnswer({ attemptId: null, exercise: ex, answer, verdict, timeMs, g, practice: true })
        }}
        onFinish={() => {
          setDone({ correct: session.correct, total: session.exercises.length })
          setSession(null)
        }}
        onClose={() => setSession(null)}
      />
    )
  }

  return (
    <AppShell>
      <main id="main" className="narrow page">
        <h1 className="t-28">{t('practice.title')}</h1>
        {done && (
          <p role="status" className="panel status-box">
            {t('practice.done', { n: done.correct, m: done.total })}
          </p>
        )}
        {queue.length === 0 ? (
          <div className="empty">
            <Carbo expression="happy" />
            <p className="t-body">{t('practice.empty')}</p>
            <Link className="link" to={routes.worlds()}>
              {t('practice.go_learn')}
            </Link>
          </div>
        ) : (
          <>
            <p className="t-body muted">{t('practice.lead', { n: queue.length })}</p>
            <ol className="data-list panel">
              {queue.map(({ mistake, exercise }) => (
                <li key={mistake.id}>
                  <span>{t(b.lessons.find((l) => l.id === exercise.lesson_id)?.title_key ?? exercise.prompt_key)}</span>
                  <strong className="num">{t('practice.failed_times', { n: mistake.count })}</strong>
                </li>
              ))}
            </ol>
            <button type="button" className="btn btn-primary" onClick={() => setSession({ id: uuid(), exercises: queue.map((q) => q.exercise), correct: 0 })}>
              {t('practice.start')}
            </button>
          </>
        )}
      </main>
    </AppShell>
  )
}
