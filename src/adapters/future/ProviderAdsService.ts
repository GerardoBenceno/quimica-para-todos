import type { AdsService } from '../../ports'
import { NotImplementedError } from '../../core/result'

/**
 * Proveedor de anuncios futuro. La audiencia es 13+, así que cualquier
 * proveedor debe operar en modo no personalizado. Solo se carga si ads=true.
 */
export class ProviderAdsService implements AdsService {
  readonly enabled = true
  slot(): never {
    throw new NotImplementedError('ProviderAdsService.slot')
  }
}
