import type { EntitlementsService } from '../../ports'
import type { AccessLevel } from '../../models'

/**
 * Hoy todo es gratis: hasAccess siempre es true. accessOf devuelve lo que
 * declaran los access.json de los paquetes ('free' por defecto), para que la
 * UI pueda mostrar LockBadge cuando existan pagos.
 */
export class FreeEntitlementsService implements EntitlementsService {
  constructor(private readonly access: Record<string, AccessLevel> = {}) {}

  accessOf(scopeId: string): AccessLevel {
    return this.access[scopeId] ?? 'free'
  }

  hasAccess(_scopeId: string): boolean {
    return true
  }
}
