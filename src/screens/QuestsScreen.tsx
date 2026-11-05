import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useBundle } from '../stores/contentStore'
import { useUserState } from '../stores/progressStore'
import { useCompleted, useGameValues, useProgressView, useStreak } from '../stores/selectors'
import { chestNodes } from '../core/game/rewards'
import { freezeReward } from '../core/game/config'
import { activeWorlds } from '../core/game/structure'
import { openChest, purchaseFreeze } from '../stores/actions'
import { useT } from '../services/i18nHooks'
import { routes } from '../app/routes'
import { AppShell } from '../ui/AppShell'
import { ChestIcon } from '../ui/icons'
import { StreakDots } from '../ui/StreakDots'

/** Recompensas: cofres de las rutas, racha y tienda (congelar racha). */
export function QuestsScreen() {
  const t = useT()
  const b = useBundle()
  const s = useUserState()
  const g = useGameValues()
  const view = useProgressView()
  const completed = useCompleted()
  const streak = useStreak()
  const [msg, setMsg] = useState<string | null>(null)
  const freeze = freezeReward(b)

  const chests = activeWorlds(b)
    .filter((w) => view.worlds[w.id] && !['locked', 'coming_soon'].includes(view.worlds[w.id].status))
    .flatMap((w) => chestNodes(b, w.id, s, completed).map((c) => ({ ...c, world: w })))
  const ready = chests.filter((c) => c.status === 'ready')
  const next = chests.find((c) => c.status === 'locked')

  const buy = () => {
    const ok = purchaseFreeze(b, g)
    setMsg(t(ok ? 'shop.bought' : 'shop.not_enough'))
  }

  return (
    <AppShell>
      <main id="main" className="narrow page">
        <h1 className="t-28">{t('quests.title')}</h1>

        <section className="section" aria-labelledby="q-streak">
          <h2 id="q-streak" className="t-18">
            {t('quests.streak_title')}
          </h2>
          <p className="streak-line">
            <StreakDots count={streak} />
            <span>{t('quests.streak_now', { n: streak })}</span>
          </p>
          <p className="muted t-14">{t('quests.streak_rule')}</p>
        </section>

        <section className="section" aria-labelledby="q-chests">
          <h2 id="q-chests" className="t-18">
            {t('quests.chests_title')}
          </h2>
          {ready.length === 0 && <p className="muted">{next ? t('quests.next_chest', { n: next.afterIndex, world: t(next.world.title_key) }) : t('quests.no_chests')}</p>}
          <ul className="reward-list">
            {ready.map((c) => (
              <li key={c.id} className="panel reward-row">
                <span className="chest ready" aria-hidden="true">
                  <ChestIcon />
                </span>
                <span className="reward-text">
                  <strong>{t(c.reward.title_key)}</strong>
                  <span className="muted t-14">{t('quests.chest_from', { world: t(c.world.title_key), n: c.afterIndex })}</span>
                </span>
                <button type="button" className="btn btn-secondary" onClick={() => (openChest(c), setMsg(t('quests.chest_opened', { n: c.reward.value })))}>
                  {t('quests.open_chest', { n: c.reward.value })}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {freeze && (
          <section className="section" aria-labelledby="q-shop">
            <h2 id="q-shop" className="t-18">
              {t('shop.title')}
            </h2>
            <div className="panel reward-row">
              <span className="reward-text">
                <strong>{t(freeze.title_key)}</strong>
                <span className="muted t-14">{t('shop.freeze_desc', { max: g.freezeMaxPerWeek })}</span>
                <span className="t-14">{t('shop.freeze_owned', { n: s.streak.freezes_available })}</span>
              </span>
              <button type="button" className="btn btn-primary" onClick={buy} disabled={s.user.coins < g.freezeCost}>
                {t('shop.buy_for', { n: g.freezeCost })}
              </button>
            </div>
            {s.user.coins < g.freezeCost && <p className="muted t-14">{t('shop.balance', { n: s.user.coins })}</p>}
          </section>
        )}
        {msg && (
          <p role="status" className="panel status-box">
            {msg}
          </p>
        )}
        <Link className="link" to={routes.worlds()}>
          {t('quests.back_learn')}
        </Link>
      </main>
    </AppShell>
  )
}
