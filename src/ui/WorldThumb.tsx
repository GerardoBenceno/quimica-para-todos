import { useEffect, useState } from 'react'
import { servicesOrNull } from '../app/services'
import { useBundle } from '../stores/contentStore'
import { lessonsOfWorld } from '../core/game/structure'
import { MoleculeView } from './MoleculeView'

/**
 * Miniatura molecular de un mundo: el SMILES con más átomos pesados entre los
 * ejercicios del propio mundo (empate: el primero en orden de ruta).
 */
export function WorldThumb({ worldId, label }: { worldId: string; label: string }) {
  const b = useBundle()
  const [smiles, setSmiles] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    let alive = true
    const lessons = new Set(lessonsOfWorld(b, worldId).map((l) => l.id))
    const candidates: string[] = []
    for (const e of b.exercises) {
      if (!e.is_active || !e.lesson_id || !lessons.has(e.lesson_id)) continue
      for (const s of [e.payload.structure_smiles, e.smiles]) if (typeof s === 'string' && s && !candidates.includes(s)) candidates.push(s)
    }
    const mol = servicesOrNull()?.molecules
    if (!mol || candidates.length === 0) {
      setSmiles(null)
      return
    }
    void Promise.all(candidates.map((c) => mol.entry(c))).then((entries) => {
      let best: string | null = null
      let size = -1
      entries.forEach((e, i) => {
        if (e && e.heavy_atoms > size) {
          size = e.heavy_atoms
          best = candidates[i]
        }
      })
      if (alive) setSmiles(best)
    })
    return () => {
      alive = false
    }
  }, [b, worldId])
  if (!smiles) return <span className="thumb thumb-empty" aria-hidden="true" />
  return (
    <span className="thumb" aria-hidden="true">
      <MoleculeView smiles={smiles} variant="thumb" label={label} />
    </span>
  )
}
