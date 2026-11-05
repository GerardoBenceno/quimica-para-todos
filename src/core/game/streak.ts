import type { UserState } from './state'
import type { GameValues } from './config'

/** Día de actividad local; el día cambia a la hora reset_hour_local. */
export function activityDay(now: Date, resetHourLocal: number): string {
  const d = new Date(now.getTime() - resetHourLocal * 3600_000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dayNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86400_000)
}

/** Semana ISO (lunes a domingo) del día, para el límite de congelaciones. */
export function isoWeek(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const dow = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dow)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400_000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export type StreakChange = 'none' | 'started' | 'incremented' | 'frozen' | 'reset'

/**
 * La racha sube con el primer ejercicio del día. Si faltaron días y hay
 * congelaciones compradas (sin pasar freeze_max_per_week), se gastan y la
 * racha continúa; si no, vuelve a 1.
 */
export function touchStreak(s: UserState, now: Date, g: GameValues): { state: UserState; change: StreakChange } {
  const today = activityDay(now, g.resetHourLocal)
  const st = { ...s.streak }
  if (st.last_active_date === today) return { state: s, change: 'none' }
  const week = isoWeek(today)
  if (st.freeze_week !== week) {
    st.freeze_week = week
    st.freezes_used_week = 0
  }
  let change: StreakChange
  if (!st.last_active_date || st.count === 0) {
    st.count = 1
    change = 'started'
  } else {
    const gap = dayNumber(today) - dayNumber(st.last_active_date)
    const missed = gap - 1
    if (gap <= 1) {
      st.count += 1
      change = 'incremented'
    } else if (missed <= st.freezes_available && st.freezes_used_week + missed <= g.freezeMaxPerWeek) {
      st.freezes_available -= missed
      st.freezes_used += missed
      st.freezes_used_week += missed
      st.count += 1
      change = 'frozen'
    } else {
      st.count = 1
      change = 'reset'
    }
  }
  st.last_active_date = today
  st.updated_at = now.toISOString()
  const user = { ...s.user, current_streak: st.count, longest_streak: Math.max(s.user.longest_streak, st.count) }
  return { state: { ...s, streak: st, user }, change }
}

/** Racha vigente para mostrar: si ya pasó más de un día sin congelación, 0. */
export function displayedStreak(s: UserState, now: Date, g: GameValues): number {
  const last = s.streak.last_active_date
  if (!last) return 0
  const gap = dayNumber(activityDay(now, g.resetHourLocal)) - dayNumber(last)
  if (gap <= 1) return s.streak.count
  return gap - 1 <= s.streak.freezes_available ? s.streak.count : 0
}

export function activeToday(s: UserState, now: Date, g: GameValues): boolean {
  return s.streak.last_active_date === activityDay(now, g.resetHourLocal)
}
