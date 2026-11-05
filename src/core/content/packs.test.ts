import { describe, expect, it } from 'vitest'
import { mergePacks, type RawPack } from './bundle'
import { checkIntegrity } from './integrity'
import { loadBundleFromDisk, loadRawPacks } from '../../../scripts/packs'

const world = (id: string, order = 1) => ({
  id,
  slug: id,
  title_key: `${id}.t`,
  description_key: null,
  icon_asset_id: null,
  order,
  status: 'unlocked',
  unlock_rule: null,
  total_lessons: 0,
  content_version: 1,
  is_active: true,
})

describe('carga y unión de paquetes', () => {
  it('parsea los paquetes reales y une en el orden del manifest', () => {
    const raw = loadRawPacks()
    expect(raw.map((p) => p.id)).toEqual(['base', 'web'])
    const b = loadBundleFromDisk()
    expect(b.worlds).toHaveLength(5)
    expect(b.units).toHaveLength(6)
    expect(b.lessons).toHaveLength(13)
    expect(b.exercises.filter((e) => b.origin[e.id] === 'base')).toHaveLength(50)
    expect(b.diagnosticItems).toHaveLength(8)
    // El tema del seed sigue existiendo y llega primero; los web van después.
    expect(b.themes[0].id).toBe('theme_dark_default')
    expect(b.themes.map((t) => t.id)).toContain('web_theme_claro_prusia')
  })

  it('el contenido real no tiene errores de integridad ni huecos de i18n', () => {
    const b = loadBundleFromDisk()
    const errors = checkIntegrity(b, { locale: 'es' }).filter((i) => i.level === 'error')
    expect(errors).toEqual([])
  })

  it('un id duplicado entre paquetes es error, no sobrescritura', () => {
    const packs: RawPack[] = [
      { id: 'base', files: { 'worlds.json': [world('w_a')] } },
      { id: 'web', files: { 'worlds.json': [world('w_a', 2)] } },
    ]
    const r = mergePacks(packs)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.kind).toBe('duplicate')
      expect(r.error.message).toContain('w_a')
    }
  })

  it('una clave i18n duplicada entre paquetes es error', () => {
    const tr = { key: 'k', locale: 'es', value: 'v', content_version: 1 }
    const r = mergePacks([
      { id: 'base', files: { 'translations_es.json': [tr] } },
      { id: 'web', files: { 'translations_es.json': [tr] } },
    ])
    expect(r.ok).toBe(false)
  })

  it('un paquete mal formado falla con un mensaje que nombra archivo y campo', () => {
    const bad = { ...world('w_a'), status: 'abierto' }
    const r = mergePacks([{ id: 'base', files: { 'worlds.json': [bad] } }])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.kind).toBe('parse')
      expect(r.error.message).toContain('base/worlds.json')
      expect(r.error.message).toContain('status')
    }
  })

  it('los archivos que faltan en un paquete cuentan como vacíos', () => {
    const r = mergePacks([{ id: 'base', files: { 'worlds.json': [world('w_a')] } }, { id: 'web', files: {} }])
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.exercises).toEqual([])
  })

  it('exige el prefijo del paquete en ids que no son de base', () => {
    const r = mergePacks([
      { id: 'base', files: {} },
      { id: 'web', files: { 'worlds.json': [world('w_sin_prefijo')] } },
    ])
    expect(r.ok).toBe(true)
    if (r.ok) {
      const errs = checkIntegrity(r.value).filter((i) => i.level === 'error')
      expect(errs.some((e) => e.message.includes('prefijo'))).toBe(true)
    }
  })

  it('detecta una respuesta correcta que no está en sus opciones', () => {
    const b = loadBundleFromDisk()
    const ex = structuredClone(b.exercises[0])
    ex.correct = { value: 'no-existe' }
    const issues = checkIntegrity({ ...b, exercises: [ex, ...b.exercises.slice(1)] })
    expect(issues.some((i) => i.message.includes('no está en sus opciones'))).toBe(true)
  })

  it('access.json da acceso por paquete y por id, free por defecto', () => {
    const r = mergePacks([
      { id: 'base', files: { 'worlds.json': [world('w_a')] } },
      { id: 'bio', files: { 'worlds.json': [world('bio_w', 2)], 'access.json': { default: 'premium', ids: { w_a: 'premium' } } } },
    ])
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.access.bio_w).toBe('premium')
      expect(r.value.access.w_a).toBe('premium')
    }
  })
})
