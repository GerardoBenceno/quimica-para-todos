import { describe, expect, it } from 'vitest'
import { countElements, hillFormula } from './formula'

describe('fórmula molecular', () => {
  it('ordena según Hill con subíndices Unicode', () => {
    expect(hillFormula({ C: 2, H: 6, O: 1 })).toBe('C₂H₆O')
    expect(hillFormula({ C: 1, H: 4 })).toBe('CH₄')
    expect(hillFormula({ H: 2, O: 1 })).toBe('H₂O')
    expect(hillFormula({ C: 2, H: 5, N: 1, O: 1 })).toBe('C₂H₅NO')
  })
  it('cuenta átomos de un molblock V2000', () => {
    const block = ['', '  RDKit', '', '  3  2  0  0  0  0  0  0  0  0999 V2000', '    0.0000    0.0000    0.0000 C   0  0', '    0.0000    0.0000    0.0000 O   0  0', '    0.0000    0.0000    0.0000 H   0  0', 'M  END'].join('\n')
    expect(countElements(block)).toEqual({ C: 1, O: 1, H: 1 })
  })
})
