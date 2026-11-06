import { APP_DISPLAY_NAME } from '../app/brand'

const BRAND = `${import.meta.env.BASE_URL}brand/`

/**
 * Marca chica: el símbolo del logo (el matraz dentro de la Q), para el
 * encabezado y las pantallas de carga. Va junto al nombre escrito, así que es
 * decorativa. `size` es el alto en px; el ancho sigue la proporción del
 * símbolo (object-fit: contain, sin deformarlo si cambia el original).
 * Las imágenes las genera scripts/gen-brand.ts desde arte/logo-simbolo.png.
 */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <img
      className="brand-mark"
      src={`${BRAND}logo-mark-64.png`}
      srcSet={`${BRAND}logo-mark-128.png 2x`}
      width={Math.round(size * 0.78)}
      height={size}
      alt=""
      aria-hidden="true"
      decoding="async"
    />
  )
}

/**
 * Logo completo (símbolo y nombre) para la bienvenida y Acerca de. Lleva el
 * nombre de la app como texto alternativo porque sustituye al nombre escrito.
 * Lo genera scripts/gen-brand.ts desde arte/logo.png.
 */
export function BrandLogo({ height = 132 }: { height?: number }) {
  return (
    <img
      className="brand-logo"
      src={`${BRAND}logo-300.png`}
      width={Math.round(height * (256 / 300))}
      height={height}
      alt={APP_DISPLAY_NAME}
      decoding="async"
    />
  )
}
