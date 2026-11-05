import { servicesOrNull } from '../app/services'
import type { AdPlacement } from '../ports'

/**
 * Espacio de anuncio. Solo en ubicaciones permitidas (resultado y mapa de
 * mundos), nunca dentro de un ejercicio ni en el diagnóstico. Devuelve null
 * mientras ads sea false.
 */
export function AdSlot({ placement }: { placement: AdPlacement }) {
  const s = servicesOrNull()
  if (!s || !s.flags.ads || !s.ads.enabled) return null
  const Slot = s.ads.slot(placement)
  return Slot ? (
    <aside className="ad-slot" data-placement={placement}>
      <Slot />
    </aside>
  ) : null
}
