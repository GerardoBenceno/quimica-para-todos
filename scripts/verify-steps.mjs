// Pasos de verificación con Playwright para scripts/verify-prod.mjs.
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
