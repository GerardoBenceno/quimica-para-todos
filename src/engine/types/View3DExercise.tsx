import { useEffect, useState, type ComponentType } from 'react'
import { servicesOrNull } from '../../app/services'
import type { MoleculeViewer3DProps } from '../../ports'
import { useT } from '../../services/i18nHooks'
import { answerType } from '../../core/game/validate'
import { OptionsView } from './OptionsView'
import { FillBlanksView } from './FillBlanksView'
import type { ExerciseViewProps, ExerciseTypeRegistrations } from '../typeDefs'

/**
 * view_3d: no crea preguntas. Muestra el visor 3D rotable en lugar de la
 * figura y responde como su ejercicio de origen (mismas opciones y respuesta).
 */
export function View3DExercise(props: ExerciseViewProps) {
  const t = useT()
  const [Viewer, setViewer] = useState<ComponentType<MoleculeViewer3DProps> | null>(null)
  const smiles = (props.exercise.payload.structure_smiles ?? props.exercise.smiles) as string

  useEffect(() => {
    let alive = true
    servicesOrNull()
      ?.viewer3d?.load()
      .then((C) => alive && setViewer(() => C))
      .catch((e) => console.error(e))
    return () => {
      alive = false
    }
  }, [])

  const Base = answerType(props.exercise) === 'fill_blanks' ? FillBlanksView : OptionsView
  return (
    <>
      <figure className="figure figure-3d">{Viewer ? <Viewer smiles={smiles} ariaLabel={t('viewer3d.label')} /> : <div className="viewer3d-canvas loading" aria-busy="true" />}</figure>
      <Base {...props} />
    </>
  )
}

export const exerciseTypes: ExerciseTypeRegistrations = { view_3d: { View: View3DExercise, ownsFigure: true } }
