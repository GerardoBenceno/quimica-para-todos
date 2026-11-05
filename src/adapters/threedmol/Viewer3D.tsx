import { useEffect, useRef, useState } from 'react'
import type { MoleculeViewer3DProps } from '../../ports'
import { servicesOrNull } from '../../app/services'
import { useT } from '../../services/i18nHooks'
import { RotateIcon } from '../../ui/icons'

interface GLViewerLike {
  addModel(data: string, format: string): unknown
  setStyle(sel: object, style: object): void
  zoomTo(): void
  zoom(factor: number): void
  render(): void
  rotate(angle: number, axis: string): void
  resize(): void
  clear(): void
  setBackgroundColor(color: string, alpha?: number): void
}

/** Color de un rol del tema, leído de las variables CSS (nada fijo en el código). */
const cssVar = (el: Element, name: string) => getComputedStyle(el).getPropertyValue(name).trim()

export function makeViewer3D(baseUrl: string) {
  return function Viewer3D({ smiles, ariaLabel }: MoleculeViewer3DProps) {
    const t = useT()
    const host = useRef<HTMLDivElement>(null)
    const viewer = useRef<GLViewerLike | null>(null)
    const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')

    useEffect(() => {
      let alive = true
      void (async () => {
        try {
          const entry = await servicesOrNull()?.molecules.entry(smiles)
          if (!entry?.sdf || !host.current) throw new Error('sin 3D')
          const [sdf, lib] = await Promise.all([fetch(`${baseUrl}${entry.sdf}`).then((r) => (r.ok ? r.text() : Promise.reject(new Error('sdf')))), import('3dmol')])
          if (!alive || !host.current) return
          const el = host.current
          const v = lib.createViewer(el, { backgroundColor: cssVar(el, '--color-surface') }) as unknown as GLViewerLike
          v.setBackgroundColor(cssVar(el, '--color-surface'), 1)
          v.addModel(sdf, 'sdf')
          const map = { C: cssVar(el, '--color-mol-ink'), H: cssVar(el, '--color-control-border') }
          const fallback = cssVar(el, '--color-primary')
          const colorfunc = (atom: { elem: string }) => (map as Record<string, string>)[atom.elem] ?? fallback
          v.setStyle({}, { stick: { radius: 0.12, colorfunc }, sphere: { scale: 0.22, colorfunc } })
          v.zoomTo()
          v.zoom(1.8)
          v.render()
          viewer.current = v
          setState('ready')
        } catch {
          if (alive) setState('missing')
        }
      })()
      return () => {
        alive = false
        viewer.current?.clear()
        viewer.current = null
      }
    }, [smiles])

    const turn = (deg: number) => {
      viewer.current?.rotate(deg, 'y')
      viewer.current?.render()
    }

    return (
      <div className="viewer3d">
        <div ref={host} className={`viewer3d-canvas ${state}`} role="img" aria-label={ariaLabel} aria-busy={state === 'loading' || undefined} />
        {state === 'ready' && (
          <div className="viewer3d-controls">
            <span className="muted t-14">{t('viewer3d.help')}</span>
            <button type="button" className="btn btn-secondary" onClick={() => turn(-30)} aria-label={t('viewer3d.rotate_left')}>
              <RotateIcon />
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => turn(30)} aria-label={t('viewer3d.rotate_right')}>
              <RotateIcon flip />
            </button>
          </div>
        )}
        {state === 'missing' && <p className="muted t-14">{t('viewer3d.missing')}</p>}
      </div>
    )
  }
}
