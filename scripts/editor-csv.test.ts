import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { draftToCsv, validateDraft, type Draft } from '../src/core/content/exerciseCsv'
import { importPack } from './pack-csv'

const draft: Draft = {
  pack: 'autor',
  slug: 'prueba_1',
  lessonId: 'l_carbono_enlaces',
  type: 'multiple_choice',
  prompt: '¿Pregunta de prueba, con "comillas" y coma?',
  options: ['Opción 1', 'true', '123', 'Otra'],
  correct: 2,
  explanation: 'Explicación de prueba.',
  hint: 'Pista de prueba.',
  smiles: 'CCO',
}

describe('editor del autor: CSV', () => {
  it('valida campos', () => {
    expect(validateDraft(draft)).toEqual({})
    expect(validateDraft({ ...draft, prompt: '', pack: 'Mal-id' })).toMatchObject({ prompt: 'editor.err_prompt', pack: 'editor.err_pack' })
  })
  it('lo que descarga el editor lo importa el importador sin errores', () => {
    const csv = draftToCsv([draft, { ...draft, slug: 'vf', type: 'true_false', options: ['Verdadero', 'Falso'], correct: 0, hint: '', smiles: '' }])
    const dir = mkdtempSync(join(tmpdir(), 'editor-'))
    writeFileSync(join(dir, 'ejercicios.csv'), csv.ejercicios)
    writeFileSync(join(dir, 'traducciones.csv'), csv.traducciones)
    writeFileSync(join(dir, 'retroalimentacion.csv'), csv.retroalimentacion)
    const out = mkdtempSync(join(tmpdir(), 'editor-pack-'))
    const r = importPack(dir, out)
    expect(r.errors).toEqual([])
    expect(r.files.sort()).toEqual(['exercises.json', 'feedback_templates.json', 'translations_es.json'])
    const ex = JSON.parse(require('node:fs').readFileSync(join(out, 'exercises.json'), 'utf8')) as { id: string; correct: { value: string }; payload: { options: { value: string }[] } }[]
    expect(ex[0].id).toBe('autor_e_prueba_1')
    expect(ex[0].payload.options.map((o) => o.value)).toContain(ex[0].correct.value)
    const tr = JSON.parse(require('node:fs').readFileSync(join(out, 'translations_es.json'), 'utf8')) as { key: string; value: string }[]
    expect(tr.find((t) => t.key.endsWith('.opt.true'))?.value).toBe('true')
  })
})
