/**
 * Catálogo único de tipos de ejercicio. Agregar un tipo = agregarlo aquí
 * (con su forma de respuesta) y crear su vista en src/engine/types/.
 *  - options: elegir un value de payload.options (correct.value)
 *  - blanks: un value del banco por hueco (correct.<hueco>)
 *  - structure: dibujar; correct.smiles
 *  - delegate: responde como payload.base_type (view_3d)
 */
export const EXERCISE_TYPES = {
  multiple_choice: 'options',
  true_false: 'options',
  identify_group: 'options',
  chat_complete: 'options',
  diagnostic: 'options',
  choose_structure: 'options',
  compare_structures: 'options',
  fill_blanks: 'blanks',
  draw_structure: 'structure',
  view_3d: 'delegate',
} as const

export type ExerciseTypeName = keyof typeof EXERCISE_TYPES
export type AnswerShape = (typeof EXERCISE_TYPES)[ExerciseTypeName]
export const EXERCISE_TYPE_NAMES = Object.keys(EXERCISE_TYPES) as [ExerciseTypeName, ...ExerciseTypeName[]]

export function answerShape(type: string): AnswerShape | null {
  return (EXERCISE_TYPES as Record<string, AnswerShape>)[type] ?? null
}
