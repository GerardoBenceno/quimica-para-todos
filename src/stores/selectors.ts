import { useEffect, useMemo, useState } from 'react'
import { useBundle, useContentStore } from './contentStore'
import { useUserState } from './progressStore'
import { gameValues } from '../core/game/config'
import { computeProgress } from '../core/game/unlock'
import { completedLessons } from '../core/game/session'
import { displayedStreak } from '../core/game/streak'

export function useGameValues() {
  const b = useBundle()
  return useMemo(() => gameValues(b), [b])
}

export function useCompleted() {
  const s = useUserState()
  return useMemo(() => completedLessons(s), [s])
}

export function useProgressView() {
  const b = useBundle()
  const s = useUserState()
  const completed = useCompleted()
  const inProgress = s.in_progress?.lesson_id ?? null
  return useMemo(() => computeProgress(b, completed, inProgress), [b, completed, inProgress])
}

export function useStreak() {
  const s = useUserState()
  const g = useGameValues()
  return displayedStreak(s, new Date(), g)
}

/** Pantalla angosta según ui.json (narrow_breakpoint_px). */
export function useNarrow(): boolean {
  const bp = useContentStore((s) => s.ui?.narrow_breakpoint_px ?? 0)
  const query = `(max-width: ${bp - 1}px)`
  const get = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false)
  const [narrow, setNarrow] = useState(get)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(query)
    const on = () => setNarrow(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return narrow
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}
