// Copia los motores que se sirven como archivos estáticos (no se empaquetan):
// RDKit.js (glue JS + .wasm) a public/vendor/rdkit/. Se sirven desde la base
// de la app y quedan fuera del precache (se cachean en runtime al primer uso).
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { createRequire } from 'node:module'

const root = resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
const rdkitDir = dirname(require.resolve('@rdkit/rdkit'))
const out = join(root, 'public/vendor/rdkit')
mkdirSync(out, { recursive: true })
for (const f of ['RDKit_minimal.js', 'RDKit_minimal.wasm']) copyFileSync(join(rdkitDir, f), join(out, f))
console.log('vendor: RDKit_minimal.js y .wasm copiados')
