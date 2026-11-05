import type {
  DiagnosticResult,
  ExerciseAttempt,
  LessonAttempt,
  Mistake,
  Streak,
  User,
  UserProgress,
  UserReward,
} from '../../models'

export const USER_STATE_VERSION = 1

/** Documento local con todo lo del usuario, guardado bajo su userId. */
export interface UserState {
  version: number
  user: User
  /** Clave `${scope_type}:${scope_id}`. */
  progress: Record<string, UserProgress>
  lesson_attempts: LessonAttempt[]
  exercise_attempts: ExerciseAttempt[]
  /** Clave exercise_id. */
  mistakes: Record<string, Mistake>
  diagnostic_results: DiagnosticResult[]
  user_rewards: UserReward[]
  streak: Streak & { freezes_available: number; freeze_week: string | null; freezes_used_week: number }
  onboarding: { welcomed: boolean; diagnostic_done: boolean; first_lesson_done: boolean }
  /** Lección en curso para "Llevas n de m ejercicios". */
  in_progress: { lesson_id: string; answered: number; total: number } | null
}

export function initialUserState(userId: string, isAnonymous: boolean, now: Date, locale: string): UserState {
  const iso = now.toISOString()
  return {
    version: USER_STATE_VERSION,
    user: {
      id: userId,
      is_anonymous: isAnonymous,
      display_name: null,
      locale,
      theme_id: null,
      coins: 0,
      xp_total: 0,
      current_streak: 0,
      longest_streak: 0,
      recommended_world_id: null,
      created_at: iso,
      updated_at: iso,
    },
    progress: {},
    lesson_attempts: [],
    exercise_attempts: [],
    mistakes: {},
    diagnostic_results: [],
    user_rewards: [],
    streak: {
      id: `streak_${userId}`,
      user_id: userId,
      last_active_date: null,
      count: 0,
      freezes_used: 0,
      updated_at: iso,
      freezes_available: 0,
      freeze_week: null,
      freezes_used_week: 0,
    },
    onboarding: { welcomed: false, diagnostic_done: false, first_lesson_done: false },
    in_progress: null,
  }
}

export const progressKey = (scope: 'world' | 'unit' | 'lesson', id: string) => `${scope}:${id}`
