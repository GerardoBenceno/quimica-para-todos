import { useMemo, useRef, type KeyboardEvent } from 'react'
import { presentationOrder, LETTERS } from '../../core/game/shuffle'
import { useT } from '../../services/i18nHooks'
import { MoleculeView } from '../../ui/MoleculeView'
import { CheckIcon, CrossIcon } from '../../ui/icons'
import type { ExerciseViewProps, ExerciseTypeRegistrations } from '../typeDefs'

/** Variante para pantallas angostas: se muestra el nombre y se elige la estructura. */
export function ChooseStructureView({ exercise, attemptId, answer, onAnswer, checked, promptId }: ExerciseViewProps) {
  const t = useT()
  const options = useMemo(() => presentationOrder('choose_structure', exercise.payload.options ?? [], attemptId, exercise.id), [exercise, attemptId])
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const selected = answer?.value ?? null
  const correct = exercise.correct.value
  const focusIndex = Math.max(0, options.findIndex((o) => o.value === selected))

  const move = (e: KeyboardEvent, i: number) => {
    if (checked) return
    const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const j = (i + d + options.length) % options.length
    onAnswer({ value: options[j].value })
    refs.current[j]?.focus()
  }

  return (
    <div role="radiogroup" aria-labelledby={promptId} className="structure-options">
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
            aria-label={t('choose.option_label', { l: LETTERS[i] })}
            tabIndex={i === focusIndex ? 0 : -1}
            className={`option structure-option ${state}`}
            onClick={() => !checked && onAnswer({ value: o.value })}
            onKeyDown={(e) => move(e, i)}
          >
            <span className="option-letter">{t('exercise.option_letter', { l: LETTERS[i] })}</span>
            {o.smiles && <MoleculeView smiles={o.smiles} label="" />}
            {checked && o.value === correct && <CheckIcon className="option-mark" />}
            {checked && isSel && o.value !== correct && <CrossIcon className="option-mark" />}
          </button>
        )
      })}
    </div>
  )
}

export const exerciseTypes: ExerciseTypeRegistrations = { choose_structure: { View: ChooseStructureView } }
