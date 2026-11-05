import { useBundle } from '../stores/contentStore'
import { AssetImage } from './AssetImage'

/** La mascota, por id de personaje y expresión. Solo en estados vacíos y mensajes. */
export function Carbo({ characterId, expression = 'idle', size = 56 }: { characterId?: string; expression?: string; size?: number }) {
  const b = useBundle()
  const c = b.characters.find((x) => x.is_active && (characterId ? x.id === characterId : x.role === 'mascot'))
  if (!c) return null
  return <AssetImage className="carbo" assetId={c.expressions[expression] ?? c.sprite_asset_id} size={size} />
}
