// Validación de paquetes de contenido (corre en CI antes del build):
// parseo zod, ids únicos dentro y entre paquetes, integridad referencial,
// respuestas correctas dentro de sus opciones, cobertura i18n al 100 % y que
// todo SMILES usado tenga entrada en public/mol/index.json.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mergePacks } from '../src/core/content/bundle'
import { checkIntegrity, type Issue } from '../src/core/content/integrity'
import { manifestSchema, uiConfigSchema, featuresSchema } from '../src/core/schemas'
import { PUBLIC, ROOT, loadMolIndex, loadRawPacks, readJson } from './packs'

// La comprobación de moléculas se activa en el hito 2, con public/mol/index.json.
const MOL_CHECK = false

const issues: Issue[] = []
const error = (message: string) => issues.push({ level: 'error', message })

// 1. packs/base es copia exacta de seed/.
const seedFiles = readdirSync(join(ROOT, 'seed')).filter((f) => f.endsWith('.json')).sort()
const baseFiles = readdirSync(join(PUBLIC, 'content/packs/base')).sort()
if (seedFiles.join() !== baseFiles.join()) error('packs/base no tiene los mismos archivos que seed/ (corre npm run sync:base)')
for (const f of seedFiles) {
  if (!baseFiles.includes(f)) continue
  if (readFileSync(join(ROOT, 'seed', f), 'utf8') !== readFileSync(join(PUBLIC, 'content/packs/base', f), 'utf8')) {
    error(`packs/base/${f} difiere de seed/${f} (corre npm run sync:base)`)
  }
}

// 2. manifest: cada archivo declarado existe y no hay archivos sin declarar.
const manifest = manifestSchema.parse(readJson(join(PUBLIC, 'content/manifest.json')))
for (const pack of manifest.packs) {
  const onDisk = readdirSync(join(PUBLIC, 'content/packs', pack)).filter((f) => f.endsWith('.json')).sort()
  const declared = [...(manifest.files[pack] ?? [])].sort()
  if (onDisk.join() !== declared.join()) error(`manifest.files.${pack} no coincide con el disco (corre npm run sync:base)`)
}

// 3. Configuración.
const ui = uiConfigSchema.safeParse(readJson(join(PUBLIC, 'config/ui.json')))
if (!ui.success) error(`config/ui.json inválido: ${ui.error.message}`)
const features = featuresSchema.safeParse(readJson(join(PUBLIC, 'config/features.json')))
if (!features.success) error(`config/features.json inválido: ${features.error.message}`)

// 4. Unión de paquetes e integridad.
const merged = mergePacks(loadRawPacks())
if (!merged.ok) {
  error(merged.error.message)
} else {
  const bundle = merged.value
  const locale = ui.success ? ui.data.locale : 'es'
  issues.push(...checkIntegrity(bundle, { locale, molIndex: MOL_CHECK ? (loadMolIndex() ?? {}) : null }))
  if (ui.success && !bundle.themes.some((t) => t.id === ui.data.theme)) error(`ui.json: el tema "${ui.data.theme}" no existe`)
  // Claves de UI: no deben chocar con claves de contenido.
  if (ui.success) {
    const uiStrings = readJson(join(PUBLIC, ui.data.ui_strings)) as Record<string, string>
    const contentKeys = new Set(bundle.translations.map((t) => t.key))
    for (const k of Object.keys(uiStrings)) if (contentKeys.has(k)) error(`clave de UI "${k}" choca con una de contenido`)
  }
}

const errors = issues.filter((i) => i.level === 'error')
for (const i of issues) console.log(`${i.level === 'error' ? 'ERROR' : 'aviso'}: ${i.message}`)
console.log(`validate-content: ${errors.length} errores, ${issues.length - errors.length} avisos`)
process.exit(errors.length > 0 ? 1 : 0)
