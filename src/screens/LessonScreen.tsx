import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { servicesOrNull } from '../app/services'
import type { Exercise } from '../models'
import { useBundle } from '../stores/contentStore'
import { useGameValues, useNarrow, useProgressView } from '../stores/selectors'
import { beginLesson, completeLesson, recordAnswer } from '../stores/actions'
import { lessonExercises } from '../core/game/lessonPlan'
import { worldOfLesson } from '../core/game/structure'
import { ExercisePlayer } from '../engine/ExercisePlayer'
import { useT } from '../services/i18nHooks'
import { routes } from '../app/routes'
import { AppShell } from '../ui/AppShell'
import { LessonIntro } from './LessonIntro'
import { NotFoundScreen } from './NotFoundScreen'
import { drawUsableOnNarrow } from '../engine/drawPolicy'

/** Intro de la lección y luego el reproductor de ejercicios. */
export function LessonScreen() {
  const { lessonId = '' } = useParams()
  const t = useT()
  const b = useBundle()
  const g = useGameValues()
  const view = useProgressView()
  const narrow = useNarrow()
  const navigate = useNavigate()
  const [session, setSession] = useState<{ attemptId: string; startIndex: number; exercises: Exercise[] } | null>(null)

  const lesson = b.lessons.find((l) => l.id === lessonId && l.is_active)
  const world = lesson ? worldOfLesson(b, lesson.id) : null
  const flags = servicesOrNull()?.flags
  // El plan se fija al empezar la sesión para que no cambie a la mitad.
  const plan = useMemo(
    () =>
      lesson
        ? lessonExercises(b, lesson.id, {
            narrow,
            drawOnNarrow: drawUsableOnNarrow(),
            view3d: !!flags?.molecules3d && !!servicesOrNull()?.viewer3d,
          })
        : [],
    [b, lesson, narrow, flags],
  )

  if (!lesson || !world) return <NotFoundScreen />
  const status = view.lessons[lesson.id]?.status
  if (status === 'locked') {
    return (
      <AppShell>
        <main id="main" className="narrow page">
          <h1 className="t-28">{t(lesson.title_key)}</h1>
          <p>{t('lesson.locked')}</p>
          <Link className="link" to={routes.world(world.id)}>
            {t('lesson.see_path')}
          </Link>
        </main>
      </AppShell>
    )
  }

  if (!session) {
    return (
      <AppShell>
        <main id="main" className="container page lesson-page">
          <LessonIntro lessonId={lesson.id} headingLevel={1} onStart={() => setSession({ ...beginLesson(lesson.id, plan.length), exercises: plan })} />
        </main>
      </AppShell>
    )
  }

  const exercises = session.exercises
  return (
    <ExercisePlayer
      exercises={exercises}
      attemptId={session.attemptId}
      startIndex={session.startIndex}
      mode="lesson"
      onRecord={(ex, answer, verdict, timeMs) => recordAnswer({ attemptId: session.attemptId, exercise: ex, answer, verdict, timeMs, g })}
      onFinish={() => {
        completeLesson(b, lesson, session.attemptId, exercises.length, g)
        navigate(routes.result(session.attemptId), { replace: true })
      }}
      onClose={() => navigate(routes.world(world.id))}
    />
  )
}
