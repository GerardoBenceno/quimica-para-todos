import type { Theme } from '../models'

const kebab = (s: string) => s.replace(/_/g, '-')

/** Respaldos por rol, para que un tema del seed con menos campos no rompa. */
const FALLBACKS: Record<string, string[]> = {
  primary_hover: ['primary'],
  primary_selected_bg: ['surface'],
  primary_halo: ['primary_selected_bg', 'locked'],
  on_primary: ['surface'],
  success_bg: ['surface'],
  error_bg: ['surface'],
  accent_text: ['accent'],
  accent_bg: ['surface'],
  line: ['locked', 'text_secondary'],
  control_border: ['text_secondary'],
  mol_ink: ['text_primary'],
  mol_highlight: ['primary_selected_bg', 'locked'],
  focus: ['primary'],
  sheet_shadow: ['line', 'locked'],
  card: ['surface'],
  surface_warm: ['surface'],
  // Papel para ilustraciones con tinta fija (PNG): blanco también en el tema oscuro.
  illustration_bg: ['surface'],
  progress_track: ['line', 'locked'],
  block_strong: ['primary_selected_bg'],
  block_bright: ['primary_selected_bg'],
  block_mid: ['primary_selected_bg'],
  block_soft: ['primary_selected_bg'],
  block_pale: ['primary_selected_bg'],
}

export function resolveColor(theme: Theme, role: string, depth = 0): string | undefined {
  if (theme.colors[role]) return theme.colors[role]
  if (depth > 3) return undefined
  for (const alt of FALLBACKS[role] ?? []) {
    const v = resolveColor(theme, alt, depth + 1)
    if (v) return v
  }
  return undefined
}

/** Variables CSS que expone un tema. Los componentes solo usan estas variables. */
export function themeVariables(theme: Theme): Record<string, string> {
  const vars: Record<string, string> = {}
  const roles = new Set([...Object.keys(theme.colors), ...Object.keys(FALLBACKS)])
  for (const role of roles) {
    const v = resolveColor(theme, role)
    if (v) vars[`--color-${kebab(role)}`] = v
  }
  const mh = resolveColor(theme, 'mol_highlight')
  if (mh) vars['--mol-highlight'] = mh
  const ty = theme.typography
  const family = [`'${ty.font_family}'`, ...(ty.fallback ?? ['system-ui', 'sans-serif']).map((f) => (f.includes(' ') ? `'${f}'` : f))]
  vars['--font-sans'] = family.join(', ')
  const scale = ty.scale || 1
  for (const size of ty.sizes ?? [12, 13, 14, 15, 16, 18, 22, 28, 36]) vars[`--fs-${size}`] = `${size * scale}px`
  vars['--fs-body'] = `${(ty.body_size ?? 18) * scale}px`
  vars['--lh-body'] = String(ty.body_line_height ?? 1.6)
  vars['--measure'] = `${ty.measure_ch ?? 62}ch`
  return vars
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement) {
  for (const [k, v] of Object.entries(themeVariables(theme))) root.style.setProperty(k, v)
  root.style.colorScheme = theme.mode ?? 'light'
  root.dataset.theme = theme.id
  const meta = document.querySelector('meta[name="theme-color"]')
  const bg = resolveColor(theme, 'surface')
  if (meta && bg) meta.setAttribute('content', bg)
}

/** ui.json manda sobre is_default; si no existe, is_default; si no, el primero activo. */
export function pickTheme(themes: Theme[], preferredId: string | null | undefined): Theme | null {
  const active = themes.filter((t) => t.is_active)
  return (
    active.find((t) => t.id === preferredId) ??
    active.find((t) => t.is_default) ??
    active[0] ??
    null
  )
}

// --- Contraste WCAG ---------------------------------------------------------
function channel(c: number) {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}
export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}
