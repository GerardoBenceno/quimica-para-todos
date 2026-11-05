import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { servicesOrNull } from '../app/services'
import { routes } from '../app/routes'
import { useBundle, useContentStore } from '../stores/contentStore'
import { useProgressStore, useUserState } from '../stores/progressStore'
import { useProgressView, useStreak } from '../stores/selectors'
import { canVibrate, usePrefsStore } from '../stores/prefsStore'
import { promptInstall, usePwaStore } from '../stores/pwaStore'
import { canPlaySound } from '../services/sound'
import { backupFileName, makeBackup, readBackup, type BackupError } from '../core/game/backup'
import { applyTheme } from '../services/theme'
import { useT } from '../services/i18nHooks'
import { AppShell } from '../ui/AppShell'
import { ChemText } from '../ui/ChemText'

/** Perfil con agregados, ajustes del dispositivo, respaldo y reinicio del progreso local. */
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
  const replace = useProgressStore((x) => x.replace)
  const persistent = useProgressStore((x) => x.persistent)
  const prefs = usePrefsStore((x) => x.prefs)
  const setPrefs = usePrefsStore((x) => x.set)
  const [confirming, setConfirming] = useState(false)
  const [pendingImport, setPendingImport] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const installEvent = usePwaStore((x) => x.install)
  const installed = usePwaStore((x) => x.installed)

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

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(makeBackup(s), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = backupFileName()
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage({ text: t('profile.export_done') })
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setPendingImport(await file.text())
    setMessage(null)
  }

  const importBackup = async () => {
    if (!pendingImport) return
    const r = readBackup(pendingImport, s.user.id)
    setPendingImport(null)
    if (fileInput.current) fileInput.current.value = ''
    if (!r.ok) {
      const key: Record<BackupError, string> = { not_json: 'profile.import_error_not_json', not_backup: 'profile.import_error_not_backup', version: 'profile.import_error_version' }
      setMessage({ text: t(key[r.error]), error: true })
      return
    }
    await replace(r.state)
    const th = r.state.user.theme_id ? b.themes.find((x) => x.id === r.state.user.theme_id) : null
    if (th) {
      applyTheme(th)
      setTheme(th)
    }
    setMessage({ text: t('profile.import_done') })
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

        <h2 className="t-22 settings-title">{t('profile.settings')}</h2>

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

        {canVibrate() && (
          <section className="section" aria-labelledby="vibration">
            <label className="radio-row" htmlFor="vibration-toggle">
              <input id="vibration-toggle" type="checkbox" checked={prefs.vibration} onChange={(e) => setPrefs({ vibration: e.target.checked })} />
              <span id="vibration">{t('profile.vibration')}</span>
            </label>
            <p className="muted t-14">{t('profile.vibration_help')}</p>
          </section>
        )}

        {canPlaySound() && (
          <section className="section" aria-labelledby="sound">
            <label className="radio-row" htmlFor="sound-toggle">
              <input id="sound-toggle" type="checkbox" checked={prefs.sound} onChange={(e) => setPrefs({ sound: e.target.checked })} />
              <span id="sound">{t('profile.sound')}</span>
            </label>
            <p className="muted t-14">{t('profile.sound_help')}</p>
          </section>
        )}

        {(installEvent || installed) && (
          <section className="section" aria-labelledby="install">
            <h3 id="install" className="t-18">
              {t('pwa.install_title')}
            </h3>
            <p className="muted t-14">{t('pwa.install_lead')}</p>
            {installed ? (
              <p role="status">{t('pwa.installed')}</p>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={() => void promptInstall()}>
                {t('pwa.install')}
              </button>
            )}
          </section>
        )}

        <section className="section" aria-labelledby="backup">
          <h3 id="backup" className="t-18">
            {t('profile.backup_title')}
          </h3>
          <p className="muted t-14">{t('profile.backup_lead')}</p>
          <div className="confirm-actions">
            <button type="button" className="btn btn-secondary" onClick={exportBackup}>
              {t('profile.export')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => fileInput.current?.click()}>
              {t('profile.import')}
            </button>
            <input ref={fileInput} type="file" accept="application/json,.json" hidden tabIndex={-1} aria-hidden="true" onChange={(e) => void onFile(e.target.files?.[0])} />
          </div>
          {pendingImport !== null && (
            <div className="confirm" role="group" aria-label={t('profile.import_confirm')}>
              <p>{t('profile.import_confirm')}</p>
              <div className="confirm-actions">
                <button type="button" className="btn btn-primary" onClick={() => void importBackup()}>
                  {t('profile.import_yes')}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setPendingImport(null)
                    if (fileInput.current) fileInput.current.value = ''
                  }}
                >
                  {t('profile.reset_no')}
                </button>
              </div>
            </div>
          )}
        </section>

        {flags?.auth && (
          <section className="section" aria-labelledby="cloud">
            <h3 id="cloud" className="t-18">
              {t('profile.cloud_title')}
            </h3>
            <button type="button" className="btn btn-secondary" onClick={() => void servicesOrNull()?.auth.linkAccount?.()}>
              {t('profile.cloud_save')}
            </button>
          </section>
        )}

        <section className="section" aria-labelledby="local-data">
          <h3 id="local-data" className="t-18">
            {t('profile.data_title')}
          </h3>
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
                    setMessage({ text: t('profile.reset_done') })
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
        </section>

        <p role="status" className={message ? `panel status-box ${message.error ? 'status-error' : ''}` : 'visually-hidden'}>
          {message?.text ?? ''}
        </p>

        <Link className="link" to={routes.about()}>
          {t('profile.about_link')}
        </Link>
      </main>
    </AppShell>
  )
}
