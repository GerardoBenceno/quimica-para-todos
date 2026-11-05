import { describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ENTITIES, cellToText, exportPack, importPack, parseCsv, textToCell, toCsv } from './pack-csv'
import { PUBLIC } from './packs'

describe('plantillas CSV', () => {
  it('celdas: ida y vuelta de cada tipo', () => {
    for (const v of [null, true, false, 0, 12, -3.5, 'texto', '', 'true', '123', '[no json', "'con apóstrofo", { a: [1, 'b'] }, ['x']]) {
      expect(textToCell(cellToText(v))).toEqual(v)
    }
    expect(parseCsv(toCsv([['a', 'b'], ['1,2', 'con "comillas"\ny salto']]))).toEqual([['a', 'b'], ['1,2', 'con "comillas"\ny salto']])
  })

  it('exportar el seed y reimportarlo da un paquete idéntico', () => {
    const csvDir = mkdtempSync(join(tmpdir(), 'csv-'))
    const packDir = mkdtempSync(join(tmpdir(), 'pack-'))
    const base = join(PUBLIC, 'content/packs/base')
    exportPack(base, csvDir)
    const r = importPack(csvDir, packDir)
    expect(r.errors).toEqual([])
    for (const e of ENTITIES) {
      expect(JSON.parse(readFileSync(join(packDir, e.json), 'utf8'))).toEqual(JSON.parse(readFileSync(join(base, e.json), 'utf8')))
    }
  })

  it('reporta errores por archivo, fila y columna', () => {
    const csvDir = mkdtempSync(join(tmpdir(), 'csv-'))
    const packDir = mkdtempSync(join(tmpdir(), 'pack-'))
    const { writeFileSync } = require('node:fs') as typeof import('node:fs')
    writeFileSync(join(csvDir, 'mundos.csv'), toCsv([['id', 'slug', 'title_key', 'description_key', 'icon_asset_id', 'order', 'status', 'unlock_rule', 'total_lessons', 'content_version', 'is_active'], ['bio_w1', 'bio', 'world.bio.title', 'world.bio.desc', '', 'uno', 'unlocked', '', '2', '1', 'true']]))
    const r = importPack(csvDir, packDir)
    expect(r.errors.length).toBeGreaterThan(0)
    expect(r.errors[0]).toMatchObject({ archivo: 'mundos.csv', fila: 2, columna: 'order' })
  })
})
