// Copia seed/*.json a public/content/packs/base/ (copia exacta, nunca se edita
// a mano), copia assets/images/ a public/assets/images/ y regenera la lista de
// archivos por paquete en public/content/manifest.json conservando el orden de
// "packs". Uso: npm run sync:base (corre solo antes de dev, build y test).
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const seedDir = join(root, 'seed')
const baseDir = join(root, 'public/content/packs/base')
const manifestPath = join(root, 'public/content/manifest.json')

function syncDir(from: string, to: string, filter: (f: string) => boolean) {
  mkdirSync(to, { recursive: true })
  const wanted = readdirSync(from).filter(filter).sort()
  for (const f of readdirSync(to)) if (!wanted.includes(f)) rmSync(join(to, f))
  for (const f of wanted) copyFileSync(join(from, f), join(to, f))
  return wanted
}

const baseFiles = syncDir(seedDir, baseDir, (f) => f.endsWith('.json'))
const images = existsSync(join(root, 'assets/images'))
  ? syncDir(join(root, 'assets/images'), join(root, 'public/assets/images'), (f) => !f.startsWith('.'))
  : []

const manifest = existsSync(manifestPath)
  ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as { packs: string[] })
  : { packs: ['base', 'web'] }
const files: Record<string, string[]> = {}
for (const pack of manifest.packs) {
  const dir = join(root, 'public/content/packs', pack)
  files[pack] = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : []
}
const next = JSON.stringify({ packs: manifest.packs, files }, null, 2) + '\n'
if (!existsSync(manifestPath) || readFileSync(manifestPath, 'utf8') !== next) writeFileSync(manifestPath, next)

console.log(`base: ${baseFiles.length} archivos; imágenes: ${images.length}; paquetes: ${manifest.packs.join(', ')}`)
