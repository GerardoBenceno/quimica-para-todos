// Stubs del backend futuro (Supabase). Implementan las interfaces y lanzan
// NotImplemented. Solo se importan con import() dinámico cuando el flag
// correspondiente está encendido, así que no entran al bundle actual.
// Referencia del modelo: supabase_schema.sql. Variables: .env.example.
import type {
  AuthService,
  AuthUser,
  ContentRepository,
  EntitlementsService,
  ProgressRepository,
} from '../../ports'
import type { AccessLevel } from '../../models'
import type { UserState } from '../../core/game/state'
import { NotImplementedError } from '../../core/result'

export interface SupabaseEnv {
  url: string
  anonKey: string
}

export function readSupabaseEnv(): SupabaseEnv {
  return {
    url: import.meta.env.VITE_SUPABASE_URL ?? '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  }
}

export class SupabaseContentRepository implements ContentRepository {
  constructor(readonly env: SupabaseEnv) {}
  async load(): Promise<never> {
    throw new NotImplementedError('SupabaseContentRepository.load')
  }
}

/** Sync local-first: leerá local, empujará cambios diferidos y migrará el progreso anónimo. */
export class SupabaseProgressRepository implements ProgressRepository {
  constructor(
    readonly env: SupabaseEnv,
    readonly local: ProgressRepository,
  ) {}
  async load(_userId: string): Promise<UserState | null> {
    throw new NotImplementedError('SupabaseProgressRepository.load')
  }
  async save(_userId: string, _state: UserState): Promise<void> {
    throw new NotImplementedError('SupabaseProgressRepository.save')
  }
  async clear(_userId: string): Promise<void> {
    throw new NotImplementedError('SupabaseProgressRepository.clear')
  }
}

/** Auth anónima de Supabase con vinculación opcional de cuenta. */
export class SupabaseAuthService implements AuthService {
  constructor(readonly env: SupabaseEnv) {}
  async currentUser(): Promise<AuthUser> {
    throw new NotImplementedError('SupabaseAuthService.currentUser')
  }
  async linkAccount(): Promise<AuthUser> {
    throw new NotImplementedError('SupabaseAuthService.linkAccount')
  }
}

/**
 * Planes pagados. El acceso se decidirá en servidor (webhook o Edge Function);
 * el cliente solo lee el resultado, nunca lo decide.
 */
export class ServerEntitlementsService implements EntitlementsService {
  constructor(readonly env: SupabaseEnv) {}
  accessOf(_scopeId: string): AccessLevel {
    throw new NotImplementedError('ServerEntitlementsService.accessOf')
  }
  hasAccess(_scopeId: string): boolean {
    throw new NotImplementedError('ServerEntitlementsService.hasAccess')
  }
}
