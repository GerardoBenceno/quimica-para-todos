import type { ExerciseType } from '../models'
import type { ExerciseTypeDef } from './types'
import { OptionsView } from './OptionsView'
import { FillBlanksView } from './FillBlanksView'
import { ChatCompleteView } from './ChatCompleteView'
import { DrawStructureView, checkDrawStructure } from './DrawStructureView'
import { ChooseStructureView } from './ChooseStructureView'

/**
 * Registro tipo -> componente. Agregar un tipo de ejercicio = escribir su
 * vista y registrarla aquí (más su esquema de payload en core/schemas.ts).
 */
const registry: Partial<Record<ExerciseType, ExerciseTypeDef>> = {
  multiple_choice: { View: OptionsView },
  true_false: { View: OptionsView },
  identify_group: { View: OptionsView },
  diagnostic: { View: OptionsView },
  fill_blanks: { View: FillBlanksView },
  chat_complete: { View: ChatCompleteView, ownsFigure: false },
  draw_structure: { View: DrawStructureView, check: checkDrawStructure },
  choose_structure: { View: ChooseStructureView },
}

export function registerExerciseType(type: ExerciseType, def: ExerciseTypeDef) {
  registry[type] = def
}

export function exerciseTypeDef(type: ExerciseType): ExerciseTypeDef | null {
  return registry[type] ?? null
}

/** Tipos cuyo enunciado se muestra dentro de la vista (no como título). */
export const PROMPT_IN_VIEW = new Set<ExerciseType>(['chat_complete'])
