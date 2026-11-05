import type { ReactNode } from 'react'

/** Geometría de la cadena: enlaces a ±30° de la vertical, ángulo de 120° en cada vértice. */
export const PATH = {
  stepY: 132,
  dx: 76, // stepY * tan(30°)
  top: 64,
  right: 200,
  r: 24,
  chestOffset: 72,
  chestSize: 36,
}

export const vertexX = (i: number) => (i % 2 === 0 ? PATH.right : PATH.right - PATH.dx)
export const vertexY = (i: number) => PATH.top + i * PATH.stepY

/** Variante horizontal (pantalla de resultado): mismo ángulo de 120°. */
export const MINI = { stepX: 84, dy: 48, left: 40, top: 32 }
export const miniX = (i: number) => MINI.left + i * MINI.stepX
export const miniY = (i: number, n: number) => MINI.top + ((n - 1 - i) % 2 === 0 ? 0 : MINI.dy)

export type VertexState = 'completed' | 'current' | 'locked'

export interface ChainLink {
  from: number
  to: number
  /** solid: tinta; dashed: pendiente; drawn: se dibuja (animación al completar). */
  style: 'solid' | 'dashed' | 'drawn'
}

/** SVG de enlaces de la ruta (vértices y cofres se ponen encima como HTML). */
export function ChainLinks({
  links,
  chests,
  height,
  x = vertexX,
  y = vertexY,
}: {
  links: ChainLink[]
  chests: { index: number; solid: boolean }[]
  height: number
  x?: (i: number) => number
  y?: (i: number) => number
}) {
  return (
    <svg className="chain-svg" width="100%" height={height} aria-hidden="true">
      {links.map((l) => (
        <line
          key={`${l.from}-${l.to}`}
          x1={x(l.from)}
          y1={y(l.from)}
          x2={x(l.to)}
          y2={y(l.to)}
          className={`chain-link ${l.style}`}
          pathLength={l.style === 'drawn' ? 1 : undefined}
        />
      ))}
      {chests.map((c) => (
        <line
          key={`c${c.index}`}
          x1={vertexX(c.index) - PATH.chestOffset + PATH.chestSize / 2}
          y1={vertexY(c.index)}
          x2={vertexX(c.index)}
          y2={vertexY(c.index)}
          className={`chain-link ${c.solid ? 'solid' : 'dashed'}`}
        />
      ))}
    </svg>
  )
}

export function VertexMark({ state, n }: { state: VertexState; n: number }): ReactNode {
  if (state === 'completed')
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <polyline points="4,10.5 8.5,15 16,5.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  if (state === 'current') return <span aria-hidden="true">{n}</span>
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="4.5" y="9" width="11" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 9 V6.5 a3 3 0 0 1 6 0 V9" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}
