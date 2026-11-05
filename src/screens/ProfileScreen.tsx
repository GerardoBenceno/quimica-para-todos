import { useState } from 'react'
import { servicesOrNull } from '../app/services'
import { useBundle, useContentStore } from '../stores/contentStore'
import { useProgressStore, useUserState } from '../stores/progressStore'
import { useProgressView, useStreak } from '../stores/selectors'
import { applyTheme } from '../services/theme'
import { useT } from '../services/i18nHooks'
import { AppShell } from '../ui/AppShell'
import { ChemText } from '../ui/ChemText'

/** Perfil con agregados, tema y reinicio del progreso local. */
export function ProfileScreen() {
  const t = useT()
  const b = useBundle()
  const s = useUserState()
  const view = useProgressView()
  const streak = useStreak()
  const ui = useContentStore((x) => x.ui)
  const current = useContentStore((x) => x.theme)
  const setTheme = useContentStore((x) => x.setTheme)
  const update = useProgressStore((x) => x.update)
  const reset = useProgressStore((x) => x.reset)
  const persistent = useProgressStore((x) => x.persistent)
  const [confirming, setConfirming] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  const worldsDone = Object.values(view.worlds).filter((w) => w.status === 'completed').length
  const solved = new Set(s.exercise_attempts.filter((a) => a.is_correct).map((a) => a.exercise_id)).size
  const lastDiag = s.diagnostic_results[s.diagnostic_results.length - 1]
  const recommended = b.worlds.find((w) => w.id === s.user.recommended_world_id)
  const themes = b.themes.filter((th) => th.is_active && th.mode)
  const flags = servicesOrNull()?.flags

  const chooseTheme = (id: string) => {
    const th = b.themes.find((x) => x.id === id)
    if (!th) return
    applyTheme(th)
    setTheme(th)
    update((st) => ({ ...st, user: { ...st.user, theme_id: id } }))
  }

  const rows: [string, string][] = [
    ['profile.xp_total', s.user.xp_total.toLocaleString('es')],
    ['profile.streak_current', t('profile.days', { n: streak })],
    ['profile.streak_longest', t('profile.days', { n: s.user.longest_streak })],
    ['profile.worlds_completed', t('profile.of', { n: worldsDone, m: Object.values(view.worlds).filter((w) => w.status !== 'coming_soon').length })],
    ['profile.exercises_solved', String(solved)],
    ['profile.coins', s.user.coins.toLocaleString('es')],
  ]

  return (
    <AppShell>
      <main id="main" className="narrow page">
        <h1 className="t-28">{t('profile.title')}</h1>
        <ul className="data-list panel">
          {rows.map(([k, v]) => (
            <li key={k}>
              <span>{t(k)}</span>
              <strong className="num">{v}</strong>
            </li>
          ))}
        </ul>
        {lastDiag && (
          <p className="muted">
            <ChemText text={t('profile.diagnostic', { score: lastDiag.score, world: recommended ? t(recommended.title_key) : '' })} />
          </p>
        )}

        {themes.length > 1 && (
          <fieldset className="section theme-picker">
            <legend className="t-18">{t('profile.theme')}</legend>
            {themes.map((th) => (
              <label key={th.id} className="radio-row">
                <input type="radio" name="theme" value={th.id} checked={(current?.id ?? ui?.theme) === th.id} onChange={() => chooseTheme(th.id)} />
                {t(`profile.theme_${th.mode}`)}
              </label>
            ))}
          </fieldset>
        )}

        {flags?.auth && (
          <section className="section" aria-labelledby="cloud">
            <h2 id="cloud" className="t-18">
              {t('profile.cloud_title')}
            </h2>
            <button type="button" className="btn btn-secondary" onClick={() => void servicesOrNull()?.auth.linkAccount?.()}>
              {t('profile.cloud_save')}
            </button>
          </section>
        )}

        <section className="section" aria-labelledby="local-data">
          <h2 id="local-data" className="t-18">
            {t('profile.data_title')}
          </h2>
          <p className="muted t-14">{t(persistent ? 'profile.data_local' : 'profile.data_memory')}</p>
          {!confirming ? (
            <button type="button" className="btn btn-secondary" onClick={() => setConfirming(true)}>
              {t('profile.reset')}
            </button>
          ) : (
            <div className="confirm" role="group" aria-label={t('profile.reset_confirm')}>
              <p>{t('profile.reset_confirm')}</p>
              <div className="confirm-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    await reset(ui?.locale ?? 'es')
                    setConfirming(false)
                    setResetDone(true)
                  }}
                >
                  {t('profile.reset_yes')}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)}>
                  {t('profile.reset_no')}
                </button>
              </div>
            </div>
          )}
          {resetDone && <p role="status">{t('profile.reset_done')}</p>}
        </section>
      </main>
    </AppShell>
  )
}
