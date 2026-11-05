import { useState } from 'react'
import { useContentStore } from '../stores/contentStore'
import { useT } from '../services/i18nHooks'

/** Imagen por id de asset. Si falta el registro o el archivo, placeholder. */
export function AssetImage({ assetId, className, size }: { assetId: string | null | undefined; className?: string; size?: number }) {
  const assets = useContentStore((s) => s.assets)
  const t = useT()
  const [failed, setFailed] = useState(false)
  const asset = assets?.get(assetId) ?? null
  const url = assets?.url(assetId) ?? null
  const alt = asset?.alt_key ? t(asset.alt_key) : ''
  const style = size ? { width: size, height: size } : undefined
  if (!url || failed) return <span className={`asset-missing ${className ?? ''}`} style={style} role={alt ? 'img' : undefined} aria-label={alt || undefined} />
  return <img className={className} src={url} alt={alt} style={style} onError={() => setFailed(true)} loading="lazy" decoding="async" />
}
