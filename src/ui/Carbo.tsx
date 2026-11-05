import { useBundle } from '../stores/contentStore'
import { AssetImage } from './AssetImage'

/**
 * La mascota, por id de personaje y expresión. Aparece en momentos puntuales
 * (bienvenida, celebración, pistas, diagnóstico, fallo), nunca como adorno
 * permanente.
 */
export function Carbo({ characterId, expression = 'idle', size = 56, className }: { characterId?: string; expression?: string; size?: number; className?: string }) {
  const b = useBundle()
  const c = b.characters.find((x) => x.is_active && (characterId ? x.id === characterId : x.role === 'mascot'))
  if (!c) return null
  return <AssetImage className={`carbo ${className ?? ''}`} assetId={c.expressions[expression] ?? c.sprite_asset_id} size={size} />
}
