import type { ProgressRepository } from '../../ports'
import type { UserState } from '../../core/game/state'
import { USER_STATE_VERSION } from '../../core/game/state'
import { keyUserState } from '../../core/storageKeys'
import type { KeyValueStore } from '../../services/safeStorage'

/** Progreso en localStorage (vía KeyValueStore con respaldo en memoria). */
export class LocalProgressRepository implements ProgressRepository {
  constructor(private readonly store: KeyValueStore) {}

  async load(userId: string): Promise<UserState | null> {
    const raw = this.store.get(keyUserState(userId))
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as UserState
      if (parsed?.version !== USER_STATE_VERSION || parsed.user?.id !== userId) return null
      return parsed
    } catch {
      return null
    }
  }

  async save(userId: string, state: UserState): Promise<void> {
    this.store.set(keyUserState(userId), JSON.stringify(state))
  }

  async clear(userId: string): Promise<void> {
    this.store.remove(keyUserState(userId))
  }
}
