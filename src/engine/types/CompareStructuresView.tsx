import { useT } from '../../services/i18nHooks'
import { MoleculeView } from '../../ui/MoleculeView'
import { OptionsView } from './OptionsView'
import type { ExerciseViewProps, ExerciseTypeRegistrations } from '../typeDefs'

/**
 * compare_structures: dos estructuras lado a lado (una debajo de otra en
 * pantallas angostas), rotuladas A y B, y las opciones de siempre debajo.
 * La vista dibuja sus figuras (ownsFigure), así que el reproductor no repite
 * la del enunciado. Responde como 'options': barajado por value y atajos de
 * teclado los resuelve el reproductor.
 */
export function CompareStructuresView(props: ExerciseViewProps) {
  const t = useT()
  const { payload } = props.exercise
  const smilesA = typeof payload.structure_smiles === 'string' ? payload.structure_smiles : ''
  const smilesB = typeof payload.structure_smiles_b === 'string' ? payload.structure_smiles_b : ''
  const figures: [string, string, string][] = [
    [smilesA, 'compare.a', 'figure.structure_a'],
    [smilesB, 'compare.b', 'figure.structure_b'],
  ]
  return (
    <>
      <div className="compare-figures">
        {figures.map(([smiles, captionKey, labelKey]) => (
          <figure key={captionKey} className="figure compare-figure">
            {smiles && <MoleculeView smiles={smiles} label={t(labelKey)} />}
            <figcaption>{t(captionKey)}</figcaption>
          </figure>
        ))}
      </div>
      <OptionsView {...props} />
    </>
  )
}

export const exerciseTypes: ExerciseTypeRegistrations = { compare_structures: { View: CompareStructuresView, ownsFigure: true } }
