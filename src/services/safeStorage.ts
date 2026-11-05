/**
 * Envoltura de localStorage: cada acceso va en try/catch y, si el navegador lo
 * bloquea (modo privado, cuota llena, previsualización), cae a un mapa en memoria.
 */
export interface KeyValueStore {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
  readonly persistent: boolean
}

export class MemoryStore implements KeyValueStore {
  readonly persistent: boolean = false
  private map = new Map<string, string>()
  get(key: string) {
    return this.map.get(key) ?? null
  }
  set(key: string, value: string) {
    this.map.set(key, value)
  }
  remove(key: string) {
    this.map.delete(key)
  }
}

export class SafeLocalStore implements KeyValueStore {
  private memory = new MemoryStore()
  private failed = false

  get persistent() {
    return !this.failed
  }

  private ls(): Storage | null {
    if (this.failed) return null
    try {
      const s = globalThis.localStorage
      return s ?? null
    } catch {
      this.failed = true
      return null
    }
  }

  get(key: string): string | null {
    const s = this.ls()
    if (s) {
      try {
        return s.getItem(key)
      } catch {
        this.failed = true
      }
    }
    return this.memory.get(key)
  }

  set(key: string, value: string) {
    this.memory.set(key, value)
    const s = this.ls()
    if (!s) return
    try {
      s.setItem(key, value)
    } catch {
      this.failed = true
    }
  }

  remove(key: string) {
    this.memory.remove(key)
    const s = this.ls()
    if (!s) return
    try {
      s.removeItem(key)
    } catch {
      this.failed = true
    }
  }
}
