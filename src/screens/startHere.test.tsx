import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { setupApp } from '../test/helpers'
import { useProgressStore } from '../stores/progressStore'
import { beginLesson } from '../stores/actions'
import { WorldMapScreen } from './WorldMapScreen'
import { WorldPathScreen } from './WorldPathScreen'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/aprender" element={<WorldMapScreen />} />
        <Route path="/mundo/:worldId" element={<WorldPathScreen />} />
      </Routes>
    </MemoryRouter>,
  )
}

const withDiagnostic = () =>
  useProgressStore.getState().update((s) => ({
    ...s,
    onboarding: { ...s.onboarding, welcomed: true, diagnostic_done: true },
    user: { ...s.user, recommended_world_id: 'w_carbono' },
  }))
const skippedDiagnostic = () =>
  useProgressStore.getState().update((s) => ({ ...s, onboarding: { ...s.onboarding, welcomed: true, diagnostic_done: true } }))

describe('"Empieza aquí" en el mapa y en la ruta', () => {
  for (const [label, prepare] of [
    ['con diagnóstico', withDiagnostic],
    ['sin diagnóstico', skippedDiagnostic],
  ] as const) {
    it(`${label}: aparece en el mapa de mundos sobre la primera lección`, () => {
      setupApp()
      prepare()
      renderAt('/aprender')
      const tags = screen.getAllByText('Empieza aquí')
      // Fila del mundo y panel de la lección.
      expect(tags).toHaveLength(2)
      const intro = screen.getByRole('region', { name: 'El carbono y sus enlaces' })
      expect(within(intro).getByText('Empieza aquí')).toBeInTheDocument()
    })

    it(`${label}: aparece en la ruta del mundo y desaparece al empezar la lección`, () => {
      setupApp()
      prepare()
      const { unmount } = renderAt('/mundo/w_carbono')
      expect(screen.getByRole('link', { name: /^Lección 1, .*Empieza aquí$/ })).toBeInTheDocument()
      expect(screen.getAllByText('Empieza aquí').length).toBeGreaterThan(0)
      unmount()

      beginLesson('l_carbono_enlaces', 4)
      renderAt('/mundo/w_carbono')
      expect(screen.queryByText('Empieza aquí')).toBeNull()
      expect(screen.getByRole('link', { name: /^Lección 1, / }).getAttribute('aria-label')).not.toMatch(/Empieza aquí/)
    })
  }

  it('no aparece en el mapa una vez empezada cualquier lección', () => {
    setupApp()
    skippedDiagnostic()
    beginLesson('l_carbono_enlaces', 4)
    renderAt('/aprender')
    expect(screen.queryByText('Empieza aquí')).toBeNull()
  })
})
