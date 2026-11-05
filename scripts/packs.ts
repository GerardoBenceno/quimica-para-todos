// Carga los paquetes desde public/ con fs (para scripts y tests).
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { mergePacks, type RawPack } from '../src/core/content/bundle'
import { manifestSchema } from '../src/core/schemas'

export const ROOT = resolve(import.meta.dirname, '..')
export const PUBLIC = join(ROOT, 'public')

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function loadRawPacks(): RawPack[] {
  const manifest = manifestSchema.parse(readJson(join(PUBLIC, 'content/manifest.json')))
  return manifest.packs.map((id) => {
    const raw: RawPack = { id, files: {} }
    for (const f of manifest.files[id] ?? []) raw.files[f] = readJson(join(PUBLIC, 'content/packs', id, f))
    return raw
  })
}

export function loadBundleFromDisk() {
  const merged = mergePacks(loadRawPacks())
  if (!merged.ok) throw new Error(merged.error.message)
  return merged.value
}

export function loadMolIndex(): Record<string, unknown> | null {
  const p = join(PUBLIC, 'mol/index.json')
  return existsSync(p) ? (readJson(p) as Record<string, unknown>) : null
}
