import { useCallback } from 'react'
import { useContentStore } from '../stores/contentStore'
import type { TParams } from './localization'

/** t(key, params) del locale activo. */
export function useT() {
  const i18n = useContentStore((s) => s.i18n)
  return useCallback((key: string | null | undefined, params?: TParams) => (key && i18n ? i18n.t(key, params) : ''), [i18n])
}
