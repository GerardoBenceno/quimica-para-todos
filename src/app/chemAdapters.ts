// Registro de los motores químicos (editor 2D, verificador y visor 3D).
// Cada adaptador carga su motor con import() dinámico al primer uso.
import type { MoleculeViewer3D, StructureEditor, StructureMatcher } from '../ports'
import type { FeatureFlags } from './flags'

export function selectEditor(_base: string): StructureEditor | null {
  return null
}

export function selectMatcher(_base: string): StructureMatcher | null {
  return null
}

export function selectViewer3D(_flags: FeatureFlags, _base: string): MoleculeViewer3D | null {
  return null
}
