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
