import { featuresSchema } from '../core/schemas'
import type { AppConfig } from '../models'

export type FeatureFlags = {
  auth: boolean
  cloudSync: boolean
  payments: boolean
  ads: boolean
  analytics: boolean
  molecules3d: boolean
  aiFeedback: boolean
  social: boolean
  /** Mundo de estereoquímica jugable (también con ?borrador=1 en la URL). */
  mundoEstereo: boolean
}

export const ALL_OFF: FeatureFlags = {
  auth: false,
  cloudSync: false,
  payments: false,
  ads: false,
  analytics: false,
  molecules3d: false,
  aiFeedback: false,
  social: false,
  mundoEstereo: false,
}

/** Nombres del seed (app_config features.flags) -> nombres de features.json. */
const SEED_FLAG_NAMES: Record<string, keyof FeatureFlags> = {
  cloud_sync: 'cloudSync',
  ai_feedback: 'aiFeedback',
  molecules_3d: 'molecules3d',
  social: 'social',
}

/**
 * Una sola fuente de verdad en ejecución: los flags del seed son valores por
 * defecto y public/config/features.json manda sobre ellos.
 */
export function resolveFlags(appConfig: AppConfig[], featuresJson: unknown): FeatureFlags {
  const flags: FeatureFlags = { ...ALL_OFF }
  const seed = appConfig.find((c) => c.key === 'features.flags')?.value
  if (seed && typeof seed === 'object') {
    for (const [k, v] of Object.entries(seed as Record<string, unknown>)) {
      const name = SEED_FLAG_NAMES[k]
      if (name && typeof v === 'boolean') flags[name] = v
    }
  }
  const parsed = featuresSchema.partial().safeParse(featuresJson)
  if (parsed.success) Object.assign(flags, parsed.data)
  if (flags.mundoEstereo === undefined) flags.mundoEstereo = false
  return flags
}

/** ?borrador=1 (antes o después del hash) enciende los mundos en borrador solo en esta carga. */
export function draftRequested(href: string): boolean {
  try {
    const u = new URL(href)
    const hashQuery = u.hash.includes('?') ? u.hash.slice(u.hash.indexOf('?') + 1) : ''
    return u.searchParams.get('borrador') === '1' || new URLSearchParams(hashQuery).get('borrador') === '1'
  } catch {
    return false
  }
}
