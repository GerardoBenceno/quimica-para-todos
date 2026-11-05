import { useEffect, useMemo, useRef } from 'react'
import { Editor } from 'ketcher-react'
import { StandaloneStructServiceProvider } from 'ketcher-standalone/dist/binaryWasmNoRender'
import 'ketcher-react/dist/index.css'
import type { StructureEditorProps } from '../../ports'

// Tipos propios mínimos: los de ketcher-core no se exponen fuera del wrapper.
interface KetcherLike {
  getSmiles(): Promise<string>
  editor: { subscribe(event: string, cb: () => void): unknown; unsubscribe?(event: string, sub: unknown): void }
}

/**
 * Barra reducida: solo átomos, enlaces, borrar, deshacer y limpiar. Se ocultan
 * reacciones, grupos R, formas, texto, 3D, análisis y ajustes, que no sirven
 * para dibujar un alcano y no caben en 360 px.
 */
const HIDDEN = [
  'layout', 'arom', 'dearom', 'cip', 'check', 'analyse', 'recognize', 'miew', 'settings', 'help', 'about',
  'fullscreen', 'sgroup', 'reaction-plus', 'arrows', 'reaction-mapping-tools', 'rgroup', 'shape', 'shapes', 'text',
  'enhanced-stereo', 'create-monomer', 'images', 'image', 'charge-plus', 'charge-minus', 'templates', 'template-lib',
  'period-table', 'extended-table', 'any-atom', 'open', 'save', 'copy', 'paste', 'cut', 'copies', 'zoom-in', 'zoom-out', 'zoom-list',
] as const

export function makeKetcherEditor(baseUrl: string) {
  const provider = new StandaloneStructServiceProvider()
  const buttons = Object.fromEntries(HIDDEN.map((b) => [b, { hidden: true }]))

  return function KetcherEditor({ onChange, ariaLabel }: StructureEditorProps) {
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange
    const ketcherRef = useRef<KetcherLike | null>(null)
    const timer = useRef<number | undefined>(undefined)

    useEffect(() => () => window.clearTimeout(timer.current), [])

    const editor = useMemo(
      () => (
        <Editor
          staticResourcesUrl={baseUrl}
          structServiceProvider={provider as never}
          buttons={buttons as never}
          disableMacromoleculesEditor
          errorHandler={(message: string) => console.warn('[ketcher]', message)}
          onInit={(k: unknown) => {
            const ketcher = k as KetcherLike
            ketcherRef.current = ketcher
            // Acceso para pruebas de extremo a extremo (scripts/verify-steps.mjs).
            ;(window as unknown as { ketcher?: KetcherLike }).ketcher = ketcher
            ketcher.editor.subscribe('change', () => {
              window.clearTimeout(timer.current)
              timer.current = window.setTimeout(async () => {
                try {
                  onChangeRef.current(await ketcher.getSmiles())
                } catch {
                  onChangeRef.current('')
                }
              }, 250)
            })
          }}
        />
      ),
      [],
    )

    return (
      <div className="ketcher-host" role="application" aria-label={ariaLabel}>
        {editor}
      </div>
    )
  }
}
