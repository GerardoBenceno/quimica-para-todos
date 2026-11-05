import { useEffect, useState } from 'react'
import { servicesOrNull } from '../app/services'

type Variant = 'full' | 'thumb' | 'highlight'

/**
 * Incrusta en el DOM el SVG pregenerado de un SMILES (nunca con <img>, para
 * que currentColor y --mol-highlight sigan al tema). Si pide 'highlight' y no
 * existe, cae a 'full'. Si no hay SVG, muestra un placeholder.
 */
export function MoleculeView({ smiles, variant = 'full', label, className }: { smiles: string; variant?: Variant; label: string; className?: string }) {
  const [svg, setSvg] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    let alive = true
    const mol = servicesOrNull()?.molecules
    if (!mol) {
      setSvg(null)
      return
    }
    void (async () => {
      let text = await mol.svg(smiles, variant)
      if (!text && variant === 'highlight') text = await mol.svg(smiles, 'full')
      if (alive) setSvg(text)
    })()
    return () => {
      alive = false
    }
  }, [smiles, variant])

  if (svg === undefined) return <span className={`mol mol-loading ${className ?? ''}`} aria-busy="true" />
  if (svg === null) return <span className={`mol mol-missing ${className ?? ''}`} role="img" aria-label={label} />
  return <span className={`mol ${className ?? ''}`} role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />
}
