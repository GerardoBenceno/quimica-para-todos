/** Generador determinista (mulberry32) a partir de una semilla de texto. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates sobre una copia. */
export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Tipos cuyas opciones (o banco) se barajan al iniciar cada intento. */
export const SHUFFLED_TYPES = new Set(['multiple_choice', 'identify_group', 'chat_complete', 'diagnostic', 'fill_blanks', 'choose_structure', 'compare_structures'])

/**
 * Orden de presentación de un ejercicio dentro de un intento. La semilla es
 * (intento, ejercicio): el orden cambia entre intentos y se conserva dentro
 * de uno. true_false conserva su orden. La validación siempre es por value.
 */
export function presentationOrder<T>(type: string, items: readonly T[], attemptId: string, exerciseId: string): T[] {
  if (!SHUFFLED_TYPES.has(type)) return items.slice()
  return shuffle(items, seededRandom(`${attemptId}:${exerciseId}`))
}

export const LETTERS = 'abcdefghijklmnopqrstuvwxyz'
