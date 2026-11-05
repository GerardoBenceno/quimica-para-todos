import type { StructureMatcher } from '../../ports'
import { compareStructures, type RDKitLike } from '../../core/chem/canonical'
import { molecularFormula } from '../../core/chem/formula'
import { sanitizeSvg } from '../../core/chem/svgSafety'

declare global {
  interface Window {
    initRDKitModule?: (opts: { locateFile: (file: string) => string }) => Promise<RDKitLike>
  }
}

/**
 * Verificador de draw_structure con RDKit.js, cargado perezosamente al primer
 * uso. El glue JS se sirve desde public/vendor como script clásico (su rama
 * ENVIRONMENT_IS_NODE usa módulos node: que el empaquetador no resuelve) y el
 * .wasm se localiza con la base de la app, porque en GitHub Pages bajo /<repo>/
 * la ruta por defecto da 404.
 */
export class RdkitMatcher implements StructureMatcher {
  private module: Promise<RDKitLike> | null = null

  constructor(private readonly baseUrl: string) {}

  private load(): Promise<RDKitLike> {
    if (!this.module) {
      const dir = `${this.baseUrl}vendor/rdkit/`
      this.module = new Promise<void>((resolve, reject) => {
        if (window.initRDKitModule) return resolve()
        const s = document.createElement('script')
        s.src = `${dir}RDKit_minimal.js`
        s.async = true
        s.onload = () => resolve()
        s.onerror = () => reject(new Error('No se pudo cargar RDKit.js'))
        document.head.appendChild(s)
      }).then(() => {
        if (!window.initRDKitModule) throw new Error('RDKit.js no expuso initRDKitModule')
        return window.initRDKitModule({ locateFile: (file) => `${dir}${file}` })
      })
      this.module.catch(() => {
        this.module = null
      })
    }
    return this.module
  }

  /** Precarga para que la primera comprobación no espere la descarga. */
  warmUp() {
    void this.load().catch(() => undefined)
  }

  async compare(drawn: string, target: string) {
    const rd = await this.load()
    return compareStructures(rd, drawn, target)
  }

  async formula(smiles: string) {
    const rd = await this.load()
    return molecularFormula(rd, smiles)
  }

  async svg(smiles: string) {
    const rd = await this.load()
    type MolWithSvg = { is_valid(): boolean; delete(): void; get_svg?(w: number, h: number): string }
    let m: MolWithSvg | null = null
    try {
      m = rd.get_mol(smiles) as MolWithSvg | null
      if (!m || !m.is_valid() || !m.get_svg) return null
      // Tinta con currentColor para que siga al tema, como los SVG pregenerados.
      // Sin colores literales en el código (regla del tema): negro y blanco de RDKit por patrón.
      const text = m.get_svg(300, 200).replace(/#0{6}/gi, 'currentColor').replace(/<rect[^>]*fill:#F{6}[^>]*>/i, '')
      return sanitizeSvg(text)
    } catch {
      return null
    } finally {
      m?.delete()
    }
  }
}
