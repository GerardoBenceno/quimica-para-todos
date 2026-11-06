import { useEffect, useRef, useState } from 'react'
import type { Exercise } from '../models'
import { answerType, hasAnswer, validateAnswer, type Answer, type Verdict } from '../core/game/validate'
import { answerShape } from '../core/exerciseTypes'
import { presentationOrder } from '../core/game/shuffle'
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
import { Carbo } from '../ui/Carbo'
import { vibrateFor } from '../stores/prefsStore'
import { playFeedbackSound } from '../services/sound'
import { FeedbackSheet } from './FeedbackSheet'
import { exerciseTypeDef } from './registry'
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
  /** Vista previa del editor: respuesta inicial y si ya está comprobada. */
  preview?: { answer: Answer | null; checked: boolean }
  /** Texto junto a "Pregunta n de m" (en el diagnóstico, cuánto vale el ítem). */
  counterNote?: (ex: Exercise) => string | null
}

/**
 * Barra de progreso superior, un ejercicio por pantalla y botón Comprobar
 * deshabilitado hasta que haya respuesta. En lección y práctica muestra la
 * hoja de retroalimentación; en el diagnóstico avanza sin revelar.
 */
export function ExercisePlayer({ exercises, attemptId, startIndex = 0, mode, onRecord, onFinish, onClose, footer, preview, counterNote }: ExercisePlayerProps) {
  const t = useT()
  const b = useBundle()
  const g = useGameValues()
  const state = useUserState()
  const update = useProgressStore((s) => s.update)

  const [index, setIndex] = useState(Math.min(startIndex, Math.max(0, exercises.length - 1)))
  const first = exercises[Math.min(startIndex, Math.max(0, exercises.length - 1))]
  const [answer, setAnswer] = useState<Answer | null>(preview?.answer ?? null)
  const [verdict, setVerdict] = useState<Verdict | null>(preview?.checked && preview.answer && first ? validateAnswer(first, preview.answer) : null)
  const mounted = useRef(false)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState(false)
  const started = useRef(performance.now())
  const promptRef = useRef<HTMLHeadingElement>(null)

  const ex = exercises[index]
  useEffect(() => {
    started.current = performance.now()
    if (mounted.current) {
      setAnswer(null)
      setVerdict(null)
      setHint(false)
    }
    mounted.current = true
    if (!preview) promptRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  if (!ex) return null
  const def = exerciseTypeDef(ex.type)
  const promptId = `prompt-${ex.id}`
  const checked = verdict === 'correct' || verdict === 'incorrect'
  const template = b.feedbackTemplates.find((f) => f.id === ex.feedback_template_id && f.is_active)
  const smiles = promptSmiles(ex)
  const assetId = ex.payload.structure_asset_id ?? ex.structure_asset_id
  const promptInView = !!def?.promptInView
  const progress = (index + (checked ? 1 : 0)) / exercises.length

  const check = async () => {
    if (!answer || busy) return
    setBusy(true)
    try {
      const v = def?.check ? await def.check(ex, answer) : validateAnswer(ex, answer)
      const timeMs = performance.now() - started.current
      if (v !== 'invalid') {
        onRecord(ex, answer, v, timeMs)
        if (mode !== 'diagnostic') {
          vibrateFor(v)
          playFeedbackSound(v)
        }
      }
      checkedAt.current = performance.now()
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

  // Atajos de teclado: 1 a 9 eligen la opción visible (en su orden barajado),
  // Enter comprueba y, ya comprobado, continúa. No interfieren con campos de
  // texto, con el editor de estructuras ni con botones que ya responden a Enter.
  const optionsType = answerType(ex)
  const keyOptions = answerShape(optionsType) === 'options' ? presentationOrder(optionsType, ex.payload.options ?? [], attemptId, ex.id) : null
  const checkedAt = useRef(0)
  const checkRef = useRef(check)
  checkRef.current = check
  const nextRef = useRef(next)
  nextRef.current = next
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.closest('input, textarea, select, [contenteditable="true"], .ketcher-host') || el.isContentEditable)) return
      if (e.key === 'Enter') {
        if (e.repeat) return
        // Un botón enfocado que no sea una opción conserva su Enter nativo.
        if (el && el.closest('button, a') && !el.closest('[role="radio"]')) return
        if (checked) {
          if (mode === 'diagnostic') return
          // Un segundo Enter inmediato no debe saltarse la retroalimentación.
          if (performance.now() - checkedAt.current < 600) return
          e.preventDefault()
          nextRef.current()
        } else if (hasAnswer(ex, answer) && !busy) {
          e.preventDefault()
          void checkRef.current()
        }
        return
      }
      if (keyOptions && !checked && /^[1-9]$/.test(e.key)) {
        const o = keyOptions[Number(e.key) - 1]
        if (!o) return
        e.preventDefault()
        changeAnswer({ value: o.value })
        const radios = document.querySelectorAll<HTMLElement>('[role="radio"]')
        radios[Number(e.key) - 1]?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

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
        <p className="muted t-15">
          {t('exercise.counter', { n: index + 1, m: exercises.length })}
          {counterNote?.(ex) && <span className="counter-note"> · {counterNote(ex)}</span>}
        </p>
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
              <div className="hint-text" role="status">
                <Carbo expression="think" size={40} />
                <p>
                  <ChemText text={t(template!.hint_key!)} />
                </p>
              </div>
            ) : (
              <button type="button" className="link" onClick={useHint} disabled={!affordable}>
                {g.hintCost > 0 ? t('exercise.hint_cost', { n: g.hintCost }) : t('exercise.hint')}
              </button>
            )}
            {!hint && !affordable && <span className="muted t-14"> {t('exercise.hint_no_coins')}</span>}
          </div>
        )}

        {footer}
        {keyOptions && !checked && <p className="muted t-13 kbd-hint">{t('exercise.keyboard_hint', { n: keyOptions.length })}</p>}
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
