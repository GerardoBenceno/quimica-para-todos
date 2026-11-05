// Verificación en producción: sirve dist/ con vite preview bajo la ruta base
// (/quimica-para-todos/) y recorre el flujo con Playwright. Falla si hay
// peticiones 404 o errores de consola. Uso: npm run build && npm run verify
// Opciones: --steps=welcome,flow,draw,view3d,offline  --shots=<carpeta>
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'

const require = createRequire(import.meta.url)
const { chromium, devices } = require('playwright')

const BASE = '/quimica-para-todos/'
const PORT = 4173
const URL = `http://localhost:${PORT}${BASE}`
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')))
const steps = (args.steps ?? 'welcome').split(',')
const shots = args.shots ?? null
if (shots) mkdirSync(shots, { recursive: true })

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe', detached: true })
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('vite preview no arrancó')), 30000)
  server.stdout.on('data', (d) => {
    if (String(d).includes(String(PORT))) {
      clearTimeout(t)
      resolve()
    }
  })
})

const problems = []
const openPages = []
const browser = await chromium.launch()

async function newPage(viewport) {
  const ctx = await browser.newContext(viewport ? { viewport } : { ...devices['Pixel 5'] })
  const page = await ctx.newPage()
  openPages.push(page)
  ctx.on('page', (pg) => {
    if (!openPages.includes(pg)) {
      openPages.push(pg)
      pg.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
      pg.on('response', (r) => {
        if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`)
      })
    }
  })
  page.on('response', (r) => {
    if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`)
  })
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console: ${m.text()}`)
  })
  return { ctx, page }
}

async function shot(page, name) {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true })
}

const results = []
const step = async (name, fn) => {
  try {
    await fn()
    results.push(`ok   ${name}`)
  } catch (e) {
    results.push(`FAIL ${name}: ${e.message.split('\n')[0]}`)
    if (shots) for (const [k, p] of openPages.entries()) if (!p.isClosed()) await p.screenshot({ path: `${shots}/fallo-${name}-${k}.png`, fullPage: true }).catch(() => {})
    problems.push(`${name}: ${e.message.split('\n')[0]}`)
  }
}

const steps_impl = await import('./verify-steps.mjs')
for (const s of steps) {
  const fn = steps_impl[s]
  if (!fn) throw new Error(`paso desconocido: ${s}`)
  await step(s, () => fn({ newPage, shot, URL, BASE }))
}

await browser.close()
try { process.kill(-server.pid) } catch {}
console.log(results.join('\n'))
if (problems.length) {
  console.log('\nProblemas:\n' + [...new Set(problems)].join('\n'))
  process.exit(1)
}
console.log('verificación en ruta base: sin errores')
process.exit(0)
