import { describe, expect, it } from 'vitest'
import { loadBundleFromDisk } from '../../../scripts/packs'
import { lessonExercises } from './lessonPlan'

const b = loadBundleFromDisk()
const ids = (o: Parameters<typeof lessonExercises>[2], l = 'l_numeracion') => lessonExercises(b, l, o).map((e) => e.id)

describe('composición de lecciones con tipos web', () => {
  it('en escritorio aparecen los draw_structure derivados al final de la lección', () => {
    const list = ids({ narrow: false, drawOnNarrow: false, view3d: false })
    expect(list).toContain('web_draw_e_2metilbutano')
    expect(list.some((x) => x.startsWith('web_choose_'))).toBe(false)
  })

  it('en pantallas angostas cada draw_structure se sustituye por su choose_structure en el mismo lugar', () => {
    const wide = ids({ narrow: false, drawOnNarrow: false, view3d: false })
    const narrow = ids({ narrow: true, drawOnNarrow: false, view3d: false })
    expect(narrow).toHaveLength(wide.length)
    expect(narrow[wide.indexOf('web_draw_e_2metilbutano')]).toBe('web_choose_e_2metilbutano')
    expect(narrow.some((x) => x.startsWith('web_draw_'))).toBe(false)
  })

  it('un draw_structure sin variante se omite en pantallas angostas y no cuenta', () => {
    const bb = structuredClone(b)
    bb.exercises = bb.exercises.filter((e) => e.id !== 'web_choose_e_2metilbutano')
    const narrow = lessonExercises(bb, 'l_numeracion', { narrow: true, drawOnNarrow: false, view3d: false }).map((e) => e.id)
    expect(narrow).not.toContain('web_draw_e_2metilbutano')
  })

  it('view_3d ocupa el lugar de su origen solo con el visor encendido y 3D disponible', () => {
    const off = ids({ narrow: false, drawOnNarrow: false, view3d: false }, 'l_sp3')
    const on = ids({ narrow: false, drawOnNarrow: false, view3d: true, has3d: () => true }, 'l_sp3')
    const no3d = ids({ narrow: false, drawOnNarrow: false, view3d: true, has3d: () => false }, 'l_sp3')
    expect(off).toContain('e_sp3_geom')
    expect(on[off.indexOf('e_sp3_geom')]).toBe('web_v3d_e_sp3_geom')
    expect(no3d).toEqual(off)
  })

  it('los derivados no inventan química: reutilizan respuesta y SMILES del seed', () => {
    for (const e of b.exercises.filter((x) => b.origin[x.id] === 'web')) {
      const src = b.exercises.find((x) => x.id === e.payload.source_exercise_id)!
      expect(src, e.id).toBeTruthy()
      if (e.type === 'draw_structure') expect(e.correct.smiles).toBe(src.payload.structure_smiles)
      if (e.type === 'view_3d') expect(e.correct).toEqual(src.correct)
      if (e.type === 'choose_structure') {
        const seedSmiles = new Set(b.exercises.filter((x) => b.origin[x.id] === 'base').map((x) => x.payload.structure_smiles))
        for (const o of e.payload.options!) expect(seedSmiles.has(o.smiles!)).toBe(true)
      }
    }
  })
})
