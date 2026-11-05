/**
 * Los SVG se incrustan en el DOM (no con <img>) para que currentColor y las
 * variables CSS del tema lleguen a la estructura. Aunque son archivos propios
 * del build, se rechaza cualquiera con script, foreignObject, atributos on*,
 * enlaces javascript: o referencias externas.
 */
const FORBIDDEN = [
  /<script[\s>]/i,
  /<foreignObject[\s>]/i,
  /\son[a-z]+\s*=/i,
  /javascript:/i,
  /<iframe[\s>]/i,
  /<embed[\s>]/i,
  /<object[\s>]/i,
  /(?:href|src)\s*=\s*["']\s*(?:https?:|\/\/|data:)/i,
]

export function isSafeSvg(text: string): boolean {
  if (!/^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(text)) return false
  return !FORBIDDEN.some((re) => re.test(text))
}

export function sanitizeSvg(text: string): string | null {
  if (!isSafeSvg(text)) return null
  // Quita la declaración XML para poder insertarlo dentro del HTML.
  return text.replace(/^\s*<\?xml[^>]*>\s*/i, '')
}
