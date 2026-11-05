import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { APP_DISPLAY_NAME } from '../app/brand'
import { routes } from '../app/routes'
import { useT } from '../services/i18nHooks'
import { useUserState } from '../stores/progressStore'
import { useOnline, useStreak } from '../stores/selectors'
import { BrandMark } from './BrandMark'
import { StreakDots } from './StreakDots'
import { CoinIcon, LearnIcon, ProfileIcon, ReviewIcon, RewardsIcon } from './icons'

const NAV = [
  { to: routes.worlds(), key: 'nav.learn', short: 'nav.learn', Icon: LearnIcon },
  { to: routes.practice(), key: 'nav.review', short: 'nav.review_short', Icon: ReviewIcon },
  { to: routes.quests(), key: 'nav.rewards', short: 'nav.rewards', Icon: RewardsIcon },
  { to: routes.profile(), key: 'nav.profile', short: 'nav.profile', Icon: ProfileIcon },
]

export function StatsBar() {
  const t = useT()
  const s = useUserState()
  const streak = useStreak()
  return (
    <div className="stats">
      <span className="stat">
        <StreakDots count={streak} />
        <span>
          <strong className="num">{t('stats.streak_days', { n: streak })}</strong> {t('stats.streak_suffix', { n: streak })}
        </span>
      </span>
      <span className="stat">
        <strong className="num">{s.user.xp_total.toLocaleString('es')}</strong> {t('stats.xp')}
      </span>
      <span className="stat">
        <CoinIcon />
        <strong className="num">{s.user.coins.toLocaleString('es')}</strong> {t('stats.coins')}
      </span>
    </div>
  )
}

/** Marco de las pantallas principales: encabezado, navegación y barra inferior en celular. */
export function AppShell({ children, hideHeaderOnNarrow = false }: { children: ReactNode; hideHeaderOnNarrow?: boolean }) {
  const t = useT()
  const online = useOnline()
  return (
    <div className="shell with-tabbar">
      <a className="skip-link" href="#main">
        {t('app.skip_to_content')}
      </a>
      {!online && (
        <div className="offline-banner" role="status">
          {t('offline.notice')}
        </div>
      )}
      <header className={`app-header ${hideHeaderOnNarrow ? 'hide-narrow' : ''}`}>
        <div className="container app-header-inner">
          <Link to={routes.worlds()} className="brand">
            <BrandMark />
            {APP_DISPLAY_NAME}
          </Link>
          <nav aria-label={t('nav.main')} className="top-nav">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}>
                {t(n.key)}
              </NavLink>
            ))}
          </nav>
          <StatsBar />
        </div>
      </header>
      {children}
      <nav aria-label={t('nav.main')} className="tabbar">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
            <n.Icon />
            <span>{t(n.short)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
