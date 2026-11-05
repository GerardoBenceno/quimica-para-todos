export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error })

export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`NotImplemented: ${what}`)
    this.name = 'NotImplementedError'
  }
}
