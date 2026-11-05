import type { Asset } from '../models'

/**
 * Resuelve assets por id (seed/assets.json). Las rutas relativas se resuelven
 * contra la base de la app. Un id inexistente o inactivo devuelve null y la UI
 * muestra un placeholder.
 */
export class AssetService {
  private byId = new Map<string, Asset>()
  constructor(
    assets: Asset[],
    private readonly baseUrl: string,
  ) {
    for (const a of assets) if (a.is_active) this.byId.set(a.id, a)
  }

  get(id: string | null | undefined): Asset | null {
    return id ? (this.byId.get(id) ?? null) : null
  }

  url(id: string | null | undefined): string | null {
    const a = this.get(id)
    if (!a) return null
    if (/^(https?:)?\/\//.test(a.uri) || a.uri.startsWith('data:')) return a.uri
    return `${this.baseUrl}${a.uri.replace(/^\.?\//, '')}`
  }
}
