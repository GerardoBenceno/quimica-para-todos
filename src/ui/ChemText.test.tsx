import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { ChemText, splitChem } from './ChemText'

describe('ChemText', () => {
  it('convierte subíndices y superíndices Unicode en sub y sup', () => {
    const { container } = render(
      <p>
        <ChemText text="CH₄ y sp³; CH₃-CH₂-CH₃" />
      </p>,
    )
    const subs = [...container.querySelectorAll('sub')].map((x) => x.textContent)
    const sups = [...container.querySelectorAll('sup')].map((x) => x.textContent)
    expect(subs).toEqual(['4', '3', '2', '3'])
    expect(sups).toEqual(['3'])
    expect(container.textContent).toBe('CH4 y sp3; CH3-CH2-CH3')
  })

  it('agrupa dígitos consecutivos y deja intacto el texto normal', () => {
    expect(splitChem('C₁₀H₂₂')).toEqual([
      { kind: 'text', text: 'C' },
      { kind: 'sub', text: '10' },
      { kind: 'text', text: 'H' },
      { kind: 'sub', text: '22' },
    ])
    expect(splitChem('Metano')).toEqual([{ kind: 'text', text: 'Metano' }])
  })
})
