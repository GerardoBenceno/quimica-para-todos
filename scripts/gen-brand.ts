// Genera la marca que sirve la app a partir de los dos originales del logo:
//   arte/logo.png          logo completo (símbolo y nombre), PNG con fondo transparente
//   arte/logo-simbolo.png  solo el símbolo (el matraz dentro de la Q), PNG con fondo transparente
// Salidas:
//   public/brand/logo-300.png                      logo completo recortado, 300 px de alto (bienvenida, Acerca de)
//   public/brand/logo-mark-64.png, -128.png        símbolo a 64 y 128 px de alto (encabezado, carga, 404)
//   public/icons/icon-192.png, icon-512.png        íconos de la PWA, fondo transparente
//   public/icons/icon-maskable-512.png             ícono maskable: símbolo dentro de la zona segura, fondo del tema
//   public/icons/apple-touch-icon.png              180 px, fondo del tema (iOS no respeta la transparencia)
//   public/icons/favicon-48.png                    favicon
// Solo reduce el tamaño (Lanczos) y comprime con paleta de 256 colores; no
// recorta el dibujo, salvo el margen transparente del logo completo, ni lo
// deforma ni lo recolorea. Guarda el hash de los originales en
// public/brand/.sources.json para no regenerar lo que no cambió. Corre antes
// de dev, build y test y en CI, así el autor solo sube los dos originales
// desde la web de GitHub. Si no existen, conserva la marca actual.
// Uso: npx tsx scripts/gen-brand.ts
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(import.meta.dirname, '..')
const logoPath = join(root, 'arte/logo.png')
const markPath = join(root, 'arte/logo-simbolo.png')
const brandDir = join(root, 'public/brand')
const iconsDir = join(root, 'public/icons')
const stampPath = join(brandDir, '.sources.json')
const MAX_BYTES = 150 * 1024

type ThemeFile = { id: string; colors: Record<string, string> }[]
const ui = JSON.parse(readFileSync(join(root, 'public/config/ui.json'), 'utf8')) as { theme: string }
const theme = (JSON.parse(readFileSync(join(root, 'public/content/packs/web/themes.json'), 'utf8')) as ThemeFile).find(
  (t) => t.id === ui.theme,
)
if (!theme) throw new Error(`gen-brand: tema ${ui.theme} no encontrado`)
const background = theme.colors.background

const png = (img: sharp.Sharp) => img.png({ palette: true, quality: 100, effort: 10, compressionLevel: 9 })
const transparent = { r: 0, g: 0, b: 0, alpha: 0 }

/** El símbolo escalado para caber en una caja de alto `h` y ancho máximo `w`. */
const fit = (src: Buffer, w: number, h: number) =>
  sharp(src).resize({ width: w, height: h, fit: 'inside', kernel: 'lanczos3' }).png().toBuffer()

/** Ícono cuadrado de `size` con el símbolo ocupando `share` del lado, centrado. */
async function squareIcon(mark: Buffer, size: number, share: number, bg: string | typeof transparent) {
  const inner = Math.round(size * share)
  const symbol = await fit(mark, inner, inner)
  return png(sharp({ create: { width: size, height: size, channels: 4, background: bg } }).composite([{ input: symbol, gravity: 'center' }]))
}

async function main() {
  if (!existsSync(logoPath) || !existsSync(markPath)) {
    console.log('gen-brand: faltan arte/logo.png o arte/logo-simbolo.png; se conserva la marca actual')
    return
  }
  const logo = readFileSync(logoPath)
  const mark = readFileSync(markPath)
  const hash = createHash('sha256').update(logo).update(mark).update(background).digest('hex').slice(0, 16)
  const outputs: [string, () => Promise<sharp.Sharp>][] = [
    [join(brandDir, 'logo-300.png'), async () => png(sharp(await sharp(logo).trim().toBuffer()).resize({ height: 300, kernel: 'lanczos3' }))],
    [join(brandDir, 'logo-mark-64.png'), async () => png(sharp(await fit(mark, 64, 64)))],
    [join(brandDir, 'logo-mark-128.png'), async () => png(sharp(await fit(mark, 128, 128)))],
    [join(iconsDir, 'icon-192.png'), () => squareIcon(mark, 192, 0.88, transparent)],
    [join(iconsDir, 'icon-512.png'), () => squareIcon(mark, 512, 0.88, transparent)],
    // Zona segura de un ícono maskable: círculo del 80 % del lado; el símbolo (alto ~1.3 × ancho) cabe al 60 %.
    [join(iconsDir, 'icon-maskable-512.png'), () => squareIcon(mark, 512, 0.6, background)],
    [join(iconsDir, 'apple-touch-icon.png'), () => squareIcon(mark, 180, 0.74, background)],
    [join(iconsDir, 'favicon-48.png'), () => squareIcon(mark, 48, 1, transparent)],
  ]
  const stamp = existsSync(stampPath) ? (JSON.parse(readFileSync(stampPath, 'utf8')) as { hash?: string }) : {}
  if (stamp.hash === hash && outputs.every(([p]) => existsSync(p))) return

  for (const meta of [await sharp(logo).metadata(), await sharp(mark).metadata()]) {
    if (!meta.hasAlpha) throw new Error('gen-brand: los originales del logo deben tener fondo transparente')
  }
  mkdirSync(brandDir, { recursive: true })
  mkdirSync(iconsDir, { recursive: true })
  for (const [path, make] of outputs) {
    const buf = await (await make()).toBuffer()
    if (buf.length > MAX_BYTES) throw new Error(`gen-brand: ${path} pesa ${(buf.length / 1024).toFixed(0)} KB (máximo 150 KB)`)
    writeFileSync(path, buf)
  }
  writeFileSync(stampPath, `${JSON.stringify({ hash }, null, 2)}\n`)
  console.log(`gen-brand: ${outputs.length} archivos de marca generados`)
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
