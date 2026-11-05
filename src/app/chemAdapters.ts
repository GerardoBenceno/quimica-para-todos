// Registro de los motores químicos (editor 2D, verificador y visor 3D).
// Cada adaptador carga su motor con import() dinámico al primer uso.
// Cambiar de editor = escribir otro adaptador de StructureEditor y devolverlo aquí.
import type { MoleculeViewer3D, StructureEditor, StructureMatcher } from '../ports'
import type { FeatureFlags } from './flags'
import { KetcherStructureEditor } from '../adapters/ketcher'
import { RdkitMatcher } from '../adapters/rdkit/RdkitMatcher'
import { ThreeDmolViewer } from '../adapters/threedmol'

export function selectEditor(base: string): StructureEditor | null {
  return new KetcherStructureEditor(base)
}

export function selectMatcher(base: string): StructureMatcher | null {
  return new RdkitMatcher(base)
}

/** El visor 3D solo existe con el flag molecules3d encendido. */
export function selectViewer3D(flags: FeatureFlags, base: string): MoleculeViewer3D | null {
  return flags.molecules3d ? new ThreeDmolViewer(base) : null
}
