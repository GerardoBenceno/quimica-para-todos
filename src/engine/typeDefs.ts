import type { ComponentType } from 'react'
import type { Exercise, ExerciseType } from '../models'
import type { Answer, Verdict } from '../core/game/validate'

export interface ExerciseViewProps {
  exercise: Exercise
  attemptId: string
  answer: Answer | null
  onAnswer(answer: Answer | null): void
  /** Ya se comprobó: la vista muestra el estado y no acepta cambios. */
  checked: boolean
  verdict: Verdict | null
  /** id del enunciado, para aria-labelledby. */
  promptId: string
}

export interface ExerciseTypeDef {
  View: ComponentType<ExerciseViewProps>
  /** Validación propia (por ejemplo, RDKit). Si falta, se usa validateAnswer. */
  check?(exercise: Exercise, answer: Answer): Promise<Verdict>
  /** La vista ya muestra la figura (no la agrega el reproductor). */
  ownsFigure?: boolean
  /** El enunciado se muestra dentro de la vista (no como título). */
  promptInView?: boolean
}

/** Lo que exporta cada archivo de src/engine/types/ como `exerciseTypes`. */
export type ExerciseTypeRegistrations = Partial<Record<ExerciseType, ExerciseTypeDef>>
