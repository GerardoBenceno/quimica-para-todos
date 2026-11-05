import type { Translation } from '../models'

export type TParams = Record<string, string | number>

/**
 * Resuelve textos por (key, locale). Las claves de contenido vienen de los
 * paquetes; las de UI, de public/config/i18n/ui_<locale>.json.
 * Interpolación con {nombre}. Plural simple: "uno|otros" con {n}.
 */
export class LocalizationService {
  private table = new Map<string, string>()
  private warned = new Set<string>()
  private ui = new Set<string>()

  constructor(readonly locale: string) {}

  addContent(entries: Translation[]) {
    for (const t of entries) {
      if (t.locale !== this.locale) continue
      if (this.ui.has(t.key)) throw new Error(`Clave de UI "${t.key}" choca con una clave de contenido`)
      this.table.set(t.key, t.value)
    }
  }

  /** En cualquier orden de carga, una clave de UI que choque con una de contenido es error. */
  addUi(strings: Record<string, string>) {
    for (const [k, v] of Object.entries(strings)) {
      if (this.table.has(k) && !this.ui.has(k)) throw new Error(`Clave de UI "${k}" choca con una clave de contenido`)
      this.ui.add(k)
      this.table.set(k, v)
    }
  }

  has(key: string): boolean {
    return this.table.has(key)
  }

  t(key: string, params?: TParams): string {
    const raw = this.table.get(key)
    if (raw === undefined) {
      if (!this.warned.has(key)) {
        this.warned.add(key)
        console.warn(`[i18n] falta la clave "${key}" (${this.locale})`)
      }
      return key
    }
    let text = raw
    if (params && 'n' in params && text.includes('|')) {
      const [one, other] = text.split('|')
      text = Number(params.n) === 1 ? one : other
    }
    return params ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m)) : text
  }
}
