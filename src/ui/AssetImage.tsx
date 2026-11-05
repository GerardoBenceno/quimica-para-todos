import { useEffect, useState } from 'react'
import { useContentStore } from '../stores/contentStore'
import { useT } from '../services/i18nHooks'

/** Versión de 256 px que genera scripts/optimize-art.ts junto a cada ilustración. */
const SMALL_SUFFIX = '@256'
const smallUrl = (url: string) => url.replace(/\.png$/i, `${SMALL_SUFFIX}.png`)

/**
 * Imagen por id de asset. Si falta el registro o el archivo, placeholder.
 * Las ilustraciones del autor se sirven a 512 px con una variante de 256 px
 * en srcset; si la variante no existe, se reintenta solo con la grande.
 */
export function AssetImage({ assetId, className, size, priority = false }: { assetId: string | null | undefined; className?: string; size?: number; priority?: boolean }) {
  const assets = useContentStore((s) => s.assets)
  const t = useT()
  const [state, setState] = useState<'srcset' | 'plain' | 'failed'>('srcset')
  const asset = assets?.get(assetId) ?? null
  const url = assets?.url(assetId) ?? null
  const alt = asset?.alt_key ? t(asset.alt_key) : ''
  useEffect(() => setState('srcset'), [url])
  const style = size ? { width: size, height: size } : undefined
  if (!url || state === 'failed') return <span className={`asset-missing ${className ?? ''}`} style={style} role={alt ? 'img' : undefined} aria-label={alt || undefined} />
  const withSet = state === 'srcset' && /\.png$/i.test(url)
  return (
    <img
      className={className}
      src={url}
      srcSet={withSet ? `${smallUrl(url)} 256w, ${url} 512w` : undefined}
      sizes={withSet && size ? `${size}px` : undefined}
      alt={alt}
      style={style}
      width={size}
      height={size}
      onError={() => setState(state === 'srcset' ? 'plain' : 'failed')}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
    />
  )
}
