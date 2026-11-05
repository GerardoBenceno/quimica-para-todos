/** Marca: cadena en zigzag con un vértice en curso, como la ruta. */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={(size * 3) / 4} viewBox="0 0 32 24" aria-hidden="true">
      <polyline points="3,18 11,8 19,18 27,8" fill="none" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="27" cy="8" r="3.4" />
    </svg>
  )
}
