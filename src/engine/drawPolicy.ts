/**
 * ¿El editor de estructuras es usable en pantallas angostas? Se decide en el
 * hito 4 tras probar Ketcher a 360 px (ver DECISIONES.md). Mientras no haya
 * editor registrado, la respuesta no importa: no hay draw_structure.
 */
export function drawUsableOnNarrow(): boolean {
  return false
}
