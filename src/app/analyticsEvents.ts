// Único archivo de eventos de analítica (guía técnica, sección R.2). Anónimos,
// sin PII ni identificadores publicitarios. Se envían a AnalyticsService (no-op hoy).
import { servicesOrNull } from './services'

export interface AnalyticsEvents {
  app_open: Record<string, never>
  diagnostic_start: Record<string, never>
  diagnostic_finish: { score: number; ratio: number; skipped: boolean }
  lesson_start: { lesson_id: string }
  lesson_finish: { lesson_id: string; duration: number; accuracy: number }
  exercise_attempt: { exercise_id: string; is_correct: boolean; topic: string; time_ms: number }
  world_complete: { world_id: string }
  reward_claim: { reward_id: string; value: number }
  coin_spend: { item: string; amount: number }
}

export function trackEvent<K extends keyof AnalyticsEvents>(name: K, props: AnalyticsEvents[K]) {
  servicesOrNull()?.analytics.track(name, props as Record<string, string | number | boolean>)
}
