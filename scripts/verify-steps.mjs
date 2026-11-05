// Pasos de verificación con Playwright para scripts/verify-prod.mjs.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const expectVisible = async (page, text, timeout = 15000) => {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout })
}

export async function welcome({ newPage, shot, URL }) {
  const { ctx, page } = await newPage()
  await page.goto(URL)
  await expectVisible(page, 'Aprende química orgánica jugando')
  const title = await page.title()
  if (!title.includes('Química')) throw new Error(`título inesperado: ${title}`)
  const manifest = await page.evaluate(async () => {
    const href = document.querySelector('link[rel="manifest"]')?.getAttribute('href')
    if (!href) return null
    return (await fetch(href)).json()
  })
  if (!manifest || manifest.start_url !== '/quimica-para-todos/' || manifest.scope !== '/quimica-para-todos/') {
    throw new Error(`manifest con start_url/scope incorrectos: ${JSON.stringify(manifest)}`)
  }
  // Metadatos para compartir y 404 propia de GitHub Pages.
  const og = await page.evaluate(() => document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '')
  if (!og.endsWith('/og.png')) throw new Error(`og:image inesperado: ${og}`)
  for (const file of ['og.png', '404.html']) {
    const st = await page.evaluate(async (u) => (await fetch(u)).status, `${URL}${file}`)
    if (st !== 200) throw new Error(`${file}: HTTP ${st}`)
  }
  await shot(page, '01-bienvenida')
  await ctx.close()
}

/** Responde el ejercicio visible: primera opción, o llena los huecos con el banco. */
async function answerVisible(page) {
  const radios = page.getByRole('radio')
  if ((await radios.count()) > 0) {
    await radios.first().click()
    return
  }
  const chips = page.locator('.bank .chip:not([disabled])')
  while ((await page.locator('.blank.empty').count()) > 0 && (await chips.count()) > 0) await chips.first().click()
}

/** Juega la lección abierta hasta la pantalla de resultado. */
export async function playLesson(page, shot, prefix, practice = false) {
  let i = 0
  for (;;) {
    const endText = practice ? 'Repaso terminado' : 'Lección completada'
    const end = page.getByText(endText).first()
    const check = page.getByRole('button', { name: 'Comprobar' })
    await end.or(check).first().waitFor({ timeout: 15000 })
    if (await end.isVisible().catch(() => false)) break
    await answerVisible(page)
    if (i === 0 && shot) await shot(page, `${prefix}-ejercicio`)
    await page.getByRole('button', { name: 'Comprobar' }).click()
    await page.getByRole('button', { name: 'Continuar', exact: true }).waitFor({ timeout: 10000 })
    if (i === 0 && shot) await shot(page, `${prefix}-retro`)
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    i++
    if (i > 30) throw new Error('la lección no termina')
    await page.waitForTimeout(100)
  }
  return i
}

export async function flow({ newPage, shot, URL }) {
  for (const [label, viewport] of [['movil', null], ['escritorio', { width: 1280, height: 860 }]]) {
    const { ctx, page } = await newPage(viewport)
    await page.goto(URL)
    await page.getByRole('button', { name: 'Empezar' }).click()
    // Diagnóstico completo.
    for (let k = 0; k < 8; k++) {
      await page.getByText(`Pregunta ${k + 1} de 8`).waitFor()
      await page.getByRole('radio').nth(k % 2).click()
      if (k === 0) await shot(page, `${label}-02-diagnostico`)
      await page.getByRole('button', { name: 'Siguiente' }).click()
    }
    await expectVisible(page, 'Tu punto de partida')
    await shot(page, `${label}-03-diagnostico-resultado`)
    await page.getByRole('button', { name: 'Empezar mi primera lección' }).click()
    await page.getByRole('button', { name: 'Empezar lección' }).click()
    const n = await playLesson(page, shot, `${label}-04`)
    if (n < 1) throw new Error('lección sin ejercicios')
    await shot(page, `${label}-05-resultado`)
    await page.getByRole('button', { name: 'Ver el mapa de mundos' }).click()
    await expectVisible(page, 'Tu ruta')
    await page.waitForTimeout(300)
    await shot(page, `${label}-06-mapa`)
    await noHorizontalScroll(page, `${label} mapa`)
    await page.getByRole('link', { name: 'Química básica del carbono' }).first().click()
    await expectVisible(page, 'lecciones completadas')
    await page.waitForTimeout(300)
    await shot(page, `${label}-07-ruta`)
    await noHorizontalScroll(page, `${label} ruta`)
    // Persistencia local: recargar conserva el avance.
    await page.reload()
    await expectVisible(page, '1 de 6 lecciones completadas')
    await ctx.close()
  }
}

/** Sin desplazamiento horizontal de la página. */
export async function noHorizontalScroll(page, where) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  if (over > 1) throw new Error(`${where}: desplazamiento horizontal de ${over}px`)
}

/** Atraviesa la primera sesión hasta el mapa (sin capturas). */
export async function firstSession(page, URL) {
  await page.goto(URL)
  await page.getByRole('button', { name: 'Empezar' }).click()
  await page.getByRole('button', { name: 'No sé, empezar desde el principio' }).click()
  await page.getByRole('button', { name: 'Empezar lección' }).click()
  await playLesson(page)
  await page.getByRole('button', { name: 'Ver el mapa de mundos' }).click()
  await expectVisible(page, 'Tu ruta')
}

export async function game({ newPage, shot, URL }) {
  const { ctx, page } = await newPage()
  await firstSession(page, URL)
  // Segunda lección: habilita el primer cofre.
  await page.getByRole('button', { name: /Empezar lección|Continuar lección/ }).click()
  await playLesson(page)
  await page.getByRole('button', { name: 'Volver a la ruta' }).click()
  await expectVisible(page, '2 de 6 lecciones completadas')
  await shot(page, 'juego-01-ruta-cofre')
  const coinsBefore = await page.locator('.stats .stat').nth(2).innerText().catch(() => '')
  await page.getByRole('link', { name: 'Recompensas' }).first().click()
  await page.getByRole('button', { name: /Abrir \(\+15 monedas\)/ }).click()
  await expectVisible(page, 'Sumaste 15 monedas')
  await shot(page, 'juego-02-recompensas')
  await page.getByRole('link', { name: 'Perfil' }).first().click()
  await expectVisible(page, 'Experiencia total')
  await noHorizontalScroll(page, 'perfil')
  await shot(page, 'juego-03-perfil')
  await page.getByRole('link', { name: 'Repasar' }).first().click()
  await page.getByRole('button', { name: 'Empezar repaso' }).waitFor()
  await shot(page, 'juego-04-repasar')
  await page.getByRole('button', { name: 'Empezar repaso' }).click()
  await playLesson(page, null, null, true)
  await expectVisible(page, 'Repaso terminado')
  void coinsBefore
  await ctx.close()
}

/** Marca como completadas las lecciones dadas en el estado local y recarga. */
export async function completeLessons(page, ids) {
  await page.evaluate((ids) => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('quimica_app:state:'))
    const s = JSON.parse(localStorage.getItem(key))
    for (const id of ids) {
      s.progress[`lesson:${id}`] = { id: `x:${id}`, user_id: s.user.id, scope_type: 'lesson', scope_id: id, status: 'completed', progress: 1, stars: 0, best_accuracy: 1, updated_at: new Date().toISOString() }
    }
    localStorage.setItem(key, JSON.stringify(s))
  }, ids)
  await page.reload()
}

const BEFORE_NUMERACION = ['l_carbono_enlaces', 'l_organico', 'l_sp3', 'l_sp2', 'l_sp', 'l_tipos_carbono', 'l_grupos_intro', 'l_grupos_oxigenados', 'l_grupos_nitrogenados', 'l_alcanos_lineales', 'l_sustituyentes']

/** Avanza en la lección hasta que aparezca un ejercicio que cumpla `until`. */
async function advanceUntil(page, until) {
  for (let i = 0; i < 20; i++) {
    await page.getByRole('button', { name: 'Comprobar' }).waitFor({ timeout: 15000 })
    if (await until()) return
    await answerVisible(page)
    await page.getByRole('button', { name: 'Comprobar' }).click()
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  }
  throw new Error('no apareció el ejercicio buscado')
}

export async function draw({ newPage, shot, URL }) {
  // Escritorio: se dibuja con Ketcher y se califica con RDKit.js.
  const { ctx, page } = await newPage({ width: 1280, height: 900 })
  await firstSession(page, URL)
  await completeLessons(page, BEFORE_NUMERACION)
  await page.goto(`${URL}#/leccion/l_numeracion`)
  await page.getByRole('button', { name: 'Empezar lección' }).click()
  await advanceUntil(page, () => page.getByText('Dibuja la estructura').first().isVisible())
  await page.waitForFunction(() => !!window.ketcher, null, { timeout: 60000 })
  await page.waitForTimeout(1000)
  await shot(page, 'dibujo-01-editor-escritorio')
  // Primero una estructura incorrecta (pentano), luego seguimos con la correcta en el siguiente.
  await page.evaluate(() => window.ketcher.setMolecule('CCCCC'))
  await page.getByRole('button', { name: 'Comprobar' }).waitFor()
  await page.waitForFunction(() => !document.querySelector('.player-bottom button')?.disabled, null, { timeout: 15000 })
  await page.getByRole('button', { name: 'Comprobar' }).click()
  await expectVisible(page, 'No es correcto', 60000)
  await shot(page, 'dibujo-02-incorrecto')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  // Segundo draw_structure (2,3-dimetilbutano): se dibuja con cuña e hidrógenos explícitos.
  await page.getByText('Dibuja la estructura').first().waitFor()
  await page.waitForFunction(() => !!window.ketcher)
  await page.waitForTimeout(800)
  await page.evaluate(() => window.ketcher.setMolecule('[H]C([H])([H])C(C)C(C)C'))
  await page.waitForFunction(() => !document.querySelector('.player-bottom button')?.disabled, null, { timeout: 15000 })
  await page.getByRole('button', { name: 'Comprobar' }).click()
  await expectVisible(page, 'Correcto', 60000)
  await shot(page, 'dibujo-03-correcto')
  // Prueba de usabilidad del editor a 360 px (la decisión está en DECISIONES.md).
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.goto(`${URL}#/leccion/l_ramificados`)
  await page.getByRole('button', { name: 'Empezar lección' }).click()
  await advanceUntil(page, () => page.getByText('Dibuja la estructura').first().isVisible())
  await page.setViewportSize({ width: 360, height: 740 })
  await page.waitForTimeout(1500)
  await shot(page, 'dibujo-05-editor-360')
  await ctx.close()

  // 360 px: el editor y la decisión de usabilidad.
  const m = await newPage({ width: 360, height: 740 })
  await firstSession(m.page, URL)
  await completeLessons(m.page, BEFORE_NUMERACION)
  await m.page.goto(`${URL}#/leccion/l_numeracion`)
  await m.page.getByRole('button', { name: 'Empezar lección' }).click()
  // En pantallas angostas cada draw_structure se sustituye por su choose_structure.
  await advanceUntil(m.page, () => m.page.getByText('Elige la estructura').first().isVisible())
  await shot(m.page, 'dibujo-04-elige-360')
  await playLesson(m.page)
  await expectVisible(m.page, 'Lección completada')
  await noHorizontalScroll(m.page, '360 resultado')
  await m.ctx.close()
}

export async function view3d({ newPage, shot, URL }) {
  const { ctx, page } = await newPage()
  await firstSession(page, URL)
  await completeLessons(page, ['l_carbono_enlaces', 'l_organico'])
  await page.goto(`${URL}#/leccion/l_sp3`)
  await page.getByRole('button', { name: 'Empezar lección' }).click()
  await page.locator('.viewer3d-canvas canvas').first().waitFor({ timeout: 30000 })
  await page.getByRole('button', { name: 'Girar a la derecha' }).click()
  await page.waitForTimeout(500)
  const size = await page.locator('.viewer3d-canvas canvas').first().boundingBox()
  if (!size || size.width < 100 || size.height < 100) throw new Error('lienzo 3D vacío')
  await shot(page, 'v3d-01-visor')
  await answerVisible(page)
  await page.getByRole('button', { name: 'Comprobar' }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).waitFor()
  await shot(page, 'v3d-02-retro')
  await ctx.close()
}

/** Primer ejercicio compare_structures con lección en los paquetes, y las lecciones que lo preceden. */
function findCompareExercise() {
  const packsDir = fileURLToPath(new URL('../public/content/packs/', import.meta.url))
  const packs = readdirSync(packsDir).sort((a, b) => (a === 'base' ? -1 : b === 'base' ? 1 : a.localeCompare(b)))
  const read = (pack, file) => {
    const p = `${packsDir}${pack}/${file}`
    return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : []
  }
  const lessons = packs.flatMap((pack) => read(pack, 'lessons.json'))
  const exercises = packs.flatMap((pack) => read(pack, 'exercises.json'))
  const ex = exercises.find((e) => e.type === 'compare_structures' && e.is_active !== false && e.lesson_id)
  if (!ex) return null
  const at = lessons.findIndex((l) => l.id === ex.lesson_id)
  return { ex, before: lessons.slice(0, Math.max(0, at)).map((l) => l.id) }
}

export async function compare({ newPage, shot, URL }) {
  const found = findCompareExercise()
  if (!found) {
    console.log('sin ejercicios compare_structures')
    return
  }
  const { ctx, page } = await newPage({ width: 1280, height: 900 })
  await firstSession(page, URL)
  await completeLessons(page, found.before)
  // El mundo en borrador (Próximamente) solo se abre con ?borrador=1 antes del hash.
  await page.goto(`${URL}?borrador=1#/leccion/${found.ex.lesson_id}`)
  await page.reload()
  await page.getByRole('button', { name: 'Empezar lección' }).click()
  await advanceUntil(page, () => page.locator('.compare-figures').isVisible())
  const figures = page.locator('.compare-figure [role="img"]')
  await figures.nth(1).waitFor({ timeout: 15000 })
  if ((await figures.count()) !== 2) throw new Error(`compare_structures: ${await figures.count()} figuras, se esperaban 2`)
  for (const text of ['Estructura A', 'Estructura B']) await expectVisible(page, text)
  if ((await page.getByRole('radio').count()) < 2) throw new Error('compare_structures: sin opciones')
  await shot(page, 'compare-01-escritorio')
  // Angosto: una figura debajo de la otra y sin desplazamiento horizontal.
  await page.setViewportSize({ width: 360, height: 740 })
  await page.waitForTimeout(300)
  const [a, b] = await Promise.all([figures.nth(0).boundingBox(), figures.nth(1).boundingBox()])
  if (!a || !b || b.y < a.y + a.height) throw new Error('compare_structures: a 360 px las figuras no se apilan')
  await noHorizontalScroll(page, 'compare 360')
  await shot(page, 'compare-02-360')
  await answerVisible(page)
  await page.getByRole('button', { name: 'Comprobar' }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).waitFor({ timeout: 10000 })
  await shot(page, 'compare-03-retro')
  await ctx.close()
}

export async function offline({ newPage, shot, URL, BASE }) {
  const { ctx, page } = await newPage()
  await page.goto(URL)
  await expectVisible(page, 'Aprende química orgánica jugando')
  const sw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready
    return { scope: reg.scope, active: !!reg.active }
  })
  if (!sw.active || !sw.scope.endsWith(BASE)) throw new Error(`service worker con scope inesperado: ${JSON.stringify(sw)}`)
  // Esperar a que termine el precache (el SW queda activo cuando lo instaló todo).
  await page.waitForFunction(async () => {
    const keys = await caches.keys()
    for (const k of keys) if (k.includes('precache') && (await (await caches.open(k)).keys()).length > 50) return true
    return false
  }, null, { timeout: 30000 })
  // Instalabilidad según Chrome (equivale a la pestaña Manifest de DevTools).
  const cdp = await ctx.newCDPSession(page)
  const inst = await cdp.send('Page.getInstallabilityErrors')
  if (inst.installabilityErrors.length) throw new Error(`no instalable: ${JSON.stringify(inst.installabilityErrors)}`)
  const man = await cdp.send('Page.getAppManifest')
  if (man.errors?.length) throw new Error(`errores del manifest: ${JSON.stringify(man.errors)}`)
  await ctx.setOffline(true)
  // Reapertura sin conexión en una pestaña nueva.
  const p2 = await ctx.newPage()
  await p2.goto(URL)
  await expectVisible(p2, 'Aprende química orgánica jugando')
  await expectVisible(p2, 'Sin conexión')
  await firstSession(p2, URL)
  await shot(p2, 'offline-01-mapa')
  await p2.getByRole('link', { name: 'Química básica del carbono' }).first().click()
  await expectVisible(p2, 'lecciones completadas')
  await ctx.close()
}

/** axe-core (WCAG 2.1 A/AA) en cada pantalla principal; falla con violaciones serias o críticas. */
export async function a11y({ newPage, URL }) {
  const { createRequire } = await import('node:module')
  const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js')
  const run = async (page, where) => {
    await page.addScriptTag({ path: axePath })
    const r = await page.evaluate(async () => {
      // eslint-disable-next-line no-undef
      const res = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })
      return res.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, target: v.nodes[0]?.target?.join(' ') }))
    })
    const small = await page.evaluate(() => {
      const out = []
      for (const el of document.querySelectorAll('a, button, [role="radio"], input, label.radio-row')) {
        if (el.closest('p') && el.tagName === 'A') continue // enlaces dentro de un párrafo: exentos
        if (el.tagName === 'INPUT' && el.closest('label')) continue // cuenta la fila de la etiqueta
        if (el.closest('.ketcher-host')) continue
        // Enlaces de fila: su ::after hace clicable la fila completa.
        const r = (el.classList.contains('row-link') ? el.closest('li') : el).getBoundingClientRect()
        const st = getComputedStyle(el)
        if (r.width === 0 || r.height === 0 || st.visibility === 'hidden') continue
        if (el.classList.contains('skip-link') && r.top < 0) continue
        if (r.width < 43.5 || r.height < 43.5) out.push(`${el.tagName.toLowerCase()}.${el.className} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
      }
      return out
    })
    if (small.length) throw new Error(`${where}: objetivos táctiles menores de 44 px: ${small.join('; ')}`)
    const bad = r.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    if (bad.length) throw new Error(`${where}: ${JSON.stringify(bad)}`)
    return r
  }
  for (const viewport of [null, { width: 1280, height: 860 }]) {
    const { ctx, page } = await newPage(viewport)
    await page.goto(URL)
    await expectVisible(page, 'Aprende química orgánica jugando')
    await run(page, 'bienvenida')
    await page.getByRole('button', { name: 'Empezar' }).click()
    await page.getByText('Pregunta 1 de 8').waitFor()
    await run(page, 'diagnóstico')
    await page.getByRole('button', { name: 'No sé, empezar desde el principio' }).click()
    await page.getByRole('button', { name: 'Empezar lección' }).waitFor()
    await run(page, 'intro de lección')
    await page.getByRole('button', { name: 'Empezar lección' }).click()
    await answerVisible(page)
    await run(page, 'ejercicio')
    await page.getByRole('button', { name: 'Comprobar' }).click()
    await page.getByRole('button', { name: 'Continuar', exact: true }).waitFor()
    await run(page, 'retroalimentación')
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    await playLesson(page)
    await run(page, 'resultado')
    await page.getByRole('button', { name: 'Ver el mapa de mundos' }).click()
    await expectVisible(page, 'Tu ruta')
    await page.waitForTimeout(300)
    await run(page, 'mapa')
    for (const [hash, text] of [['#/mundo/w_carbono', 'lecciones completadas'], ['#/perfil', 'Experiencia total'], ['#/recompensas', 'Tienda'], ['#/repasar', 'Empezar repaso'], ['#/acerca', 'Hecho con'], ['#/no-existe', 'Esta página no existe'], ['#/revision', 'Revisión del curso'], ['#/editor', 'Editor de ejercicios']]) {
      await page.goto(`${URL}${hash}`)
      await expectVisible(page, text)
      await page.waitForTimeout(300)
      await run(page, hash)
    }
    await ctx.close()
  }
}
