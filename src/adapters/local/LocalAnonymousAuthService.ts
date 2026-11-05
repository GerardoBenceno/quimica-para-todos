import type { AuthService, AuthUser } from '../../ports'
import { uuid } from '../../core/ids'
import { KEY_USER_ID } from '../../core/storageKeys'
import type { KeyValueStore } from '../../services/safeStorage'

/** Usuario anónimo local: un UUID que se crea una vez y se reutiliza. */
export class LocalAnonymousAuthService implements AuthService {
  constructor(private readonly store: KeyValueStore) {}

  async currentUser(): Promise<AuthUser> {
    let id = this.store.get(KEY_USER_ID)
    if (!id) {
      id = uuid()
      this.store.set(KEY_USER_ID, id)
    }
    return { id, isAnonymous: true }
  }
}
