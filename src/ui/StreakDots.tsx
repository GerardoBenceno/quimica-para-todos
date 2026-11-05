/** Racha como fila de cuadros: los días cumplidos en amarillo de cromo. */
export function StreakDots({ count, max = 7 }: { count: number; max?: number }) {
  const filled = Math.min(count, max)
  return (
    <span className="streak-dots" aria-hidden="true">
      {Array.from({ length: Math.max(max, filled) }, (_, i) => (
        <span key={i} className={i < filled ? 'on' : ''} />
      ))}
    </span>
  )
}
