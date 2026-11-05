import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExercisePlayer } from './ExercisePlayer'
import { setupApp, Router } from '../test/helpers'
import type { ExerciseType } from '../models'

const { bundle, i18n } = setupApp()
const ex = (type: ExerciseType) => bundle.exercises.find((e) => e.type === type)!

function renderPlayer(type: ExerciseType, onRecord = vi.fn()) {
  const e = type === 'diagnostic' ? bundle.diagnosticItems[0] : ex(type)
  render(
    <Router>
      <ExercisePlayer exercises={[e]} attemptId="a1" mode={type === 'diagnostic' ? 'diagnostic' : 'lesson'} onRecord={onRecord} onFinish={vi.fn()} onClose={vi.fn()} />
    </Router>,
  )
  return e
}

describe('ExercisePlayer renderiza cada tipo del seed', () => {
  it.each(['multiple_choice', 'true_false', 'identify_group', 'chat_complete', 'diagnostic'] as ExerciseType[])(
    '%s: Comprobar deshabilitado hasta elegir; acierto por value',
    async (type) => {
      const onRecord = vi.fn()
      const e = renderPlayer(type, onRecord)
      const btn = screen.getByRole('button', { name: type === 'diagnostic' ? 'Siguiente' : 'Comprobar' })
      expect(btn).toBeDisabled()
      const radios = screen.getAllByRole('radio')
      expect(radios).toHaveLength(e.payload.options!.length)
      const correctLabel = i18n.t(e.payload.options!.find((o) => o.value === e.correct.value)!.key)
      const target = radios.find((r) => r.textContent?.includes(correctLabel))!
      await userEvent.click(target)
      expect(target).toHaveAttribute('aria-checked', 'true')
      expect(btn).toBeEnabled()
      await userEvent.click(btn)
      expect(onRecord).toHaveBeenCalledWith(e, { value: e.correct.value }, 'correct', expect.any(Number))
      if (type !== 'diagnostic') expect(await screen.findByRole('heading', { name: /Correcto/ })).toBeInTheDocument()
    },
  )

  it('las letras a) b) c) d) se asignan después de barajar', () => {
    renderPlayer('multiple_choice')
    const letters = screen.getAllByRole('radio').map((r) => within(r).getByText(/^[a-d]\)$/).textContent)
    expect(letters).toEqual(['a)', 'b)', 'c)', 'd)'])
  })

  it('fill_blanks: llena los huecos con el banco y muestra el error con la respuesta', async () => {
    const onRecord = vi.fn()
    const e = renderPlayer('fill_blanks', onRecord)
    await userEvent.click(screen.getByRole('button', { name: 'metil' }))
    await userEvent.click(screen.getByRole('button', { name: 'etil' }))
    await userEvent.click(screen.getByRole('button', { name: 'Comprobar' }))
    expect(onRecord).toHaveBeenCalledWith(e, { b1: 'metil', b2: 'etil' }, 'incorrect', expect.any(Number))
    expect(await screen.findByText(/La respuesta es 3-etil-2-metilhexano/)).toBeInTheDocument()
    expect(screen.getByText(/pasó a tu lista para repasar/)).toBeInTheDocument()
  })
})
