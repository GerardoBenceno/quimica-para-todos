/** Subconjunto de RDKit MinimalLib que usa la comparación. */
export interface RDKitLike {
  get_mol(input: string, details?: string): RDMolLike | null
}
export interface RDMolLike {
  is_valid(): boolean
  get_smiles(details?: string): string
  delete(): void
}

const DETAILS = JSON.stringify({ removeHs: true })

function parse(rd: RDKitLike, smiles: string): RDMolLike | null {
  let m: RDMolLike | null = null
  try {
    m = rd.get_mol(smiles, DETAILS)
  } catch {
    return null
  }
  if (!m) return null
  if (!m.is_valid()) {
    m.delete()
    return null
  }
  return m
}

/**
 * SMILES canónico sin estereoquímica y sin hidrógenos explícitos, o null si
 * no se puede sanear. MinimalLib 2026.09 acepta isomericSmiles:false pero
 * conserva los estereocentros reales, así que se hace la comparación
 * equivalente: canonizar, quitar las marcas @ y / \ del SMILES y volver a
 * canonizar (ver DECISIONES.md).
 */
export function canonicalNoStereo(rd: RDKitLike, smiles: string): string | null {
  const trimmed = smiles.trim()
  if (!trimmed) return null
  const m1 = parse(rd, trimmed)
  if (!m1) return null
  const first = m1.get_smiles()
  m1.delete()
  const flat = first.replace(/@+/g, '').replace(/[\\/]/g, '')
  const m2 = parse(rd, flat)
  if (!m2) return null
  const out = m2.get_smiles()
  m2.delete()
  return out
}

export type MatchResult = 'match' | 'mismatch' | 'invalid'

export function compareStructures(rd: RDKitLike, drawn: string, target: string): MatchResult {
  const a = canonicalNoStereo(rd, drawn)
  if (a === null) return 'invalid'
  const b = canonicalNoStereo(rd, target)
  if (b === null) return 'mismatch'
  return a === b ? 'match' : 'mismatch'
}
