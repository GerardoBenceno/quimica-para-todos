// Exporta un paquete de contenido a plantillas CSV (ida y vuelta sin pérdida).
// Uso: npx tsx scripts/export-pack-csv.ts [paquete=base] [carpeta=plantillas/ejemplo]
import { join } from 'node:path'
import { exportPack } from './pack-csv'
import { PUBLIC, ROOT } from './packs'

const pack = process.argv[2] ?? 'base'
const out = process.argv[3] ?? join(ROOT, 'plantillas', 'ejemplo')
const written = exportPack(join(PUBLIC, 'content/packs', pack), out)
console.log(`exportado ${pack} -> ${out}: ${written.join(', ')}`)
