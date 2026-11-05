import type { DiagnosticItem, DiagnosticScoring } from '../../models'
import type { Answer } from './validate'
import { validateAnswer } from './validate'

export interface DiagnosticOutcome {
  score: number
  max: number
  ratio: number
  level_label: string
  /** Mundo que sugiere el umbral, antes de acotar. */
  suggested_world_id: string
  recommended_world_id: string
  weak_topics: string[]
}

/**
 * score = suma de weight de los aciertos; máximo = suma de weight de los
 * ítems activos; ratio = score / máximo. El nivel sale solo de
 * diagnostic.scoring.thresholds (límites inclusivos). El mundo recomendado se
 * acota al primer mundo desbloqueado. cfg_diag_thresholds de app_config es
 * configuración heredada con otra escala y se ignora.
 */
export function scoreDiagnostic(
  items: DiagnosticItem[],
  answers: Record<string, Answer | undefined>,
  scoring: DiagnosticScoring,
  isOpen: (worldId: string) => boolean,
  firstOpenWorld: string | null,
): DiagnosticOutcome {
  const active = items.filter((i) => i.is_active)
  let score = 0
  let max = 0
  const weak = new Set<string>()
  for (const it of active) {
    max += it.weight
    const a = answers[it.id]
    if (a && validateAnswer(it, a) === 'correct') score += it.weight
    else weak.add(it.topic)
  }
  const ratio = max === 0 ? 0 : score / max
  const thresholds = [...scoring.thresholds].sort((a, b) => a.max_ratio - b.max_ratio)
  const level = thresholds.find((t) => ratio <= t.max_ratio) ?? thresholds[thresholds.length - 1]
  const suggested = level.recommended_world
  const recommended = isOpen(suggested) ? suggested : (firstOpenWorld ?? suggested)
  return {
    score,
    max,
    ratio,
    level_label: level.label,
    suggested_world_id: suggested,
    recommended_world_id: recommended,
    weak_topics: [...weak],
  }
}
