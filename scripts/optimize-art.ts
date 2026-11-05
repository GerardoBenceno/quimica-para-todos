// Genera las versiones que sirve la app (assets/images/) a partir de los
// originales del autor (arte/originales/), que son la única fuente de verdad
// del arte. Por cada <id>.png produce <id>.png (máximo 512 px por lado) y
// <id>@256.png (máximo 256 px), PNG con alfa, sin recortar, deformar ni
// recolorear: solo se reduce el tamaño (Lanczos) y se comprime con paleta de
// 256 colores (libimagequant, calidad máxima; diferencia media medida de
// 1/255 por canal), porque sin paleta las ilustraciones de 512 px pesan de 150
// a 290 KB y el arte precacheado debe quedar por debajo de 1.5 MB.
// Guarda el hash de cada original en assets/images/.sources.json para no
// regenerar lo que no cambió. Corre antes de dev, build y test y en CI, así el
// autor solo sube el original desde la web de GitHub.
// Uso: npx tsx scripts/optimize-art.ts [--check]
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(import.meta.dirname, '..')
const srcDir = join(root, 'arte/originales')
const outDir = join(root, 'assets/images')
const stampPath = join(outDir, '.sources.json')
const SIZES = [
  { suffix: '', px: 512 },
  { suffix: '@256', px: 256 },
]
const MAX_BYTES = 150 * 1024
const check = process.argv.includes('--check')

type Stamp = Record<string, string>
const sha = (buf: Buffer) => createHash('sha256').update(buf).digest('hex').slice(0, 16)

async function main() {
  if (!existsSync(srcDir)) {
    console.log('optimize-art: no existe arte/originales/, nada que hacer')
    return
  }
  mkdirSync(outDir, { recursive: true })
  const stamp: Stamp = existsSync(stampPath) ? (JSON.parse(readFileSync(stampPath, 'utf8')) as Stamp) : {}
  const originals = readdirSync(srcDir)
    .filter((f) => /\.png$/i.test(f))
    .sort()
  const ids = new Set(originals.map((f) => basename(f, '.png')))
  const next: Stamp = {}
  let generated = 0
  const problems: string[] = []

  for (const file of originals) {
    const id = basename(file, '.png')
    const buf = readFileSync(join(srcDir, file))
    const hash = `${sha(buf)}:${SIZES.map((s) => s.px).join(',')}`
    next[id] = hash
    const outputs = SIZES.map((s) => join(outDir, `${id}${s.suffix}.png`))
    if (stamp[id] === hash && outputs.every((p) => existsSync(p))) continue
    if (check) {
      problems.push(`${file}: falta regenerar assets/images/ (corre npx tsx scripts/optimize-art.ts)`)
      continue
    }
    const meta = await sharp(buf).metadata()
    if (!meta.hasAlpha) problems.push(`${file}: el original no tiene canal alfa (fondo transparente)`)
    for (const s of SIZES) {
      const out = await sharp(buf)
        .resize(s.px, s.px, { fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' })
        .png({ palette: true, quality: 100, colours: 256, dither: 1.0, effort: 10, compressionLevel: 9 })
        .toBuffer()
      const outPath = join(outDir, `${id}${s.suffix}.png`)
      writeFileSync(outPath, out)
      if (out.length > MAX_BYTES) problems.push(`${basename(outPath)}: ${(out.length / 1024).toFixed(0)} KB supera los 150 KB`)
    }
    generated++
    console.log(`optimize-art: ${file} -> ${SIZES.map((s) => `${id}${s.suffix}.png`).join(', ')}`)
  }

  // Lo que no tiene original no es arte del autor: se retira para que
  // arte/originales/ sea la única fuente de verdad.
  for (const f of readdirSync(outDir)) {
    if (f.startsWith('.')) continue
    const id = basename(f, '.png').replace(/@256$/, '')
    if (!ids.has(id)) {
      if (check) problems.push(`assets/images/${f}: no tiene original en arte/originales/`)
      else {
        rmSync(join(outDir, f))
        console.log(`optimize-art: retirado assets/images/${f} (sin original)`)
      }
    }
  }

  const total = readdirSync(outDir)
    .filter((f) => f.endsWith('.png'))
    .reduce((n, f) => n + statSync(join(outDir, f)).size, 0)
  if (!check) writeFileSync(stampPath, JSON.stringify(next, null, 2) + '\n')
  console.log(`optimize-art: ${originals.length} originales, ${generated} regenerados, ${(total / 1024).toFixed(0)} KB servidos en total`)
  if (problems.length) {
    console.error(problems.map((p) => `optimize-art: ${p}`).join('\n'))
    process.exit(1)
  }
}

void main()
