// Genera public/og.png (1200 × 630), la imagen que ven las redes y los chats
// al compartir el enlace. Toma la marca de src/app/brand.ts, los textos de
// public/config/i18n/ui_es.json, los colores del tema de ui.json y a Carbo en
// reposo desde assets/images/. Se versiona: solo hay que correrlo cuando
// cambie la marca, el texto de bienvenida, la paleta o el arte de Carbo.
// Uso: npx tsx scripts/gen-share-image.ts  (requiere Playwright con Chromium)
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { APP_DISPLAY_NAME } from '../src/app/brand.ts'

const require = createRequire(import.meta.url)
// Playwright viene del entorno (como en scripts/verify-prod.mjs), sin tipos en el proyecto.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { chromium } = require('playwright') as any

const root = resolve(import.meta.dirname, '..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')
const ui = JSON.parse(read('public/config/ui.json')) as { theme: string; ui_strings: string }
const strings = JSON.parse(read(`public/${ui.ui_strings}`)) as Record<string, string>
type ThemeFile = { id: string; colors: Record<string, string> }[]
const theme = (JSON.parse(read('public/content/packs/web/themes.json')) as ThemeFile).find((t) => t.id === ui.theme)
if (!theme) throw new Error(`tema ${ui.theme} no encontrado`)
const c = theme.colors
const characters = JSON.parse(read('seed/characters.json')) as { role: string; expressions: Record<string, string> }[]
const assets = JSON.parse(read('seed/assets.json')) as { id: string; uri: string }[]
const idle = characters.find((x) => x.role === 'mascot')?.expressions.idle
const art = assets.find((a) => a.id === idle)?.uri
// Fuente e imagen incrustadas como data URI: una página creada con setContent no puede leer file://.
const dataUri = (p: string, mime: string) => `data:${mime};base64,${readFileSync(resolve(root, p)).toString('base64')}`
const font = dataUri('node_modules/@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2', 'font/woff2')

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
@font-face{font-family:Plex;src:url('${font}') format('woff2');font-weight:100 900}
html,body{margin:0}
body{width:1200px;height:630px;background:${c.background};font-family:Plex,sans-serif;color:${c.text_primary};display:flex;align-items:center;justify-content:space-between;padding:0 88px;box-sizing:border-box}
.text{display:flex;flex-direction:column;gap:22px;max-width:640px}
.brand{display:flex;align-items:center;gap:16px;font-size:30px;font-weight:600}
h1{margin:0;font-size:66px;line-height:1.1;font-weight:600;letter-spacing:-0.012em}
p{margin:0;font-size:27px;line-height:1.4;color:${c.text_secondary}}
.art{width:380px;height:380px;background:${c.block_soft};border-radius:16px;display:flex;align-items:center;justify-content:center}
.art img{width:300px;height:300px}
</style></head><body>
<div class="text"><div class="brand"><svg width="44" height="33" viewBox="0 0 32 24"><polyline points="3,18 11,8 19,18 27,8" fill="none" stroke="${c.text_primary}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="27" cy="8" r="3.4" fill="${c.primary}"/></svg>${APP_DISPLAY_NAME}</div>
<h1>${strings['app.tagline']}</h1><p>${strings['welcome.lead']} ${strings['welcome.no_signup'].split('.')[0]}.</p></div>
${art ? `<div class="art"><img src="${dataUri(art, 'image/png')}" alt=""></div>` : ''}
</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate('document.fonts.ready')
const png = await page.screenshot({ type: 'png' })
await browser.close()
writeFileSync(resolve(root, 'public/og.png'), png)
console.log(`public/og.png: ${(png.length / 1024).toFixed(0)} KB`)
