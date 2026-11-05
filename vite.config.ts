/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { APP_DISPLAY_NAME, APP_SHORT_NAME } from './src/app/brand.ts'

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
  return { surface: t.colors.surface, background: t.colors.background, primary: t.colors.primary }
}
const colors = themeColors()

/** Sustituye %APP_DISPLAY_NAME% y %THEME_SURFACE% en index.html. */
function brandHtml(): Plugin {
  return {
    name: 'brand-html',
    transformIndexHtml: (html) =>
      html.replaceAll('%APP_DISPLAY_NAME%', APP_DISPLAY_NAME).replaceAll('%THEME_SURFACE%', colors.surface),
  }
}

// Motores pesados: fuera del precache, en caché de tiempo de ejecución.
const ENGINE_GLOBS = ['**/assets/supabase-*.js', '**/assets/Provider*.js', '**/*.wasm', '**/vendor/**', '**/assets/ketcher-*.js', '**/assets/ketcher-*.css', '**/assets/engine-*.js', '**/assets/3dmol-*.js', '**/assets/rdkit-*.js', '**/assets/indigo-*.js']

export default defineConfig({
  base,
  define: {
    // Ketcher y sus dependencias esperan "global" de Node.
    global: 'globalThis',
  },
  plugins: [
    react(),
    brandHtml(),
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
              /\.wasm$/.test(url.pathname) || /\/vendor\//.test(url.pathname) || /\/assets\/(ketcher|engine|3dmol|rdkit|indigo)-/.test(url.pathname),
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
