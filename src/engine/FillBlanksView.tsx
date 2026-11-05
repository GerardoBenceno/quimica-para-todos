import { Fragment, useMemo } from 'react'
import { presentationOrder } from '../core/game/shuffle'
import { useT } from '../services/i18nHooks'
import { ChemText } from '../ui/ChemText'
import type { ExerciseViewProps } from './types'

/**
 * Plantilla con huecos {b1}, {b2}. Tocar una pieza del banco llena el primer
 * hueco vacío; tocar un hueco lleno lo vacía. El banco se baraja por intento.
 */
export function FillBlanksView({ exercise, attemptId, answer, onAnswer, checked, promptId }: ExerciseViewProps) {
  const t = useT()
  const blanks = exercise.payload.blanks ?? []
  const bank = useMemo(() => presentationOrder('fill_blanks', exercise.payload.bank ?? [], attemptId, exercise.id), [exercise, attemptId])
  const filled: Record<string, string> = answer ?? {}
  const labelOf = (value: string) => {
    const opt = (exercise.payload.bank ?? []).find((o) => o.value === value)
    return opt ? t(opt.key) : value
  }
  const parts = (exercise.payload.template ?? '').split(/(\{[^}]+\})/)

  const put = (value: string) => {
    if (checked) return
    const empty = blanks.find((b) => !filled[b])
    if (!empty) return
    onAnswer({ ...filled, [empty]: value })
  }
  const clear = (b: string) => {
    if (checked) return
    const next = { ...filled }
    delete next[b]
    onAnswer(Object.keys(next).length ? next : null)
  }

  return (
    <div className="fill">
      <p className="fill-template" aria-labelledby={promptId}>
        {parts.map((p, i) => {
          const m = /^\{([^}]+)\}$/.exec(p)
          if (!m) return <Fragment key={i}>{p}</Fragment>
          const b = m[1]
          const v = filled[b]
          let state = v ? 'filled' : 'empty'
          if (checked) state = v === exercise.correct[b] ? 'correct' : 'wrong'
          const idx = blanks.indexOf(b) + 1
          return (
            <button
              key={i}
              type="button"
              className={`blank ${state}`}
              onClick={() => clear(b)}
              disabled={checked || !v}
              aria-label={v ? t('exercise.blank_filled', { n: idx, value: labelOf(v) }) : t('exercise.blank_empty', { n: idx })}
            >
              {v ? <ChemText text={labelOf(v)} /> : ' '}
            </button>
          )
        })}
      </p>
      <div className="bank" role="group" aria-label={t('exercise.bank')}>
        {bank.map((o) => {
          const used = Object.values(filled).includes(o.value)
          return (
            <button key={o.value} type="button" className="chip" disabled={checked || used} onClick={() => put(o.value)}>
              <ChemText text={t(o.key)} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
