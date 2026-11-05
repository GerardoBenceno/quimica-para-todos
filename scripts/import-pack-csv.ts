// Convierte las plantillas CSV de plantillas/<id>/ en public/content/packs/<id>/,
// agrega el paquete al manifest, regenera las moléculas si hay Python con RDKit
// y valida esquemas e integridad. Errores en español por archivo, fila y columna.
// Uso: npx tsx scripts/import-pack-csv.ts [id ...]   (sin argumentos: todas las carpetas menos "ejemplo")
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { formatErrors, importPack, templateDirs } from './pack-csv'
import { PUBLIC, ROOT } from './packs'

const templatesRoot = join(ROOT, 'plantillas')
const ids = process.argv.slice(2).length ? process.argv.slice(2) : templateDirs(templatesRoot)
if (ids.length === 0) {
  console.log('import-pack-csv: no hay carpetas en plantillas/ (aparte de "ejemplo"); nada que importar')
  process.exit(0)
}
let failed = false
const manifestPath = join(PUBLIC, 'content/manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { packs: string[]; files: Record<string, string[]> }
for (const id of ids) {
  if (!/^[a-z][a-z0-9]*$/.test(id)) {
    console.error(`${id}: el id del paquete debe ser minúsculas y dígitos, sin guiones (los ids de su contenido llevan el prefijo "${id}_")`)
    failed = true
    continue
  }
  const r = importPack(join(templatesRoot, id), join(PUBLIC, 'content/packs', id))
  if (r.errors.length) {
    console.error(`plantillas/${id}: ${r.errors.length} errores\n${formatErrors(r.errors)}`)
    failed = true
    continue
  }
  if (!manifest.packs.includes(id)) manifest.packs.push(id)
  console.log(`plantillas/${id} -> public/content/packs/${id}/: ${r.files.join(', ')}`)
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
if (failed) process.exit(1)
const run = (cmd: string, args: string[]) => spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit' })
run('npx', ['tsx', 'scripts/sync-base.ts'])
if (existsSync(join(ROOT, 'scripts/gen_molecules.py'))) {
  const py = spawnSync('python3', ['-c', 'import rdkit'], { cwd: ROOT })
  if (py.status === 0) run('python3', ['scripts/gen_molecules.py'])
  else console.warn('import-pack-csv: sin RDKit en Python; corre "pip install -r requirements.txt && python3 scripts/gen_molecules.py" para las estructuras nuevas')
}
const v = run('npx', ['tsx', 'scripts/validate-content.ts'])
process.exit(v.status ?? 1)
