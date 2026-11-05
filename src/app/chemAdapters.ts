// Registro de los motores químicos (editor 2D, verificador y visor 3D).
// Cada adaptador carga su motor con import() dinámico al primer uso.
// Cambiar de editor = escribir otro adaptador de StructureEditor y devolverlo aquí.
import type { MoleculeViewer3D, StructureEditor, StructureMatcher } from '../ports'
import type { FeatureFlags } from './flags'
import { KetcherStructureEditor } from '../adapters/ketcher'
import { RdkitMatcher } from '../adapters/rdkit/RdkitMatcher'

export function selectEditor(base: string): StructureEditor | null {
  return new KetcherStructureEditor(base)
}

export function selectMatcher(base: string): StructureMatcher | null {
  return new RdkitMatcher(base)
}

export function selectViewer3D(_flags: FeatureFlags, _base: string): MoleculeViewer3D | null {
  return null
}
