import { useEffect, useRef, useState } from 'react'
import type { Exercise } from '../models'
import { hasAnswer, validateAnswer, type Answer, type Verdict } from '../core/game/validate'
import { spendCoins } from '../core/game/rewards'
import { useBundle } from '../stores/contentStore'
import { useProgressStore, useUserState } from '../stores/progressStore'
import { useGameValues } from '../stores/selectors'
import { useT } from '../services/i18nHooks'
import { trackEvent } from '../app/analyticsEvents'
import { ChemText } from '../ui/ChemText'
import { MoleculeView } from '../ui/MoleculeView'
import { AssetImage } from '../ui/AssetImage'
import { ProgressBar } from '../ui/ProgressBar'
import { CrossIcon } from '../ui/icons'
import { FeedbackSheet } from './FeedbackSheet'
import { PROMPT_IN_VIEW, exerciseTypeDef } from './registry'
import { promptSmiles } from './answerText'

export type PlayerMode = 'lesson' | 'practice' | 'diagnostic'

export interface ExercisePlayerProps {
  exercises: Exercise[]
  attemptId: string
  startIndex?: number
  mode: PlayerMode
  /** Se llama una vez por ejercicio comprobado (no con 'invalid'). */
  onRecord(ex: Exercise, answer: Answer, verdict: Verdict, timeMs: number): void
  onFinish(): void
  onClose(): void
  /** Texto del encabezado del diagnóstico (con enlace para saltar). */
  footer?: React.ReactNode
}

/**
 * Barra de progreso superior, un ejercicio por pantalla y botón Comprobar
 * deshabilitado hasta que haya respuesta. En lección y práctica muestra la
 * hoja de retroalimentación; en el diagnóstico avanza sin revelar.
 */
export function ExercisePlayer({ exercises, attemptId, startIndex = 0, mode, onRecord, onFinish, onClose, footer }: ExercisePlayerProps) {
  const t = useT()
  const b = useBundle()
  const g = useGameValues()
  const state = useUserState()
  const update = useProgressStore((s) => s.update)

  const [index, setIndex] = useState(Math.min(startIndex, Math.max(0, exercises.length - 1)))
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState(false)
  const started = useRef(performance.now())
  const promptRef = useRef<HTMLHeadingElement>(null)

  const ex = exercises[index]
  useEffect(() => {
    started.current = performance.now()
    setAnswer(null)
    setVerdict(null)
    setHint(false)
    promptRef.current?.focus()
  }, [index])

  if (!ex) return null
  const def = exerciseTypeDef(ex.type)
  const promptId = `prompt-${ex.id}`
  const checked = verdict === 'correct' || verdict === 'incorrect'
  const template = b.feedbackTemplates.find((f) => f.id === ex.feedback_template_id && f.is_active)
  const smiles = promptSmiles(ex)
  const assetId = ex.payload.structure_asset_id ?? ex.structure_asset_id
  const promptInView = PROMPT_IN_VIEW.has(ex.type)
  const progress = (index + (checked ? 1 : 0)) / exercises.length

  const check = async () => {
    if (!answer || busy) return
    setBusy(true)
    try {
      const v = def?.check ? await def.check(ex, answer) : validateAnswer(ex, answer)
      const timeMs = performance.now() - started.current
      if (v !== 'invalid') onRecord(ex, answer, v, timeMs)
      if (mode === 'diagnostic' && v !== 'invalid') next()
      else setVerdict(v)
    } finally {
      setBusy(false)
    }
  }

  const changeAnswer = (a: Answer | null) => {
    setAnswer(a)
    if (verdict === 'invalid') setVerdict(null)
  }

  const next = () => {
    if (index + 1 >= exercises.length) onFinish()
    else setIndex(index + 1)
  }

  const useHint = () => {
    if (!template?.hint_key || hint) return
    if (g.hintCost > 0) {
      let paid = false
      update((s) => {
        const r = spendCoins(s, g.hintCost)
        paid = !!r
        return r ?? s
      })
      if (!paid) return
      trackEvent('coin_spend', { item: 'hint', amount: g.hintCost })
    }
    setHint(true)
  }

  const canHint = mode !== 'diagnostic' && !!template?.hint_key && !checked
  const affordable = state.user.coins >= g.hintCost

  return (
    <div className="player">
      <div className="player-top">
        <div className="narrow player-top-inner">
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t(mode === 'diagnostic' ? 'diagnostic.close' : 'exercise.close')}>
            <CrossIcon size={22} />
          </button>
          <ProgressBar value={progress} label={t('exercise.progress', { n: index + 1, m: exercises.length })} />
        </div>
      </div>

      <main id="main" className="narrow player-main">
        <p className="muted t-15">{t('exercise.counter', { n: index + 1, m: exercises.length })}</p>
        <h1 className="t-22 prompt" id={promptInView ? undefined : promptId} tabIndex={-1} ref={promptRef}>
          {promptInView ? t('exercise.chat_title') : <ChemText text={t(ex.prompt_key)} />}
        </h1>

        {!def?.ownsFigure && (smiles || assetId) && (
          <figure className="figure">
            {smiles ? (
              <MoleculeView smiles={smiles} label={t('figure.structure_prompt')} />
            ) : (
              <AssetImage assetId={assetId} className="figure-img" />
            )}
          </figure>
        )}

        {def ? (
          <def.View exercise={ex} attemptId={attemptId} answer={answer} onAnswer={changeAnswer} checked={checked} verdict={verdict} promptId={promptId} />
        ) : (
          <p role="alert">{t('exercise.unsupported_type', { type: ex.type })}</p>
        )}

        {verdict === 'invalid' && (
          <p className="inline-note" role="alert">
            {t('exercise.check_valences')}
          </p>
        )}

        {canHint && (
          <div className="hint">
            {hint ? (
              <p className="hint-text" role="status">
                <ChemText text={t(template!.hint_key!)} />
              </p>
            ) : (
              <button type="button" className="link" onClick={useHint} disabled={!affordable}>
                {g.hintCost > 0 ? t('exercise.hint_cost', { n: g.hintCost }) : t('exercise.hint')}
              </button>
            )}
            {!hint && !affordable && <span className="muted t-14"> {t('exercise.hint_no_coins')}</span>}
          </div>
        )}

        {footer}
      </main>

      {!checked && (
        <div className="player-bottom">
          <div className="narrow">
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={!hasAnswer(ex, answer) || busy}
              aria-busy={busy || undefined}
              onClick={() => void check()}
            >
              {t(mode === 'diagnostic' ? 'diagnostic.next' : 'exercise.check')}
            </button>
          </div>
        </div>
      )}

      {checked && mode !== 'diagnostic' && (
        <FeedbackSheet key={ex.id} exercise={ex} verdict={verdict!} onContinue={next} practice={mode === 'practice'} />
      )}
    </div>
  )
}
