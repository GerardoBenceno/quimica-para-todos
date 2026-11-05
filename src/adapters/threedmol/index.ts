import type { MoleculeViewer3D } from '../../ports'
import { servicesOrNull } from '../../app/services'

/** Visor 3D con 3Dmol.js y los SDF pregenerados por scripts/gen_molecules.py. */
export class ThreeDmolViewer implements MoleculeViewer3D {
  readonly id = '3dmol'
  constructor(readonly baseUrl: string) {}

  async isAvailable(smiles: string) {
    const e = await servicesOrNull()?.molecules.entry(smiles)
    return !!e?.sdf
  }

  async load() {
    const m = await import('./Viewer3D')
    return m.makeViewer3D(this.baseUrl)
  }
}
