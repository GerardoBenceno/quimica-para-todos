import { create } from 'zustand'
import { initialUserState, type UserState } from '../core/game/state'
import { servicesOrNull } from '../app/services'

interface ProgressStore {
  state: UserState | null
  persistent: boolean
  init(state: UserState, persistent: boolean): void
  /** Aplica una transformación pura y guarda el resultado bajo el userId. */
  update(fn: (s: UserState) => UserState): UserState
  reset(locale: string): Promise<void>
}

export const useProgressStore = create<ProgressStore>((set, get) => ({
  state: null,
  persistent: true,
  init: (state, persistent) => set({ state, persistent }),
  update: (fn) => {
    const cur = get().state
    if (!cur) throw new Error('Progreso sin inicializar')
    const next = fn(cur)
    if (next !== cur) {
      next.user.updated_at = new Date().toISOString()
      set({ state: next })
      void servicesOrNull()?.progress.save(next.user.id, next)
    }
    return next
  },
  reset: async (locale) => {
    const cur = get().state
    if (!cur) return
    const s = servicesOrNull()
    await s?.progress.clear(cur.user.id)
    const fresh = initialUserState(cur.user.id, cur.user.is_anonymous, new Date(), locale)
    set({ state: fresh })
    await s?.progress.save(fresh.user.id, fresh)
  },
}))

export function useUserState(): UserState {
  const s = useProgressStore((x) => x.state)
  if (!s) throw new Error('Progreso no cargado')
  return s
}
