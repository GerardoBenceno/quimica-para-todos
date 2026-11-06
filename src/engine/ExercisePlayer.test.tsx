import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExercisePlayer } from './ExercisePlayer'
import { FeedbackSheet } from './FeedbackSheet'
import { setupApp, Router } from '../test/helpers'
import type { Exercise, ExerciseType } from '../models'
import { highlightKind } from '../ui/MoleculeView'

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

  it('atajos: 1 a 4 eligen la opción visible y Enter comprueba y continúa', async () => {
    const onRecord = vi.fn()
    const e = renderPlayer('multiple_choice', onRecord)
    const radios = screen.getAllByRole('radio')
    const correctLabel = i18n.t(e.payload.options!.find((o) => o.value === e.correct.value)!.key)
    const idx = radios.findIndex((r) => r.textContent?.includes(correctLabel))
    await userEvent.keyboard(String(idx + 1))
    expect(radios[idx]).toHaveAttribute('aria-checked', 'true')
    await userEvent.keyboard('{Enter}')
    expect(onRecord).toHaveBeenCalledWith(e, { value: e.correct.value }, 'correct', expect.any(Number))
    const next = await screen.findByRole('button', { name: 'Continuar' })
    expect(next).toBeInTheDocument()
  })

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

describe('tipos web', () => {
  it('draw_structure: usa el editor registrado y califica con el verificador', async () => {
    const { bundle: bb } = setupApp({
      editor: {
        id: 'falso',
        load: async () =>
          function FakeEditor({ onChange }: { onChange(s: string): void }) {
            return (
              <button type="button" onClick={() => onChange('CC[C@@H](C)C')}>
                dibujar
              </button>
            )
          },
      },
      matcher: { compare: async (a: string, b: string) => (a.replace(/[@[\]H]/g, '') === b.replace(/[()]/g, '') ? 'match' : 'mismatch') },
    })
    const e = bb.exercises.find((x) => x.type === 'draw_structure')!
    const onRecord = vi.fn()
    render(
      <Router>
        <ExercisePlayer exercises={[e]} attemptId="a" mode="lesson" onRecord={onRecord} onFinish={vi.fn()} onClose={vi.fn()} />
      </Router>,
    )
    expect(screen.getByRole('button', { name: 'Comprobar' })).toBeDisabled()
    await userEvent.click(await screen.findByRole('button', { name: 'dibujar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Comprobar' }))
    expect(onRecord).toHaveBeenCalled()
  })

  it('choose_structure: muestra estructuras como opciones y valida por value', async () => {
    const { bundle: bb } = setupApp()
    const e = bb.exercises.find((x) => x.type === 'choose_structure')!
    const onRecord = vi.fn()
    render(
      <Router>
        <ExercisePlayer exercises={[e]} attemptId="a" mode="lesson" onRecord={onRecord} onFinish={vi.fn()} onClose={vi.fn()} />
      </Router>,
    )
    const radios = screen.getAllByRole('radio')
    expect(radios.length).toBe(e.payload.options!.length)
    await userEvent.click(radios[0])
    await userEvent.click(screen.getByRole('button', { name: 'Comprobar' }))
    expect(onRecord.mock.calls[0][2]).toMatch(/correct|incorrect/)
  })
})

describe('view_3d', () => {
  it('muestra el visor registrado y responde como su ejercicio de origen', async () => {
    const { bundle: bb } = setupApp({
      viewer3d: {
        id: 'falso',
        isAvailable: async () => true,
        load: async () =>
          function FakeViewer({ ariaLabel }: { ariaLabel: string }) {
            return <div role="img" aria-label={ariaLabel} />
          },
      },
    })
    const e = bb.exercises.find((x) => x.type === 'view_3d')!
    const src = bb.exercises.find((x) => x.id === e.payload.source_exercise_id)!
    const onRecord = vi.fn()
    render(
      <Router>
        <ExercisePlayer exercises={[e]} attemptId="a" mode="lesson" onRecord={onRecord} onFinish={vi.fn()} onClose={vi.fn()} />
      </Router>,
    )
    expect(await screen.findByRole('img', { name: 'Modelo 3D de la molécula' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(src.payload.options!.length)
    const label = i18n.t(src.payload.options!.find((o) => o.value === src.correct.value)!.key)
    await userEvent.click(screen.getAllByRole('radio').find((r) => r.textContent?.includes(label))!)
    await userEvent.click(screen.getByRole('button', { name: 'Comprobar' }))
    expect(onRecord.mock.calls[0][2]).toBe('correct')
  })
})

describe('compare_structures', () => {
  it('muestra dos figuras rotuladas, opciones como radios y acierta por value', async () => {
    const mc = ex('multiple_choice')
    const e: Exercise = {
      ...mc,
      id: 'ex_compare_test',
      type: 'compare_structures',
      payload: { structure_smiles: 'C[C@@H:1](O)CC', structure_smiles_b: 'CC(=O)C', options: mc.payload.options },
      correct: mc.correct,
    }
    const onRecord = vi.fn()
    render(
      <Router>
        <ExercisePlayer exercises={[e]} attemptId="a1" mode="lesson" onRecord={onRecord} onFinish={vi.fn()} onClose={vi.fn()} />
      </Router>,
    )
    const figures = await screen.findAllByRole('img', { name: /^Estructura [AB] del ejercicio/ })
    expect(figures).toHaveLength(2)
    expect(figures[0]).toHaveAttribute('aria-label', 'Estructura A del ejercicio. Estructura con un átomo resaltado')
    expect(screen.getByText('Estructura A')).toBeInTheDocument()
    expect(screen.getByText('Estructura B')).toBeInTheDocument()
    // La vista dibuja sus figuras: el reproductor no repite la del enunciado.
    expect(screen.queryByRole('img', { name: 'Estructura del ejercicio' })).not.toBeInTheDocument()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(e.payload.options!.length)
    const btn = screen.getByRole('button', { name: 'Comprobar' })
    expect(btn).toBeDisabled()
    const correctLabel = i18n.t(e.payload.options!.find((o) => o.value === e.correct.value)!.key)
    await userEvent.click(radios.find((r) => r.textContent?.includes(correctLabel))!)
    await userEvent.click(btn)
    expect(onRecord).toHaveBeenCalledWith(e, { value: e.correct.value }, 'correct', expect.any(Number))
  })

  it('highlightKind: un mapa de átomos es un átomo, dos son un enlace', () => {
    expect(highlightKind('CCO')).toBeNull()
    expect(highlightKind('C[C@@H:1](O)CC')).toBe('atom')
    expect(highlightKind('[CH3:1][CH2:2]O')).toBe('bond')
  })
})

describe('retroalimentación al fallar sin repetir la explicación', () => {
  const carbono = bundle.exercises.find((e) => e.id === 'e_carbono_enlaces')!
  const explanation = 'El carbono tiene 4 electrones de valencia y completa el octeto formando 4 enlaces covalentes.'
  const template = 'El carbono tiene 4 electrones de valencia, por eso forma 4 enlaces covalentes.'
  const sheet = (e: Exercise, practice = false) =>
    render(
      <Router>
        <FeedbackSheet exercise={e} verdict="incorrect" onContinue={vi.fn()} practice={practice} />
      </Router>,
    )

  it('con explicación muestra solo la explicación y la nota de repaso (par de l_carbono_enlaces)', () => {
    // El par que repetía la hoja: la regla anterior (Jaccard 0.8) no lo detectaba.
    expect(i18n.t(carbono.explanation_key!)).toBe(explanation)
    expect(i18n.t(bundle.feedbackTemplates.find((f) => f.id === carbono.feedback_template_id)!.message_key)).toBe(template)
    sheet(carbono)
    expect(screen.getByText(explanation)).toBeInTheDocument()
    expect(screen.queryByText(template, { exact: false })).toBeNull()
    expect(screen.getByText('Este ejercicio pasó a tu lista para repasar.')).toBeInTheDocument()
  })

  it('sin explicación muestra el mensaje de la plantilla seguido de la nota', () => {
    sheet({ ...carbono, id: 'ex_sin_explicacion', explanation_key: null }, true)
    expect(screen.queryByText(explanation)).toBeNull()
    expect(screen.getByText(`${template} Sigue en tu lista para repasar.`)).toBeInTheDocument()
  })
})
