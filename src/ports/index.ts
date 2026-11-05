// Puertos: interfaces de cada capacidad externa. Pantallas y stores dependen
// solo de estos tipos; los adaptadores se registran en app/bootstrap.ts.
import type { ComponentType } from 'react'
import type { ContentBundle, ContentError } from '../core/content/bundle'
import type { Result } from '../core/result'
import type { AccessLevel } from '../models'
import type { UserState } from '../core/game/state'

export interface ContentRepository {
  /** Carga y une todos los paquetes del manifest. */
  load(): Promise<Result<ContentBundle, ContentError>>
}

export interface ProgressRepository {
  load(userId: string): Promise<UserState | null>
  save(userId: string, state: UserState): Promise<void>
  clear(userId: string): Promise<void>
}

export interface AuthUser {
  id: string
  isAnonymous: boolean
}

export interface AuthService {
  currentUser(): Promise<AuthUser>
  /** Vincula el usuario anónimo a una cuenta (futuro). */
  linkAccount?(): Promise<AuthUser>
}

export interface EntitlementsService {
  accessOf(scopeId: string): AccessLevel
  /** Única pregunta que la UI hace sobre acceso. */
  hasAccess(scopeId: string): boolean
}

export type AdPlacement = 'result' | 'world_map'

export interface AdsService {
  readonly enabled: boolean
  /** Devuelve el componente del anuncio para una ubicación permitida, o null. */
  slot(placement: AdPlacement): ComponentType | null
}

export interface AnalyticsService {
  track(event: string, props?: Record<string, string | number | boolean | null>): void
}

export interface StructureEditorProps {
  /** Se llama con el SMILES de lo dibujado (cadena vacía si no hay nada). */
  onChange(smiles: string): void
  disabled?: boolean
  ariaLabel: string
}

export interface StructureEditor {
  readonly id: string
  /** Carga perezosa del componente del editor. */
  load(): Promise<ComponentType<StructureEditorProps>>
}

export interface MoleculeEntry {
  id: string
  formula: string
  heavy_atoms: number
  svg: string
  svg_thumb: string
  svg_highlight: string | null
  highlight_note: string | null
  sdf: string | null
}

export interface MoleculeRenderer {
  /** Entrada del índice de moléculas para un SMILES literal del contenido. */
  entry(smiles: string): Promise<MoleculeEntry | null>
  /** Texto SVG saneado de la variante pedida, o null si falta. */
  svg(smiles: string, variant: 'full' | 'thumb' | 'highlight'): Promise<string | null>
}

export interface MoleculeViewer3DProps {
  smiles: string
  ariaLabel: string
}

export interface MoleculeViewer3D {
  readonly id: string
  isAvailable(smiles: string): Promise<boolean>
  load(): Promise<ComponentType<MoleculeViewer3DProps>>
}

/** Verificador químico de draw_structure (RDKit.js en el navegador). */
export interface StructureMatcher {
  compare(drawn: string, target: string): Promise<'match' | 'mismatch' | 'invalid'>
}
