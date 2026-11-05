import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { contrast, pickTheme, resolveColor, themeVariables } from './theme'
import { loadBundleFromDisk } from '../../scripts/packs'

const bundle = loadBundleFromDisk()
const theme = (id: string) => bundle.themes.find((t) => t.id === id)!

describe('tema', () => {
  it('ui.json manda sobre is_default', () => {
    expect(pickTheme(bundle.themes, 'web_theme_claro_prusia')?.id).toBe('web_theme_claro_prusia')
    expect(pickTheme(bundle.themes, 'no-existe')?.id).toBe('theme_dark_default')
  })

  it('expone colores y tipografía como variables CSS', () => {
    const v = themeVariables(theme('web_theme_claro_prusia'))
    expect(v['--color-primary']).toBe('#1D4F91')
    expect(v['--mol-highlight']).toBe('#C1E4F3')
    expect(v['--color-background']).toBe('#E3F1FB')
    expect(v['--color-surface-warm']).toBe('#FFF9E6')
    expect(v['--fs-22']).toBe('22px')
    expect(v['--font-sans']).toContain('IBM Plex Sans Variable')
  })

  // Pares texto/fondo y control/fondo de cada tema web: AA (4.5:1 texto, 3:1 controles).
  const TEXT_PAIRS: [string, string][] = [
    ['text_primary', 'background'],
    ['text_primary', 'surface'],
    ['text_secondary', 'background'],
    ['text_secondary', 'surface'],
    ['primary', 'surface'],
    ['primary', 'background'],
    ['primary', 'primary_selected_bg'],
    ['on_primary', 'primary'],
    ['on_primary', 'primary_hover'],
    ['success', 'success_bg'],
    ['error', 'error_bg'],
    ['text_primary', 'success_bg'],
    ['text_primary', 'error_bg'],
    ['text_primary', 'primary_selected_bg'],
    ['accent_text', 'surface'],
    ['accent_text', 'background'],
    ['accent_text', 'accent_bg'],
    ['mol_ink', 'surface'],
    ['mol_ink', 'mol_highlight'],
    ['text_secondary', 'line'],
    // Paleta del autor: sobre los pasteles fuertes solo va tinta (text_primary).
    ['text_primary', 'surface_warm'],
    ['text_primary', 'progress_track'],
    ['text_primary', 'block_strong'],
    ['text_primary', 'block_bright'],
    ['text_primary', 'block_mid'],
    ['text_primary', 'block_soft'],
    ['text_primary', 'block_pale'],
    ['text_secondary', 'surface_warm'],
    ['primary', 'surface_warm'],
    ['accent_text', 'surface_warm'],
    ['success', 'surface_warm'],
    ['error', 'surface_warm'],
  ]
  const UI_PAIRS: [string, string][] = [
    ['control_border', 'surface'],
    ['focus', 'background'],
    ['focus', 'surface'],
    ['success', 'surface'],
    ['error', 'surface'],
    // Bordes de controles y foco sobre fondos pastel: al menos 3:1.
    ['control_border', 'background'],
    ['control_border', 'primary_selected_bg'],
    ['control_border', 'surface_warm'],
    ['control_border', 'progress_track'],
    ['control_border', 'block_strong'],
    ['control_border', 'block_bright'],
    ['control_border', 'block_mid'],
    ['control_border', 'block_soft'],
    ['control_border', 'block_pale'],
    ['primary', 'progress_track'],
    ['focus', 'surface_warm'],
    ['focus', 'block_pale'],
    ['focus', 'block_soft'],
    ['focus', 'primary_selected_bg'],
  ]
  for (const id of ['web_theme_claro_prusia', 'web_theme_oscuro_prusia']) {
    it(`${id} cumple contraste AA en cada par`, () => {
      const t = theme(id)
      for (const [fg, bg] of TEXT_PAIRS) {
        const c = contrast(resolveColor(t, fg)!, resolveColor(t, bg)!)
        expect(c, `${id}: ${fg} sobre ${bg} = ${c.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
      }
      for (const [fg, bg] of UI_PAIRS) {
        const c = contrast(resolveColor(t, fg)!, resolveColor(t, bg)!)
        expect(c, `${id}: ${fg} sobre ${bg} = ${c.toFixed(2)}`).toBeGreaterThanOrEqual(3)
      }
    })
  }
})

describe('restricciones duras del código', () => {
  const files: string[] = []
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(tsx?|css)$/.test(f) && !/\.test\.tsx?$/.test(f) && !p.includes(`${'src'}/test/`)) files.push(p)
    }
  }
  walk('src')

  it('ningún color fijo en componentes ni estilos', () => {
    const offenders = files.filter((f) => /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/.test(readFileSync(f, 'utf8').replace(/&#\d+;/g, '')))
    expect(offenders).toEqual([])
  })

  it('el nombre de marca solo aparece en la constante APP_DISPLAY_NAME', () => {
    const offenders = files.filter((f) => !f.endsWith('app/brand.ts') && readFileSync(f, 'utf8').includes('Química para Todos'))
    expect(offenders).toEqual([])
  })
})
