// Plantillas CSV por entidad (mundos, unidades, lecciones, ejercicios, ítems
// del diagnóstico, plantillas de retroalimentación y traducciones) que se
// llenan en Google Sheets o Excel y se convierten en un paquete de contenido,
// y la exportación inversa. Formato de celda (sin pérdida):
//   vacía -> null; "true"/"false" -> booleano; número -> número;
//   empieza con { o [ -> JSON (objetos y listas como payload o correct);
//   lo demás -> texto. Un texto que se confundiría con lo anterior se exporta
//   con un apóstrofo inicial ('123), que el importador quita (como en Excel).
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { z } from 'zod'
import { PACK_FILE_SCHEMAS } from '../src/core/schemas'

/** Entidad -> archivo CSV y archivo JSON del paquete. Las demás van en JSON tal cual. */
export const ENTITIES = [
  { csv: 'mundos.csv', json: 'worlds.json' },
  { csv: 'unidades.csv', json: 'units.json' },
  { csv: 'lecciones.csv', json: 'lessons.json' },
  { csv: 'ejercicios.csv', json: 'exercises.json' },
  { csv: 'diagnostico.csv', json: 'diagnostic.json' },
  { csv: 'retroalimentacion.csv', json: 'feedback_templates.json' },
  { csv: 'traducciones.csv', json: 'translations_es.json' },
] as const
const DIAG_SCORING = 'diagnostico_scoring.json'

type Row = Record<string, unknown>

// --- CSV ---------------------------------------------------------------
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = false
      } else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((x) => x !== ''))
}

const quote = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
export const toCsv = (rows: string[][]) => rows.map((r) => r.map(quote).join(',')).join('\r\n') + '\r\n'

// --- Celdas ------------------------------------------------------------
const NUMBER = /^-?\d+(\.\d+)?$/
export function cellToText(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean' || typeof v === 'number') return String(v)
  if (typeof v === 'string') return v === '' || v === 'true' || v === 'false' || NUMBER.test(v) || /^[[{']/.test(v) ? `'${v}` : v
  return JSON.stringify(v)
}
export function textToCell(s: string): unknown {
  if (s === '') return null
  if (s.startsWith("'")) return s.slice(1)
  if (s === 'true') return true
  if (s === 'false') return false
  if (NUMBER.test(s)) return Number(s)
  if (/^[[{]/.test(s)) return JSON.parse(s)
  return s
}

// --- Exportar ----------------------------------------------------------
export function rowsToTable(rows: Row[], columns?: string[]): string[][] {
  const cols = columns ?? [...new Set(rows.flatMap((r) => Object.keys(r)))]
  return [cols, ...rows.map((r) => cols.map((c) => cellToText(r[c])))]
}

/** Columnas en el orden del primer registro que las tiene (conserva el orden del seed). */
function columnsOf(rows: Row[]): string[] {
  const cols: string[] = []
  for (const r of rows) for (const k of Object.keys(r)) if (!cols.includes(k)) cols.push(k)
  return cols
}

export function exportPack(packDir: string, outDir: string): string[] {
  mkdirSync(outDir, { recursive: true })
  const written: string[] = []
  for (const e of ENTITIES) {
    const p = join(packDir, e.json)
    if (!existsSync(p)) continue
    const doc = JSON.parse(readFileSync(p, 'utf8')) as unknown
    const rows = (e.json === 'diagnostic.json' ? (doc as { items: Row[] }).items : (doc as Row[])) ?? []
    writeFileSync(join(outDir, e.csv), toCsv(rowsToTable(rows, columnsOf(rows))))
    written.push(e.csv)
    if (e.json === 'diagnostic.json' && (doc as { scoring?: unknown }).scoring) {
      writeFileSync(join(outDir, DIAG_SCORING), JSON.stringify((doc as { scoring: unknown }).scoring, null, 2) + '\n')
      written.push(DIAG_SCORING)
    }
  }
  return written
}

// --- Importar ----------------------------------------------------------
export interface ImportError {
  archivo: string
  fila: number | null
  columna: string | null
  mensaje: string
}

export function tableToRows(table: string[][], file: string, errors: ImportError[]): Row[] {
  const [header, ...body] = table
  if (!header) return []
  const rows: Row[] = []
  body.forEach((cells, i) => {
    const row: Row = {}
    header.forEach((col, j) => {
      if (!col) return
      const raw = cells[j] ?? ''
      try {
        const v = textToCell(raw)
        if (v !== null || raw === '') row[col] = v
      } catch {
        errors.push({ archivo: file, fila: i + 2, columna: col, mensaje: `no se pudo leer el JSON de la celda: ${raw.slice(0, 40)}` })
      }
    })
    // Una celda vacía es null solo si la columna existe; así null y ausente coinciden con el seed.
    rows.push(row)
  })
  return rows
}

const MESSAGES: Record<string, string> = {
  invalid_type: 'tipo inválido',
  invalid_value: 'valor fuera de los permitidos',
  too_small: 'valor demasiado pequeño o vacío',
  too_big: 'valor demasiado grande',
  unrecognized_keys: 'columna no reconocida',
  invalid_format: 'formato inválido',
}
function zodToErrors(file: string, err: z.ZodError, rowOffset: number, errors: ImportError[]) {
  for (const issue of err.issues) {
    const [row, col, ...rest] = issue.path
    const fila = typeof row === 'number' ? row + rowOffset : null
    const columna = col === undefined ? null : [String(col), ...rest.map(String)].join('.')
    const expected = 'expected' in issue && issue.expected ? ` (se esperaba ${String(issue.expected)})` : ''
    errors.push({ archivo: file, fila, columna, mensaje: `${MESSAGES[issue.code] ?? issue.code}${expected}: ${issue.message}` })
  }
}

/** Convierte una carpeta de CSV en los JSON de un paquete. Devuelve los errores (vacío si todo está bien). */
export function importPack(csvDir: string, packDir: string): { errors: ImportError[]; files: string[] } {
  const errors: ImportError[] = []
  const files: string[] = []
  const docs: Record<string, unknown> = {}
  for (const e of ENTITIES) {
    const p = join(csvDir, e.csv)
    if (!existsSync(p)) continue
    const rows = tableToRows(parseCsv(readFileSync(p, 'utf8')), e.csv, errors)
    let doc: unknown = rows
    if (e.json === 'diagnostic.json') {
      const sp = join(csvDir, DIAG_SCORING)
      doc = { items: rows, ...(existsSync(sp) ? { scoring: JSON.parse(readFileSync(sp, 'utf8')) } : {}) }
    }
    const schema = PACK_FILE_SCHEMAS[e.json]
    const parsed = schema.safeParse(doc)
    if (!parsed.success) {
      // En diagnostic.json las filas cuelgan de "items"; se quita ese nivel de la ruta.
      const err = e.json === 'diagnostic.json' ? { ...parsed.error, issues: parsed.error.issues.map((i) => ({ ...i, path: i.path[0] === 'items' ? i.path.slice(1) : i.path })) } : parsed.error
      zodToErrors(e.csv, err as z.ZodError, 2, errors)
    }
    docs[e.json] = doc
  }
  if (errors.length) return { errors, files }
  mkdirSync(packDir, { recursive: true })
  for (const [name, doc] of Object.entries(docs)) {
    writeFileSync(join(packDir, name), JSON.stringify(doc, null, 2) + '\n')
    files.push(name)
  }
  return { errors, files }
}

export const formatErrors = (errors: ImportError[]) =>
  errors.map((e) => `${e.archivo}${e.fila !== null ? `, fila ${e.fila}` : ''}${e.columna ? `, columna ${e.columna}` : ''}: ${e.mensaje}`).join('\n')

/** Carpetas de plantillas listas para importar (todas menos "ejemplo"). */
export const templateDirs = (root: string) => (existsSync(root) ? readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'ejemplo').map((d) => d.name) : [])
