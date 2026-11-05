import type { MoleculeEntry, MoleculeRenderer } from '../../ports'
import { sanitizeSvg } from '../../core/chem/svgSafety'

/**
 * Lee public/mol/index.json (clave = SMILES literal del contenido) y descarga
 * los SVG pregenerados por scripts/gen_molecules.py. Si falta el índice o una
 * entrada, devuelve null y la UI muestra un placeholder.
 */
export class PregeneratedMoleculeRenderer implements MoleculeRenderer {
  private index: Promise<Record<string, MoleculeEntry> | null> | null = null
  private cache = new Map<string, Promise<string | null>>()

  constructor(
    private readonly baseUrl: string,
    /** Dibujo en tiempo de ejecución para SMILES sin SVG pregenerado (borradores del editor). */
    private readonly runtimeSvg: ((smiles: string) => Promise<string | null>) | null = null,
  ) {}

  private loadIndex() {
    if (!this.index) {
      this.index = fetch(`${this.baseUrl}mol/index.json`)
        .then((r) => (r.ok ? (r.json() as Promise<Record<string, MoleculeEntry>>) : null))
        .catch(() => null)
    }
    return this.index
  }

  async entry(smiles: string): Promise<MoleculeEntry | null> {
    const idx = await this.loadIndex()
    return idx?.[smiles] ?? null
  }

  async svg(smiles: string, variant: 'full' | 'thumb' | 'highlight'): Promise<string | null> {
    const e = await this.entry(smiles)
    if (!e) return this.runtimeSvg ? this.runtimeSvg(smiles) : null
    const path = variant === 'thumb' ? e.svg_thumb : variant === 'highlight' ? e.svg_highlight : e.svg
    if (!path) return null
    let p = this.cache.get(path)
    if (!p) {
      p = fetch(`${this.baseUrl}${path}`)
        .then((r) => (r.ok ? r.text() : null))
        .then((t) => (t ? sanitizeSvg(t) : null))
        .catch(() => null)
      this.cache.set(path, p)
    }
    return p
  }
}
