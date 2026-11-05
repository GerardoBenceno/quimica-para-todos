import { useMemo, useRef, type KeyboardEvent } from 'react'
import { presentationOrder, LETTERS } from '../core/game/shuffle'
import { answerType } from '../core/game/validate'
import { useT } from '../services/i18nHooks'
import { ChemText } from '../ui/ChemText'
import { CheckIcon, CrossIcon } from '../ui/icons'
import type { ExerciseViewProps } from './types'

/**
 * Opciones como filas a), b), c), d) con role="radio". El orden se baraja por
 * intento (salvo true_false) y la letra se asigna después de barajar. La
 * validación es por value, nunca por posición.
 */
export function OptionsView({ exercise, attemptId, answer, onAnswer, checked, promptId }: ExerciseViewProps) {
  const t = useT()
  const type = answerType(exercise)
  const options = useMemo(
    () => presentationOrder(type, exercise.payload.options ?? [], attemptId, exercise.id),
    [type, exercise, attemptId],
  )
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const selected = answer?.value ?? null
  const correct = exercise.correct.value

  const move = (e: KeyboardEvent, i: number) => {
    if (checked) return
    const k = e.key
    let j = -1
    if (k === 'ArrowDown' || k === 'ArrowRight') j = (i + 1) % options.length
    if (k === 'ArrowUp' || k === 'ArrowLeft') j = (i - 1 + options.length) % options.length
    if (j >= 0) {
      e.preventDefault()
      onAnswer({ value: options[j].value })
      refs.current[j]?.focus()
    }
  }

  const focusIndex = Math.max(0, options.findIndex((o) => o.value === selected))
  return (
    <div role="radiogroup" aria-labelledby={promptId} className={`options ${options.length > 2 ? '' : 'options-two'}`}>
      {options.map((o, i) => {
        const isSel = o.value === selected
        let state = isSel ? 'selected' : ''
        if (checked) state = o.value === correct ? 'correct' : isSel ? 'wrong' : 'idle'
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={isSel}
            aria-disabled={checked || undefined}
            tabIndex={i === focusIndex ? 0 : -1}
            className={`option ${state}`}
            onClick={() => !checked && onAnswer({ value: o.value })}
            onKeyDown={(e) => move(e, i)}
          >
            <span className="option-letter">{t('exercise.option_letter', { l: LETTERS[i] })}</span>
            <span className="option-label">
              <ChemText text={t(o.key)} />
            </span>
            {checked && o.value === correct && <CheckIcon className="option-mark" />}
            {checked && isSel && o.value !== correct && <CrossIcon className="option-mark" />}
            {checked && o.value === correct && <span className="visually-hidden">{t('exercise.sr_correct_option')}</span>}
          </button>
        )
      })}
    </div>
  )
}
