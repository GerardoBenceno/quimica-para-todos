/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { APP_DISPLAY_NAME, APP_REPO_URL, APP_SHORT_NAME } from './src/app/brand.ts'

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }

// Ruta base de producción en GitHub Pages: /<nombre-del-repo>/.
const REPO_NAME = 'quimica-para-todos'
const base = process.env.VITE_BASE ?? `/${REPO_NAME}/`

// Colores del manifest y de <meta theme-color>: del tema elegido en ui.json.
type ThemeFile = { id: string; is_default: boolean; colors: Record<string, string> }[]
function themeColors() {
  const ui = JSON.parse(readFileSync('public/config/ui.json', 'utf8')) as { theme: string }
  const themes = (JSON.parse(readFileSync('public/content/packs/web/themes.json', 'utf8')) as ThemeFile).concat(
    JSON.parse(readFileSync('seed/themes.json', 'utf8')) as ThemeFile,
  )
  const t = themes.find((x) => x.id === ui.theme) ?? themes.find((x) => x.is_default) ?? themes[0]
  return t.colors
}
const colors = themeColors()

// Textos de UI que entran al HTML estático (descripción para compartir y 404).
const uiStrings = (() => {
  const ui = JSON.parse(readFileSync('public/config/ui.json', 'utf8')) as { ui_strings: string }
  return JSON.parse(readFileSync(`public/${ui.ui_strings}`, 'utf8')) as Record<string, string>
})()
// URL pública del sitio (GitHub Pages del repositorio), o VITE_SITE_URL si se publica en otro lado.
const siteUrl = (() => {
  if (process.env.VITE_SITE_URL) return process.env.VITE_SITE_URL.replace(/\/?$/, '/')
  const m = /github\.com\/([^/]+)\/([^/]+)/.exec(APP_REPO_URL)
  return m ? `https://${m[1].toLowerCase()}.github.io/${m[2]}/` : base
})()
// Imagen de la bienvenida (LCP): se precarga desde el HTML para no esperar a los paquetes.
const welcomeArt = (() => {
  const characters = JSON.parse(readFileSync('seed/characters.json', 'utf8')) as { role: string; expressions: Record<string, string> }[]
  const assets = JSON.parse(readFileSync('seed/assets.json', 'utf8')) as { id: string; uri: string }[]
  const idle = characters.find((c) => c.role === 'mascot')?.expressions.idle
  const uri = assets.find((a) => a.id === idle)?.uri ?? ''
  return uri ? `<link rel="preload" as="image" href="${base}${uri}" imagesrcset="${base}${uri.replace(/\.png$/, '@256.png')} 256w, ${base}${uri} 512w" imagesizes="200px" />` : ''
})()
const description = `${uiStrings['app.tagline']} ${uiStrings['welcome.lead']}`
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

/** Sustituye la marca, la descripción, la URL del sitio y los colores del tema en index.html. */
function brandHtml(): Plugin {
  return {
    name: 'brand-html',
    transformIndexHtml: (html) =>
      html
        .replaceAll('%APP_DISPLAY_NAME%', esc(APP_DISPLAY_NAME))
        .replaceAll('%APP_DESCRIPTION%', esc(description))
        .replaceAll('%SITE_URL%', siteUrl)
        .replaceAll('%THEME_SURFACE%', colors.surface)
        .replaceAll('%WELCOME_ART%', welcomeArt),
  }
}

/**
 * CSS del shell en línea: el único archivo CSS de la primera pantalla (unos
 * 22 KB) se incrusta en index.html en lugar de enlazarse, así no hay petición
 * bloqueante antes del primer render. El CSS de Ketcher sigue en su chunk
 * diferido. Las URL de las fuentes ya vienen absolutas con la base.
 */
function inlineCss(): Plugin {
  return {
    name: 'inline-css',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html, ctx) {
      const bundle = ctx.bundle
      if (!bundle) return html
      return html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (tag, href: string) => {
        const name = href.startsWith(base) ? href.slice(base.length) : href
        const asset = bundle[name]
        if (!asset || asset.type !== 'asset' || typeof asset.source !== 'string') return tag
        delete bundle[name]
        return `<style>${asset.source}</style>`
      })
    },
  }
}

/**
 * 404.html propia para GitHub Pages: cualquier ruta fuera de la base del repo
 * responde con la marca, un texto claro y el enlace a la app, con los colores
 * del tema y los textos de ui_es.json (sin fuentes ni scripts, carga al instante).
 */
function notFoundHtml(): Plugin {
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex" />
<title>${esc(uiStrings['error.not_found'])} · ${esc(APP_DISPLAY_NAME)}</title>
<link rel="icon" href="${base}icons/icon.svg" type="image/svg+xml" />
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:${colors.background};color:${colors.text_primary};font-family:'IBM Plex Sans',system-ui,sans-serif;padding:16px;box-sizing:border-box}
main{background:${colors.surface};border-radius:8px;padding:32px 24px;max-width:520px;width:100%}
.brand{display:flex;align-items:center;gap:10px;font-weight:600;font-size:18px;margin-bottom:20px}
h1{font-size:28px;line-height:1.2;margin:0 0 12px}
p{font-size:18px;line-height:1.6;color:${colors.text_secondary};margin:0 0 24px}
a.btn{display:inline-flex;align-items:center;min-height:48px;padding:0 20px;border-radius:4px;background:${colors.primary};color:${colors.on_primary};font-weight:600;text-decoration:none}
a.btn:focus-visible{outline:3px solid ${colors.focus};outline-offset:2px}
</style>
</head>
<body>
<main>
<div class="brand"><svg width="32" height="24" viewBox="0 0 32 24" aria-hidden="true"><polyline points="3,18 11,8 19,18 27,8" fill="none" stroke="${colors.text_primary}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="27" cy="8" r="3.4" fill="${colors.primary}"/></svg>${esc(APP_DISPLAY_NAME)}</div>
<h1>${esc(uiStrings['error.not_found'])}</h1>
<p>${esc(uiStrings['error.not_found_lead'])}</p>
<a class="btn" href="${base}">${esc(uiStrings['error.go_home'])}</a>
</main>
</body>
</html>
`
  return {
    name: 'not-found-html',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '404.html', source: html })
    },
  }
}

// Motores pesados: fuera del precache, en caché de tiempo de ejecución.
// og.png y 404.html solo los ven las redes y GitHub Pages: fuera del precache.
const ENGINE_GLOBS = ['**/og.png', '**/404.html', '**/assets/ketcher-*', '**/assets/indigoWorker-*', '**/assets/supabase-*.js', '**/assets/Provider*.js', '**/*.wasm', '**/vendor/**', '**/assets/ketcher-*.js', '**/assets/ketcher-*.css', '**/assets/engine-*.js', '**/assets/rdkit-*.js', '**/assets/indigo-*.js']

export default defineConfig({
  base,
  build: {
    // El editor y sus motores van en chunks con nombre fijo para excluirlos
    // del precache (se cachean al primer uso) sin subir el límite de 2 MiB.
    chunkSizeWarningLimit: 2048,
    rollupOptions: {
      output: {
        chunkFileNames: (chunk) =>
          chunk.moduleIds.some((id) => /node_modules[\\/](ketcher-|indigo-)|adapters[\\/]ketcher/.test(id))
            ? 'assets/ketcher-[hash].js'
            : chunk.moduleIds.some((id) => /node_modules[\\/]3dmol/.test(id))
              ? 'assets/3dmol-[hash].js'
              : 'assets/[name]-[hash].js',
        assetFileNames: (asset) =>
          (asset.names ?? []).some((n) => /ketcher|indigo/i.test(n)) ? 'assets/ketcher-[hash][extname]' : 'assets/[name]-[hash][extname]',
      },
    },
  },
  worker: { format: 'es' },
  define: {
    // Ketcher y sus dependencias esperan "global" de Node.
    global: 'globalThis',
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    brandHtml(),
    inlineCss(),
    notFoundHtml(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['icons/icon.svg'],
      manifest: {
        id: base,
        name: APP_DISPLAY_NAME,
        short_name: APP_SHORT_NAME,
        lang: 'es',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: colors.background,
        theme_color: colors.surface,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,json,svg,png,sdf,webmanifest}'],
        globIgnores: ENGINE_GLOBS,
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              /\.wasm$/.test(url.pathname) || /\/vendor\//.test(url.pathname) || /\/assets\/(ketcher|engine|3dmol|rdkit|indigo|indigoWorker)-/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'motores-quimicos', expiration: { maxEntries: 60 } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
