import { beforeAll, describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'
import { compareStructures, type RDKitLike } from './canonical'

// RDKit.js real (el mismo paquete que usa el navegador), cargado en Node.
let rd: RDKitLike
beforeAll(async () => {
  const require = createRequire(import.meta.url)
  const init = require('@rdkit/rdkit') as () => Promise<RDKitLike>
  rd = await init()
}, 60000)

describe('draw_structure: comparación canónica con RDKit.js', () => {
  it.each([
    ['CCC(C)C', 'CC(C)CC', 'mismo esqueleto escrito distinto'],
    ['C(C)C(C)C', 'CCC(C)C', 'otra numeración'],
    ['[H]C([H])([H])C(C)CC', 'CCC(C)C', 'con hidrógenos explícitos'],
    ['CC[C@@H](C)C(C)CC', 'CCC(C)C(C)CC', 'con cuña (estereocentro real) contra sin cuña'],
    ['CCC[C@H](CC)C(C)C', 'CC(C)C(CC)CCC', '3-etil-2-metilhexano con y sin estereo'],
    ['CCC[C@@H](CC)C(C)C', 'CCC[C@H](CC)C(C)C', 'enantiómeros cuentan igual'],
  ])('%s ≡ %s (%s)', (a, b) => {
    expect(compareStructures(rd, a, b)).toBe('match')
  })

  it.each([
    ['CCCCC', 'CCC(C)C', 'pentano no es 2-metilbutano'],
    ['CC(C)C(C)C', 'CCC(C)(C)C', '2,3- contra 2,2-dimetilbutano'],
    ['CCCC(C)C', 'CCC(C)CC', '2- contra 3-metilpentano'],
    ['CCO', 'COC', 'etanol contra dimetil éter'],
  ])('%s ≠ %s (%s)', (a, b) => {
    expect(compareStructures(rd, a, b)).toBe('mismatch')
  })

  it('lo que no se puede sanear es invalid (no cuenta como error)', () => {
    expect(compareStructures(rd, 'C(C)(C)(C)(C)C', 'CCC')).toBe('invalid')
    expect(compareStructures(rd, '', 'CCC')).toBe('invalid')
    expect(compareStructures(rd, 'C1CC', 'CCC')).toBe('invalid')
  })
})
