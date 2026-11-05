// Prueba de extremo a extremo del importador CSV con moléculas (corre en CI):
// 1) arma plantillas/ciprueba/ con filas exportadas del seed (la primera lección
//    del primer mundo y sus ejercicios con SMILES ya existentes), con ids y
//    claves con el prefijo ciprueba_ para no chocar con el paquete base;
// 2) corre scripts/import-pack-csv.ts, que genera el paquete, actualiza el
//    manifest, regenera las moléculas con RDKit y valida;
// 3) comprueba que cada SMILES del paquete tiene SVG y SDF en public/mol/;
// 4) limpia todo (plantillas, paquete, manifest) para que no se publique nada.
// No escribe química nueva: solo reusa filas del seed.
// Uso: npx tsx scripts/ci-import-smoke.ts
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { exportPack, parseCsv, toCsv } from './pack-csv'
import { PUBLIC, ROOT } from './packs'

const PACK = 'ciprueba'
const tplDir = join(ROOT, 'plantillas', PACK)
const packDir = join(PUBLIC, 'content/packs', PACK)
const manifestPath = join(PUBLIC, 'content/manifest.json')
const manifestBefore = readFileSync(manifestPath, 'utf8')

// Ids y claves con prefijo, también dentro de las celdas JSON (payload, intro, unlock_rule).
const prefixIds = (s: string) => s.replace(/\b(w|u|l|e|ft|diag)_/g, `${PACK}_$1_`).replace(/(^|")(world|unit|lesson|ex|ft)\./g, `$1${PACK}.$2.`)
const transform = (table: string[][]) => [table[0], ...table.slice(1).map((r) => r.map(prefixIds))]
const col = (table: string[][], name: string) => table[0].indexOf(name)

function cleanup() {
  rmSync(tplDir, { recursive: true, force: true })
  rmSync(packDir, { recursive: true, force: true })
  writeFileSync(manifestPath, manifestBefore)
  spawnSync('npx', ['tsx', 'scripts/sync-base.ts'], { cwd: ROOT, stdio: 'inherit' })
  // Vuelve a generar reports/mol_report.json sin el paquete temporal.
  if (spawnSync('python3', ['-c', 'import rdkit'], { cwd: ROOT }).status === 0) spawnSync('python3', ['scripts/gen_molecules.py'], { cwd: ROOT, stdio: 'ignore' })
}

function fail(msg: string): never {
  console.error(`ci-import-smoke: ${msg}`)
  cleanup()
  process.exit(1)
}

try {
  const tmp = mkdtempSync(join(tmpdir(), 'seed-csv-'))
  exportPack(join(PUBLIC, 'content/packs/base'), tmp)
  const read = (f: string) => parseCsv(readFileSync(join(tmp, f), 'utf8'))
  const worlds = read('mundos.csv')
  const units = read('unidades.csv')
  const lessons = read('lecciones.csv')
  const exercises = read('ejercicios.csv')
  const feedback = read('retroalimentacion.csv')
  const translations = read('traducciones.csv')

  // Primer mundo sin regla de desbloqueo, su primera unidad y la primera lección.
  const world = worlds.slice(1).find((r) => r[col(worlds, 'unlock_rule')] === '') ?? fail('no hay mundo sin regla')
  const worldId = world[col(worlds, 'id')]
  // Primera lección del mundo cuyos ejercicios traen SMILES (y su unidad).
  const hasSmiles = (r: string[]) => !!r[col(exercises, 'smiles')] || r[col(exercises, 'payload')].includes('"structure_smiles"')
  const unitsOfWorld = units.slice(1).filter((r) => r[col(units, 'world_id')] === worldId)
  const unitIds = new Set(unitsOfWorld.map((r) => r[col(units, 'id')]))
  const lesson =
    lessons.slice(1).find((l) => unitIds.has(l[col(lessons, 'unit_id')]) && exercises.slice(1).some((e) => e[col(exercises, 'lesson_id')] === l[col(lessons, 'id')] && hasSmiles(e))) ??
    fail('sin lección con SMILES')
  const lessonId = lesson[col(lessons, 'id')]
  const unitId = lesson[col(lessons, 'unit_id')]
  const unit = unitsOfWorld.find((r) => r[col(units, 'id')] === unitId) ?? fail('sin unidad')
  const exs = exercises.slice(1).filter((r) => r[col(exercises, 'lesson_id')] === lessonId)
  const smiles = new Set<string>()
  for (const r of exs) {
    const s = r[col(exercises, 'smiles')]
    if (s) smiles.add(s)
    const m = /"structure_smiles":"([^"]+)"/.exec(r[col(exercises, 'payload')])
    if (m) smiles.add(m[1])
  }
  if (smiles.size === 0) fail('la lección elegida no tiene SMILES')
  const ftIds = new Set(exs.map((r) => r[col(exercises, 'feedback_template_id')]).filter(Boolean))
  const fts = feedback.slice(1).filter((r) => ftIds.has(r[col(feedback, 'id')]))
  // Claves de traducción que mencionan estos registros (con sus ids o prefijos de clave).
  const keep = new Set([worldId, unitId, lessonId, ...exs.map((r) => r[col(exercises, 'id')]), ...ftIds])
  const keyCol = col(translations, 'key')
  const slug = world[col(worlds, 'slug')]
  const trs = translations.slice(1).filter((r) => {
    const k = r[keyCol]
    return [...keep].some((id) => k.includes(id)) || k.startsWith(`world.${slug.split('-')[0]}`) || k.startsWith(`world.${worldId.replace(/^w_/, '')}.`) || [unitId, lessonId].some((id) => k.includes(id.replace(/^(u|l)_/, '')))
  })

  mkdirSync(tplDir, { recursive: true })
  writeFileSync(join(tplDir, 'mundos.csv'), toCsv(transform([worlds[0], world])))
  writeFileSync(join(tplDir, 'unidades.csv'), toCsv(transform([units[0], unit])))
  writeFileSync(join(tplDir, 'lecciones.csv'), toCsv(transform([lessons[0], lesson])))
  writeFileSync(join(tplDir, 'ejercicios.csv'), toCsv(transform([exercises[0], ...exs])))
  writeFileSync(join(tplDir, 'retroalimentacion.csv'), toCsv(transform([feedback[0], ...fts])))
  writeFileSync(join(tplDir, 'traducciones.csv'), toCsv(transform([translations[0], ...trs])))
  console.log(`ci-import-smoke: paquete temporal ${PACK} con ${exs.length} ejercicios, ${smiles.size} SMILES, ${trs.length} traducciones`)

  const r = spawnSync('npx', ['tsx', 'scripts/import-pack-csv.ts', PACK], { cwd: ROOT, stdio: 'inherit' })
  if (r.status !== 0) fail('la importación falló')
  if (!existsSync(join(packDir, 'exercises.json'))) fail('no se generó el paquete')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { packs: string[] }
  if (!manifest.packs.includes(PACK)) fail('el manifest no incluye el paquete')
  const index = JSON.parse(readFileSync(join(PUBLIC, 'mol/index.json'), 'utf8')) as Record<string, { id: string }>
  for (const s of smiles) {
    const entry = index[s]
    if (!entry) fail(`sin entrada en mol/index.json para ${s}`)
    for (const f of [`svg/${entry.id}.svg`, `sdf/${entry.id}.sdf`]) if (!existsSync(join(PUBLIC, 'mol', f))) fail(`falta public/mol/${f}`)
  }
  console.log('ci-import-smoke: importación, moléculas y validación correctas')
} finally {
  cleanup()
}
// Después de limpiar, el contenido debe seguir validando igual que antes.
const v = spawnSync('npx', ['tsx', 'scripts/validate-content.ts'], { cwd: ROOT, stdio: 'inherit' })
process.exit(v.status ?? 1)
