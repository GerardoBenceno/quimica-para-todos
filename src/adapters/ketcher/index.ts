import type { StructureEditor } from '../../ports'

/**
 * Editor 2D Ketcher, sin servidor (ketcher-standalone). El componente y su CSS
 * se cargan con import() dinámico solo cuando aparece un draw_structure.
 */
export class KetcherStructureEditor implements StructureEditor {
  readonly id = 'ketcher'
  constructor(readonly baseUrl: string) {}
  async load() {
    const m = await import('./KetcherEditor')
    return m.makeKetcherEditor(this.baseUrl)
  }
}
