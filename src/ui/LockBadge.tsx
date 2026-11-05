import { servicesOrNull } from '../app/services'
import { useT } from '../services/i18nHooks'
import { LockIcon } from './icons'

/**
 * Se muestra solo si payments es true y el scope no es de acceso libre para
 * el usuario. La UI pregunta solo hasAccess (la única pregunta sobre acceso).
 */
export function LockBadge({ scopeId }: { scopeId: string }) {
  const t = useT()
  const s = servicesOrNull()
  if (!s || !s.flags.payments) return null
  if (s.entitlements.hasAccess(scopeId)) return null
  return (
    <span className="lock-badge">
      <LockIcon size={14} />
      {t('access.premium')}
    </span>
  )
}
