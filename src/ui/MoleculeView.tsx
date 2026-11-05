import { useEffect, useState } from 'react'
import { servicesOrNull } from '../app/services'
import { useT } from '../services/i18nHooks'

type Variant = 'full' | 'thumb' | 'highlight'

/**
 * Qué resalta un SMILES con números de mapa de átomos ("[C:1]"): uno marca
 * un átomo; dos (o más), un enlace. Sin mapas, nada.
 */
export function highlightKind(smiles: string): 'atom' | 'bond' | null {
  const maps = smiles.match(/:\d+\]/g)?.length ?? 0
  if (maps === 0) return null
  return maps === 1 ? 'atom' : 'bond'
}

/**
 * Incrusta en el DOM el SVG pregenerado de un SMILES (nunca con <img>, para
 * que currentColor y --mol-highlight sigan al tema). Si pide 'highlight' y no
 * existe, cae a 'full'. Si no hay SVG, muestra un placeholder. Si el SMILES
 * trae un átomo o enlace resaltado, el texto alternativo lo dice.
 */
export function MoleculeView({ smiles, variant = 'full', label, className }: { smiles: string; variant?: Variant; label: string; className?: string }) {
  const t = useT()
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

  const kind = highlightKind(smiles)
  const suffix = kind ? t(kind === 'atom' ? 'figure.highlighted_atom' : 'figure.highlighted_bond') : ''
  const alt = [label, suffix].filter(Boolean).join('. ')

  if (svg === undefined) return <span className={`mol mol-loading ${className ?? ''}`} aria-busy="true" />
  if (svg === null) return <span className={`mol mol-missing ${className ?? ''}`} role="img" aria-label={alt} />
  return <span className={`mol ${className ?? ''}`} role="img" aria-label={alt} dangerouslySetInnerHTML={{ __html: svg }} />
}
