import { useEffect, useMemo, useState } from 'react'
import { servicesOrNull } from '../app/services'
import type { DiagnosticItem, Exercise } from '../models'
import { useBundle } from '../stores/contentStore'
import { checkIntegrity } from '../core/content/integrity'
import { lessonsOfWorld, worldOfLesson } from '../core/game/structure'
import { answerType } from '../core/game/validate'
import { answerShape } from '../core/exerciseTypes'
import { correctAnswerText, feedbackSmiles, promptSmiles } from '../engine/answerText'
import { useT } from '../services/i18nHooks'
import { AppShell } from '../ui/AppShell'
import { ChemText } from '../ui/ChemText'
import { MoleculeView } from '../ui/MoleculeView'
import { AssetImage } from '../ui/AssetImage'

type Row = { ex: Exercise; pack: string; worldId: string | null; lessonId: string | null; diagnostic: boolean }

/** Fórmula molecular calculada con RDKit.js (vía StructureMatcher), con caché por SMILES. */
function useFormula(smiles: string | null): string | null | undefined {
  const [value, setValue] = useState<string | null | undefined>(smiles ? undefined : null)
  useEffect(() => {
    if (!smiles) return
    const matcher = servicesOrNull()?.matcher
    if (!matcher?.formula) {
      setValue(null)
      return
    }
    let alive = true
    matcher
      .formula(smiles)
      .then((f) => alive && setValue(f))
      .catch(() => alive && setValue(null))
    return () => {
      alive = false
    }
  }, [smiles])
  return value
}

function ExerciseCard({ row, issues }: { row: Row; issues: string[] }) {
  const t = useT()
  const b = useBundle()
  const { ex } = row
  const type = answerType(ex)
  const shape = answerShape(type)
  const figure = promptSmiles(ex)
  const feedback = feedbackSmiles(ex)
  const smiles = feedback ?? figure
  const formula = useFormula(smiles)
  const template = b.feedbackTemplates.find((f) => f.id === ex.feedback_template_id)
  const lesson = row.lessonId ? b.lessons.find((l) => l.id === row.lessonId) : null
  const assetId = ex.payload.structure_asset_id ?? ex.structure_asset_id
  const correct = correctAnswerText(ex, t)
  const source = ex.payload.source_exercise_id as string | undefined

  return (
    <article className="panel review-card" aria-labelledby={`rv-${ex.id}`}>
      <header className="review-card-head">
        <h3 id={`rv-${ex.id}`} className="t-18">
          <code>{ex.id}</code>
        </h3>
        <span className="review-meta">
          {ex.type}
          {' · '}
          {row.pack}
          {lesson ? ` · ${t(lesson.title_key)}` : row.diagnostic ? ` · ${t('review.diagnostic')}` : ''}
          {row.diagnostic && ` · ${t('review.weight', { n: (ex as DiagnosticItem).weight })}`}
          {!ex.is_active && ` · ${t('review.inactive')}`}
          {source && ` · ${t('review.source', { id: source })}`}
        </span>
      </header>

      <div className="review-grid">
        <div className="review-text">
          <dl className="review-dl">
            <dt>{t('review.prompt')}</dt>
            <dd>
              <ChemText text={t(ex.prompt_key)} />
            </dd>
            {shape === 'options' && (
              <>
                <dt>{t('review.options')}</dt>
                <dd>
                  <ul className="review-options">
                    {(ex.payload.options ?? []).map((o) => {
                      const ok = o.value === ex.correct.value
                      return (
                        <li key={o.value} className={ok ? 'review-ok' : ''}>
                          <span className="review-mark" aria-hidden="true">
                            {ok ? '✓' : '·'}
                          </span>
                          <ChemText text={t(o.key)} />
                          {ok && <span className="visually-hidden"> ({t('review.correct')})</span>}
                          {typeof o.smiles === 'string' && o.smiles && <code className="review-smiles"> {o.smiles}</code>}
                        </li>
                      )
                    })}
                  </ul>
                </dd>
              </>
            )}
            {shape === 'blanks' && (
              <>
                <dt>{t('review.template')}</dt>
                <dd>
                  <ChemText text={ex.payload.template ?? ''} />
                </dd>
                <dt>{t('review.bank')}</dt>
                <dd>{(ex.payload.bank ?? []).map((o) => t(o.key)).join(', ')}</dd>
              </>
            )}
            <dt>{t('review.correct')}</dt>
            <dd>
              <strong>
                <ChemText text={correct || (ex.correct.smiles ?? '')} />
              </strong>
            </dd>
            {ex.explanation_key && (
              <>
                <dt>{t('review.explanation')}</dt>
                <dd>
                  <ChemText text={t(ex.explanation_key)} />
                </dd>
              </>
            )}
            {template && (
              <>
                <dt>{t('review.feedback')}</dt>
                <dd>
                  <ChemText text={t(template.message_key)} />
                </dd>
                {template.hint_key && (
                  <>
                    <dt>{t('review.hint')}</dt>
                    <dd>
                      <ChemText text={t(template.hint_key)} />
                    </dd>
                  </>
                )}
              </>
            )}
            {smiles && (
              <>
                <dt>{t('review.smiles')}</dt>
                <dd>
                  <code>{smiles}</code>
                  {figure && figure !== smiles && (
                    <>
                      {' '}
                      <span className="muted">({t('review.prompt').toLowerCase()}: </span>
                      <code>{figure}</code>
                      <span className="muted">)</span>
                    </>
                  )}
                </dd>
                <dt>{t('review.formula')}</dt>
                <dd>{formula === undefined ? <span className="muted">{t('review.formula_loading')}</span> : formula === null ? <span className="muted">{t('review.formula_unavailable')}</span> : <ChemText text={formula} />}</dd>
              </>
            )}
            <dt>{t('review.issues')}</dt>
            <dd>
              {issues.length === 0 ? (
                <span className="muted">{t('review.no_issues')}</span>
              ) : (
                <ul className="plain-list review-issues">
                  {issues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              )}
            </dd>
          </dl>
        </div>
        {(smiles || assetId) && (
          <figure className="figure review-figure">
            {smiles ? <MoleculeView smiles={smiles} variant="highlight" label={t('review.structure')} /> : <AssetImage assetId={assetId} size={160} />}
            {ex.type === 'draw_structure' && <figcaption>{t('review.target')}</figcaption>}
          </figure>
        )}
      </div>
    </article>
  )
}

/**
 * Vista de revisión para el autor (ruta oculta #/revision): cada ejercicio de
 * cada paquete con enunciado, opciones, respuesta marcada, explicación,
 * retroalimentación, estructura, fórmula calculada con RDKit.js y avisos de
 * integridad, con filtros y una versión limpia para imprimir.
 */
export function ReviewScreen() {
  const t = useT()
  const b = useBundle()
  const [world, setWorld] = useState('')
  const [lesson, setLesson] = useState('')
  const [type, setType] = useState('')
  const [pack, setPack] = useState('')

  useEffect(() => {
    servicesOrNull()?.matcher && (servicesOrNull()?.matcher as { warmUp?(): void } | null)?.warmUp?.()
  }, [])

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    for (const w of b.worlds) {
      for (const l of lessonsOfWorld(b, w.id)) {
        for (const ex of b.exercises.filter((e) => e.lesson_id === l.id)) out.push({ ex, pack: b.origin[ex.id] ?? '', worldId: w.id, lessonId: l.id, diagnostic: false })
      }
    }
    const placed = new Set(out.map((r) => r.ex.id))
    for (const ex of b.exercises) {
      if (placed.has(ex.id)) continue
      const w = ex.lesson_id ? worldOfLesson(b, ex.lesson_id) : null
      out.push({ ex, pack: b.origin[ex.id] ?? '', worldId: w?.id ?? null, lessonId: ex.lesson_id ?? null, diagnostic: false })
    }
    for (const item of b.diagnosticItems) out.push({ ex: item, pack: b.origin[item.id] ?? '', worldId: item.maps_to_world, lessonId: null, diagnostic: true })
    return out
  }, [b])

  // Avisos de integridad agrupados por id de ejercicio (los que mencionan el id).
  const issuesById = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const issue of checkIntegrity(b)) {
      for (const r of rows) {
        if (issue.message.includes(r.ex.id)) map.set(r.ex.id, [...(map.get(r.ex.id) ?? []), `${issue.level === 'error' ? '⚠ ' : ''}${issue.message}`])
      }
    }
    return map
  }, [b, rows])

  const types = useMemo(() => [...new Set(rows.map((r) => r.ex.type))].sort(), [rows])
  const lessons = world ? lessonsOfWorld(b, world) : b.lessons
  const filtered = rows.filter((r) => (!world || r.worldId === world) && (!lesson || r.lessonId === lesson) && (!type || r.ex.type === type) && (!pack || r.pack === pack))

  return (
    <AppShell>
      <main id="main" className="container page review-page">
        <h1 className="t-28">{t('review.title')}</h1>
        <p className="t-body muted review-lead">{t('review.lead')}</p>
        <form className="review-filters no-print" onSubmit={(e) => e.preventDefault()}>
          <label>
            <span>{t('review.filter_world')}</span>
            <select
              value={world}
              onChange={(e) => {
                setWorld(e.target.value)
                setLesson('')
              }}
            >
              <option value="">{t('review.all')}</option>
              {b.worlds.map((w) => (
                <option key={w.id} value={w.id}>
                  {t(w.title_key)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('review.filter_lesson')}</span>
            <select value={lesson} onChange={(e) => setLesson(e.target.value)}>
              <option value="">{t('review.all')}</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {t(l.title_key)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('review.filter_type')}</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">{t('review.all')}</option>
              {types.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('review.filter_pack')}</span>
            <select value={pack} onChange={(e) => setPack(e.target.value)}>
              <option value="">{t('review.all')}</option>
              {b.packs.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
            {t('review.print')}
          </button>
        </form>
        <p className="muted t-15" role="status">
          {t('review.count', { n: filtered.length })}
        </p>
        <div className="review-list">
          {filtered.map((r) => (
            <ExerciseCard key={r.ex.id} row={r} issues={issuesById.get(r.ex.id) ?? []} />
          ))}
        </div>
      </main>
    </AppShell>
  )
}
