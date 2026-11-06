import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { setupApp, Router } from '../test/helpers'
import { useProgressStore } from '../stores/progressStore'
import { usePrefsStore } from '../stores/prefsStore'
import { ProfileScreen } from './ProfileScreen'
import { PracticeScreen } from './PracticeScreen'
import { AboutScreen } from './AboutScreen'
import { AdSlot } from '../ui/AdSlot'
import { LockBadge } from '../ui/LockBadge'

describe('pantallas de gamificación', () => {
  it('el perfil muestra agregados y oculta "Guardar en la nube" con auth en false', () => {
    setupApp()
    render(
      <Router>
        <ProfileScreen />
      </Router>,
    )
    expect(screen.getByText('Experiencia total')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reiniciar mi progreso' })).toBeInTheDocument()
    expect(screen.queryByText('Guardar mi progreso en la nube')).toBeNull()
  })

  it('el perfil tiene el interruptor "Sonido al responder", apagado por defecto', () => {
    setupApp()
    usePrefsStore.getState().set({ sound: false })
    const w = window as unknown as { AudioContext?: unknown }
    w.AudioContext = class {}
    try {
      render(
        <Router>
          <ProfileScreen />
        </Router>,
      )
      const toggle = screen.getByRole('checkbox', { name: 'Sonido al responder' })
      expect(toggle).not.toBeChecked()
      fireEvent.click(toggle)
      expect(toggle).toBeChecked()
      expect(usePrefsStore.getState().prefs.sound).toBe(true)
    } finally {
      delete w.AudioContext
      usePrefsStore.getState().set({ sound: false })
    }
  })

  it('la práctica prioriza los errores de mayor count', () => {
    setupApp()
    useProgressStore.getState().update((s) => ({
      ...s,
      mistakes: {
        e_metano: { id: 'm1', user_id: 'u', exercise_id: 'e_metano', topic: 't', count: 1, last_failed_at: '2026-11-01T00:00:00Z', resolved: false },
        e_sp3_geom: { id: 'm2', user_id: 'u', exercise_id: 'e_sp3_geom', topic: 't', count: 3, last_failed_at: '2026-11-01T00:00:00Z', resolved: false },
        e_butano: { id: 'm3', user_id: 'u', exercise_id: 'e_butano', topic: 't', count: 5, last_failed_at: '2026-11-01T00:00:00Z', resolved: true },
      },
    }))
    render(
      <Router>
        <PracticeScreen />
      </Router>,
    )
    const counts = screen.getAllByText(/veces|vez/).map((x) => x.textContent)
    expect(counts).toEqual(['3 veces', '1 vez'])
  })
})

describe('Acerca de', () => {
  it('muestra la versión con la fecha del build y el commit corto', () => {
    setupApp()
    render(
      <Router>
        <AboutScreen />
      </Router>,
    )
    expect(screen.getByText(/^Versión \d{4}-\d{2}-\d{2} · ([0-9a-f]{7}|local)$/)).toBeInTheDocument()
  })

  it('muestra el logo completo y oculta la sección Autor mientras sus líneas estén vacías', () => {
    setupApp()
    render(
      <Router>
        <AboutScreen />
      </Router>,
    )
    expect(screen.getByRole('img', { name: 'Química para Todos' })).toHaveAttribute('src', expect.stringContaining('brand/logo-300.png'))
    expect(screen.queryByRole('heading', { name: 'Autor' })).not.toBeInTheDocument()
    expect(screen.queryByText(/\[completar\]/)).not.toBeInTheDocument()
  })

  it('cuenta solo las lecciones de los mundos abiertos, sin las de un mundo en preparación', () => {
    setupApp()
    render(
      <Router>
        <AboutScreen />
      </Router>,
    )
    expect(screen.getByText(/^3 mundos abiertos con 13 lecciones/)).toBeInTheDocument()
  })
})

describe('espacios para el futuro', () => {
  it('AdSlot devuelve null con ads en false', () => {
    setupApp()
    const { container } = render(<AdSlot placement="result" />)
    expect(container.innerHTML).toBe('')
  })
  it('LockBadge no aparece con payments en false', () => {
    setupApp()
    const { container } = render(<LockBadge scopeId="w_carbono" />)
    expect(container.innerHTML).toBe('')
  })
})
