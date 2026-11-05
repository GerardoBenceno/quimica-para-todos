import { useEffect, useState, type ComponentType } from 'react'
import { servicesOrNull } from '../app/services'
import type { StructureEditorProps } from '../ports'
import type { Exercise } from '../models'
import type { Answer, Verdict } from '../core/game/validate'
import { useT } from '../services/i18nHooks'
import type { ExerciseViewProps } from './types'

/** Dibuja la molécula del nombre IUPAC en el editor 2D (cargado al primer uso). */
export function DrawStructureView({ onAnswer, checked }: ExerciseViewProps) {
  const t = useT()
  const [Editor, setEditor] = useState<ComponentType<StructureEditorProps> | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    const s = servicesOrNull()
    s?.matcher && 'warmUp' in s.matcher && (s.matcher as { warmUp(): void }).warmUp()
    if (!s?.editor) {
      setFailed(true)
      return
    }
    s.editor
      .load()
      .then((C) => alive && setEditor(() => C))
      .catch((e) => {
        console.error(e)
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [])

  if (failed) return <p role="alert">{t('draw.editor_failed')}</p>
  if (!Editor) return <div className="editor-loading" aria-busy="true">{t('draw.loading')}</div>
  return (
    <div className={`draw ${checked ? 'draw-checked' : ''}`}>
      <Editor ariaLabel={t('draw.editor_label')} onChange={(smiles) => onAnswer(smiles ? { smiles } : null)} disabled={checked} />
      <p className="muted t-14">{t('draw.help')}</p>
    </div>
  )
}

/** Califica con RDKit: SMILES canónico sin hidrógenos ni estereoquímica. */
export async function checkDrawStructure(ex: Exercise, answer: Answer): Promise<Verdict> {
  const matcher = servicesOrNull()?.matcher
  if (!matcher || !answer.smiles || !ex.correct.smiles) return 'invalid'
  try {
    const r = await matcher.compare(answer.smiles, ex.correct.smiles)
    return r === 'match' ? 'correct' : r === 'mismatch' ? 'incorrect' : 'invalid'
  } catch (e) {
    console.error(e)
    return 'invalid'
  }
}
