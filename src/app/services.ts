import type {
  AdsService,
  AnalyticsService,
  AuthService,
  ContentRepository,
  EntitlementsService,
  MoleculeRenderer,
  MoleculeViewer3D,
  ProgressRepository,
  StructureEditor,
  StructureMatcher,
} from '../ports'
import type { FeatureFlags } from './flags'

/** Contenedor de adaptadores registrado en el bootstrap. */
export interface Services {
  flags: FeatureFlags
  content: ContentRepository
  progress: ProgressRepository
  auth: AuthService
  entitlements: EntitlementsService
  ads: AdsService
  analytics: AnalyticsService
  molecules: MoleculeRenderer
  viewer3d: MoleculeViewer3D | null
  editor: StructureEditor | null
  matcher: StructureMatcher | null
}

let current: Services | null = null

export function registerServices(s: Services) {
  current = s
}

export function services(): Services {
  if (!current) throw new Error('Servicios sin registrar: falta correr bootstrap()')
  return current
}

export function servicesOrNull(): Services | null {
  return current
}
