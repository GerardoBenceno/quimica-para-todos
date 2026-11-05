// Genera public/content/packs/web/exercises.json y translations_es.json a partir
// del seed, sin inventar química: solo reutiliza pares nombre-estructura que ya
// existen en el seed.
//
//  - draw_structure: de cada ejercicio de nomenclatura del seed cuyo nombre
//    correcto y su payload.structure_smiles ya están emparejados.
//  - choose_structure: variante de cada draw_structure para pantallas angostas,
//    solo si hay al menos dos distractores que también son pares del seed.
//  - view_3d: ejercicios del seed que ya traen structure_smiles o smiles de
//    hibridación o geometría; agrega el visor 3D sin cambiar la respuesta.
//
// Uso: npx tsx scripts/derive-web-pack.ts   (después, npm run validate)
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Exercise, Translation } from '../src/models'
import { ROOT } from './packs'

const seedEx = JSON.parse(readFileSync(join(ROOT, 'seed/exercises.json'), 'utf8')) as Exercise[]
const seedTr = JSON.parse(readFileSync(join(ROOT, 'seed/translations_es.json'), 'utf8')) as Translation[]
const tr = new Map(seedTr.map((t) => [t.key, t.value]))
const molIndex = JSON.parse(readFileSync(join(ROOT, 'public/mol/index.json'), 'utf8')) as Record<string, { heavy_atoms: number; sdf: string | null }>

const out: Exercise[] = []
const translations: Translation[] = []
const addTr = (key: string, value: string) => translations.push({ key, locale: 'es', value, content_version: 1 })

// --- Pares nombre-estructura del seed ---------------------------------------
interface Pair {
  source: Exercise
  value: string
  nameKey: string
  name: string
  smiles: string
}
const pairs: Pair[] = []
for (const ex of seedEx) {
  if (!ex.is_active || !ex.topic.startsWith('nomenclatura')) continue
  const smiles = ex.payload.structure_smiles
  if (!smiles) continue
  if (ex.type === 'fill_blanks') {
    // El nombre se arma con la plantilla y las piezas correctas del banco.
    let name = ex.payload.template ?? ''
    for (const b of ex.payload.blanks ?? []) {
      const opt = (ex.payload.bank ?? []).find((o) => o.value === ex.correct[b])!
      name = name.replace(`{${b}}`, tr.get(opt.key)!)
    }
    const key = `ex.web_draw_${ex.id}.name`
    addTr(key, name)
    pairs.push({ source: ex, value: ex.id.replace(/^e_/, ''), nameKey: key, name, smiles })
  } else {
    const opt = (ex.payload.options ?? []).find((o) => o.value === ex.correct.value)
    if (!opt) continue
    pairs.push({ source: ex, value: opt.value, nameKey: opt.key, name: tr.get(opt.key)!, smiles })
  }
}

const base = (src: Exercise, id: string): Exercise => ({
  id,
  lesson_id: src.lesson_id,
  type: src.type,
  prompt_key: src.prompt_key,
  payload: {},
  correct: {},
  explanation_key: src.explanation_key,
  feedback_template_id: src.feedback_template_id,
  difficulty: src.difficulty,
  xp: src.xp,
  coins: src.coins,
  topic: src.topic,
  prerequisites: src.prerequisites,
  structure_asset_id: null,
  smiles: src.payload.structure_smiles ?? src.smiles,
  is_diagnostic: false,
  content_version: 1,
  is_active: true,
})

const report: string[] = []
const heavy = (s: string) => molIndex[s]?.heavy_atoms ?? 0

for (const p of pairs) {
  const drawId = `web_draw_${p.source.id}`
  const draw: Exercise = {
    ...base(p.source, drawId),
    type: 'draw_structure',
    prompt_key: `ex.${drawId}.prompt`,
    payload: { name_key: p.nameKey, source_exercise_id: p.source.id },
    correct: { smiles: p.smiles },
  }
  addTr(draw.prompt_key, `Dibuja la estructura: ${p.name}`)
  out.push(draw)
  report.push(`| ${drawId} | draw_structure | ${p.source.id} | ${p.name} | \`${p.smiles}\` | Mismo par nombre-estructura del seed; explicación y feedback del ejercicio de origen. |`)

  // Distractores: otros pares del seed con estructura distinta, los de tamaño más parecido.
  const others = pairs
    .filter((o) => o.smiles !== p.smiles)
    .sort((a, z) => Math.abs(heavy(a.smiles) - heavy(p.smiles)) - Math.abs(heavy(z.smiles) - heavy(p.smiles)) || a.value.localeCompare(z.value))
    .slice(0, 3)
  if (others.length < 2) {
    report.push(`| web_choose_${p.source.id} | choose_structure | ${p.source.id} | ${p.name} | no derivado | Menos de dos distractores con par en el seed. |`)
    continue
  }
  const chooseId = `web_choose_${p.source.id}`
  const choose: Exercise = {
    ...base(p.source, chooseId),
    type: 'choose_structure',
    prompt_key: `ex.${chooseId}.prompt`,
    payload: {
      name_key: p.nameKey,
      source_exercise_id: p.source.id,
      variant_of: drawId,
      options: [p, ...others].map((o) => ({ key: o.nameKey, value: o.value, smiles: o.smiles })),
    },
    correct: { value: p.value },
  }
  addTr(choose.prompt_key, `Elige la estructura: ${p.name}`)
  out.push(choose)
  report.push(
    `| ${chooseId} | choose_structure | ${p.source.id} | ${p.name} | \`${p.smiles}\` | Variante angosta de ${drawId}. Distractores (pares del seed): ${others.map((o) => `${o.name} \`${o.smiles}\``).join(', ')}. |`,
  )
}

// --- view_3d -----------------------------------------------------------------
const VIEW3D_TOPICS = /^hibridacion_/
for (const ex of seedEx) {
  if (!ex.is_active || !VIEW3D_TOPICS.test(ex.topic)) continue
  const smiles = ex.payload.structure_smiles ?? ex.smiles
  if (!smiles) continue
  // Si la respuesta es una molécula (opciones como "Metano (CH₄)"), mostrarla en 3D la revelaría.
  const correctOpt = (ex.payload.options ?? []).find((o) => o.value === ex.correct.value)
  if (correctOpt && /\([A-Z][^)]*\)/.test(tr.get(correctOpt.key) ?? '')) {
    report.push(`| web_v3d_${ex.id} | view_3d | ${ex.id} | ${tr.get(ex.prompt_key)} | \`${smiles}\` | No derivado: la respuesta es la propia molécula y el visor la revelaría. |`)
    continue
  }
  if (!molIndex[smiles]?.sdf) {
    report.push(`| web_v3d_${ex.id} | view_3d | ${ex.id} | | \`${smiles}\` | No derivado: la molécula no tiene 3D. |`)
    continue
  }
  const id = `web_v3d_${ex.id}`
  out.push({
    ...base(ex, id),
    type: 'view_3d',
    prompt_key: ex.prompt_key,
    payload: { ...ex.payload, structure_smiles: smiles, source_exercise_id: ex.id, base_type: ex.type },
    correct: { ...ex.correct },
  })
  report.push(`| ${id} | view_3d | ${ex.id} | ${tr.get(ex.prompt_key)} | \`${smiles}\` | Mismo enunciado, opciones y respuesta; agrega el visor 3D rotable. |`)
}

writeFileSync(join(ROOT, 'public/content/packs/web/exercises.json'), JSON.stringify(out, null, 2) + '\n')
writeFileSync(join(ROOT, 'public/content/packs/web/translations_es.json'), JSON.stringify(translations, null, 2) + '\n')
writeFileSync(join(ROOT, 'reports/derivados.md'), ['| Id | Tipo | Origen | Nombre / enunciado | SMILES | Nota |', '|---|---|---|---|---|---|', ...report].join('\n') + '\n')
console.log(`web: ${out.length} ejercicios derivados, ${translations.length} textos`)
