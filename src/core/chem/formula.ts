import type { RDKitLike, RDMolLike } from './canonical'

/** Subconjunto adicional de MinimalLib para la fórmula: hidrógenos explícitos y molblock. */
export interface RDMolWithHs extends RDMolLike {
  add_hs?(): unknown
  get_molblock?(): string
}

const SUBS = '₀₁₂₃₄₅₆₇₈₉'
const sub = (n: number) => (n === 1 ? '' : String(n).replace(/\d/g, (d) => SUBS[Number(d)]))

/** Cuenta elementos en un molblock V2000 (una línea por átomo tras la cabecera). */
export function countElements(molblock: string): Record<string, number> {
  const lines = molblock.split('\n')
  const natoms = parseInt(lines[3]?.slice(0, 3) ?? '0', 10)
  const counts: Record<string, number> = {}
  for (let i = 4; i < 4 + natoms && i < lines.length; i++) {
    const symbol = lines[i].slice(31, 34).trim()
    if (symbol) counts[symbol] = (counts[symbol] ?? 0) + 1
  }
  return counts
}

/** Fórmula en orden de Hill (C, H, resto alfabético) con subíndices Unicode. */
export function hillFormula(counts: Record<string, number>): string {
  const rest = Object.keys(counts)
    .filter((e) => e !== 'C' && e !== 'H')
    .sort()
  const order = counts.C ? ['C', ...(counts.H ? ['H'] : []), ...rest] : [...rest, ...(counts.H ? ['H'] : [])].sort()
  return order.map((e) => `${e}${sub(counts[e])}`).join('')
}

/** Fórmula molecular de un SMILES con RDKit.js, o null si no se puede leer. */
export function molecularFormula(rd: RDKitLike, smiles: string): string | null {
  let m: RDMolWithHs | null = null
  try {
    m = rd.get_mol(smiles) as RDMolWithHs | null
    if (!m || !m.is_valid() || !m.add_hs || !m.get_molblock) return null
    // En MinimalLib 2026.09 add_hs() devuelve el molblock con hidrógenos como texto.
    const added = m.add_hs()
    const counts = countElements(typeof added === 'string' ? added : m.get_molblock())
    return Object.keys(counts).length ? hillFormula(counts) : null
  } catch {
    return null
  } finally {
    m?.delete()
  }
}
