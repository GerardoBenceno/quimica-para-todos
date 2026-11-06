import { Link } from 'react-router-dom'
import { useBundle } from '../stores/contentStore'
import { useUserState } from '../stores/progressStore'
import { lessonsOfWorld, worldOfLesson } from '../core/game/structure'
import { useT } from '../services/i18nHooks'
import { routes } from '../app/routes'
import { ChemText } from '../ui/ChemText'
import { AssetImage } from '../ui/AssetImage'
import { MoleculeView } from '../ui/MoleculeView'
import { feedbackSmiles } from '../engine/answerText'

/**
 * Introducción de una lección: contexto, título, texto corto y figura. La
 * figura es la imagen de la intro si la hay; si no, la primera estructura de
 * la lección, sin resaltar y sin nombre, para no revelar respuestas.
 */
/** Átomos explícitos de un SMILES (aproximado); una figura de un solo átomo no ilustra nada. */
const atomCount = (smiles: string) => (smiles.match(/Cl|Br|[BCNOPSFI]|\[[^\]]+\]|[bcnops]/g) ?? []).length

export function LessonIntro({
  lessonId,
  headingLevel,
  onStart,
  hidePathLink = false,
  startHere = false,
}: {
  lessonId: string
  headingLevel: 1 | 2
  onStart(): void
  hidePathLink?: boolean
  /** Etiqueta fija "Empieza aquí" (sin animación) mientras no hay lecciones empezadas. */
  startHere?: boolean
}) {
  const t = useT()
  const b = useBundle()
  const s = useUserState()
  const lesson = b.lessons.find((l) => l.id === lessonId)
  const world = worldOfLesson(b, lessonId)
  if (!lesson || !world) return null
  const lessons = lessonsOfWorld(b, world.id)
  const n = lessons.findIndex((l) => l.id === lessonId) + 1
  const H = headingLevel === 1 ? 'h1' : 'h2'
  const image = lesson.intro?.image_asset_id ?? null
  const sample = image ? null : (b.exercises.filter((e) => e.is_active && e.lesson_id === lessonId).map(feedbackSmiles).find((x) => !!x && atomCount(x) >= 2) ?? null)
  const ip = s.in_progress?.lesson_id === lessonId ? s.in_progress : null

  return (
    <section className="lesson-intro" aria-labelledby={`intro-${lessonId}`}>
      <p className="muted t-15">{t('lesson.context', { world: t(world.title_key), n, m: lessons.length })}</p>
      {startHere && <p className="tag start-tag">{t('start_here.label')}</p>}
      <H className="t-36" id={`intro-${lessonId}`}>
        <ChemText text={t(lesson.title_key)} />
      </H>
      {lesson.intro?.text_key && (
        <p className="t-body">
          <ChemText text={t(lesson.intro.text_key)} />
        </p>
      )}
      {(image || sample) && (
        <figure className={`figure figure-intro ${image ? 'figure-plain' : ''}`}>
          {image ? <AssetImage assetId={image} className="figure-img" size={240} /> : <MoleculeView smiles={sample!} label={t('figure.example_structure')} />}
        </figure>
      )}
      <div className="intro-actions">
        <button type="button" className="btn btn-primary" onClick={onStart}>
          {t(ip && ip.answered > 0 ? 'lesson.continue' : 'lesson.start')}
        </button>
        {ip && ip.answered > 0 && <span className="muted t-15">{t('lesson.progress_so_far', { n: ip.answered, m: ip.total })}</span>}
        {!hidePathLink && (
          <Link className="link" to={routes.world(world.id)}>
            {t('lesson.see_path')}
          </Link>
        )}
      </div>
    </section>
  )
}
