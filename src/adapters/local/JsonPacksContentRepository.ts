import type { ContentRepository } from '../../ports'
import { mergePacks, type ContentBundle, type ContentError, type RawPack } from '../../core/content/bundle'
import { checkIntegrity } from '../../core/content/integrity'
import { manifestSchema, formatZodError } from '../../core/schemas'
import { err, ok, type Result } from '../../core/result'

export type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

/**
 * Lee public/content/manifest.json y carga cada paquete en orden. Solo pide los
 * archivos que el manifest declara para cada paquete, así nunca hay 404.
 */
export class JsonPacksContentRepository implements ContentRepository {
  constructor(
    private readonly baseUrl: string,
    private readonly fetcher: Fetcher = (u) => fetch(u),
  ) {}

  private async getJson(path: string): Promise<Result<unknown, ContentError>> {
    try {
      const res = await this.fetcher(`${this.baseUrl}${path}`)
      if (!res.ok) return err({ kind: 'fetch', message: `${path}: HTTP ${res.status}` })
      return ok(await res.json())
    } catch (e) {
      return err({ kind: 'fetch', message: `${path}: ${(e as Error).message}` })
    }
  }

  async load(): Promise<Result<ContentBundle, ContentError>> {
    const m = await this.getJson('content/manifest.json')
    if (!m.ok) return m
    const manifest = manifestSchema.safeParse(m.value)
    if (!manifest.success) return err({ kind: 'parse', message: formatZodError('manifest.json', manifest.error) })

    const packs: RawPack[] = []
    for (const id of manifest.data.packs) {
      const files = manifest.data.files[id] ?? []
      const loaded = await Promise.all(files.map((f) => this.getJson(`content/packs/${id}/${f}`)))
      const raw: RawPack = { id, files: {} }
      for (let i = 0; i < files.length; i++) {
        const r = loaded[i]
        if (!r.ok) return r
        raw.files[files[i]] = r.value
      }
      packs.push(raw)
    }

    const merged = mergePacks(packs)
    if (!merged.ok) return merged
    const errors = checkIntegrity(merged.value).filter((i) => i.level === 'error')
    if (errors.length > 0) {
      return err({ kind: 'integrity', message: errors.map((x) => x.message).join('\n') })
    }
    return merged
  }
}
