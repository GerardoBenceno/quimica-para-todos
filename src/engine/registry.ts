import type { ExerciseType } from '../models'
import type { ExerciseTypeDef, ExerciseTypeRegistrations } from './typeDefs'

/**
 * Registro tipo -> componente, armado con los archivos de src/engine/types/.
 * Cada archivo exporta `exerciseTypes` con sus registros. Agregar un tipo de
 * ejercicio = crear su archivo ahí y agregar el nombre a core/exerciseTypes.ts.
 */
const modules = import.meta.glob<{ exerciseTypes?: ExerciseTypeRegistrations }>('./types/*.tsx', { eager: true })

const registry: ExerciseTypeRegistrations = {}
for (const m of Object.values(modules)) Object.assign(registry, m.exerciseTypes ?? {})

export function exerciseTypeDef(type: ExerciseType): ExerciseTypeDef | null {
  return registry[type] ?? null
}
