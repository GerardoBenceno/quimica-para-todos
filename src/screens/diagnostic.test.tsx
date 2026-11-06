import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupApp, Router } from '../test/helpers'
import { DiagnosticScreen } from './DiagnosticScreen'

describe('puntos por pregunta en el diagnóstico', () => {
  it('cada pregunta muestra su weight y el resultado el total de los ítems activos', async () => {
    const { bundle } = setupApp()
    // Pesos que no están en el seed, para comprobar que lo mostrado sale del weight.
    const items = bundle.diagnosticItems.filter((i) => i.is_active)
    items[0].weight = 1
    items[1].weight = 7
    const total = items.reduce((sum, i) => sum + i.weight, 0)
    render(
      <Router>
        <DiagnosticScreen />
      </Router>,
    )
    for (const [k, item] of items.entries()) {
      expect(screen.getByText(`Pregunta ${k + 1} de ${items.length}`, { exact: false })).toBeInTheDocument()
      expect(screen.getByText(`· ${item.weight === 1 ? 'Vale 1 punto' : `Vale ${item.weight} puntos`}`)).toBeInTheDocument()
      await userEvent.click(screen.getAllByRole('radio')[0])
      await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    }
    expect(screen.getByText('Puntaje')).toBeInTheDocument()
    expect(screen.getByText(`${items.length} preguntas, ${total} puntos en total`)).toBeInTheDocument()
    // El puntaje conserva la escala de diagnostic.scoring (suma de weight).
    expect(screen.getByText(new RegExp(`^\\d+ de ${total}$`))).toBeInTheDocument()
  })
})
