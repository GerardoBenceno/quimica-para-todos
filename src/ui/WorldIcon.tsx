import { useBundle, useContentStore } from '../stores/contentStore'
import { AssetImage } from './AssetImage'
import { WorldThumb } from './WorldThumb'

/**
 * Ilustración del mundo (icon_asset_id de worlds.json) sobre fondo plano. Si
 * el mundo no tiene asset registrado, cae a la miniatura molecular.
 */
export function WorldIcon({ worldId, label, size = 56, className }: { worldId: string; label: string; size?: number; className?: string }) {
  const b = useBundle()
  const assets = useContentStore((s) => s.assets)
  const world = b.worlds.find((w) => w.id === worldId)
  const assetId = world?.icon_asset_id ?? null
  if (!assetId || !assets?.get(assetId)) return <WorldThumb worldId={worldId} label={label} />
  return (
    <span className={`world-icon ${className ?? ''}`} style={{ width: size, height: size }}>
      <AssetImage assetId={assetId} size={size} />
    </span>
  )
}
