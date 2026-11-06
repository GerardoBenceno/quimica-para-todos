import { useEffect, useRef } from 'react'
import type { Exercise } from '../models'
import type { Verdict } from '../core/game/validate'
import { useBundle } from '../stores/contentStore'
import { useT } from '../services/i18nHooks'
import { ChemText } from '../ui/ChemText'
import { MoleculeView } from '../ui/MoleculeView'
import { CheckIcon, CrossIcon } from '../ui/icons'
import { Carbo } from '../ui/Carbo'
import { correctAnswerText, feedbackSmiles } from './answerText'

/**
 * Hoja inferior con veredicto, respuesta correcta, explicación del seed y la
 * estructura con lo relevante resaltado. Al fallar, el mensaje de
 * feedback_template solo aparece si el ejercicio no tiene explicación (casi
 * siempre repite la explicación con otras palabras); debajo va siempre la nota
 * de la lista de repaso. No bloquea el avance.
 */
export function FeedbackSheet({ exercise, verdict, onContinue, practice }: { exercise: Exercise; verdict: Verdict; onContinue(): void; practice?: boolean }) {
  const t = useT()
  const b = useBundle()
  const headRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headRef.current?.focus(), [])
  const ok = verdict === 'correct'
  const template = b.feedbackTemplates.find((f) => f.id === exercise.feedback_template_id && f.is_active)
  const smiles = feedbackSmiles(exercise)
  const answer = correctAnswerText(exercise, t)
  const explanation = exercise.explanation_key ? t(exercise.explanation_key) : ''
  // La explicación manda; el mensaje de la plantilla solo la sustituye cuando no hay explicación.
  const templateMessage = !explanation && template ? t(template.message_key) : ''

  return (
    <section className={`sheet ${ok ? 'sheet-ok' : 'sheet-bad'}`} aria-labelledby="sheet-title">
      <div className="sheet-inner">
        <h2 id="sheet-title" className="sheet-verdict" tabIndex={-1} ref={headRef}>
          <span className="verdict-badge">{ok ? <CheckIcon size={18} /> : <CrossIcon size={18} />}</span>
          {t(ok ? 'feedback.correct' : 'feedback.incorrect')}
        </h2>
        {!ok && answer && (
          <p className="sheet-answer">
            <ChemText text={t('feedback.answer_is', { answer })} />
          </p>
        )}
        <div className="sheet-body">
          {smiles && (
            <figure className="figure figure-small">
              <MoleculeView smiles={smiles} variant="highlight" label={t('figure.structure_of', { name: answer || smiles })} />
            </figure>
          )}
          {explanation && (
            <p className="sheet-explain">
              <ChemText text={explanation} />
            </p>
          )}
        </div>
        {!ok && (
          <div className="sheet-template">
            <Carbo expression="sad" size={40} />
            <p className="muted">
              {templateMessage && (
                <>
                  <ChemText text={templateMessage} />{' '}
                </>
              )}
              {t(practice ? 'feedback.still_in_review' : 'feedback.added_to_review')}
            </p>
          </div>
        )}
        <button type="button" className="btn btn-primary btn-block" onClick={onContinue}>
          {t('feedback.continue')}
        </button>
      </div>
    </section>
  )
}
