import { useEffect, useMemo, useState } from 'react'
import { servicesOrNull } from '../app/services'
import { KEY_EDITOR_DRAFT, KEY_EDITOR_DRAFTS } from '../core/storageKeys'
import { buildExercise, draftToCsv, slugify, validateDraft, type Draft } from '../core/content/exerciseCsv'
import { useBundle, useContentStore } from '../stores/contentStore'
import { SafeLocalStore } from '../services/safeStorage'
import { useT } from '../services/i18nHooks'
import { ExercisePlayer } from '../engine/ExercisePlayer'
import { AppShell } from '../ui/AppShell'
import { ChemText } from '../ui/ChemText'
import { MoleculeView } from '../ui/MoleculeView'

const EMPTY: Draft = { pack: 'autor', slug: '', lessonId: '', type: 'multiple_choice', prompt: '', options: ['', '', '', ''], correct: 0, explanation: '', hint: '', smiles: '' }
const store = new SafeLocalStore()
const loadDraft = (): Draft => {
  try {
    const raw = store.get(KEY_EDITOR_DRAFT)
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) } : EMPTY
  } catch {
    return EMPTY
  }
}

type Preview = 'question' | 'correct' | 'incorrect'

const loadDrafts = (): Draft[] => {
  try {
    const raw = store.get(KEY_EDITOR_DRAFTS)
    const list = raw ? (JSON.parse(raw) as Draft[]) : []
    return Array.isArray(list) ? list.map((d) => ({ ...EMPTY, ...d })) : []
  } catch {
    return []
  }
}
const saveDrafts = (list: Draft[]) => {
  try {
    store.set(KEY_EDITOR_DRAFTS, JSON.stringify(list))
  } catch {
    /* sin guardado */
  }
}

/** Fórmula y estructura de un SMILES calculadas en vivo con RDKit.js. */
function useSmilesCheck(smiles: string) {
  const [state, setState] = useState<{ status: 'empty' | 'loading' | 'ok' | 'invalid' | 'unavailable'; formula?: string }>({ status: 'empty' })
  useEffect(() => {
    const s = smiles.trim()
    if (!s) return setState({ status: 'empty' })
    const matcher = servicesOrNull()?.matcher
    if (!matcher?.formula) return setState({ status: 'unavailable' })
    let alive = true
    setState({ status: 'loading' })
    const h = setTimeout(() => {
      matcher
        .formula!(s)
        .then((f) => alive && setState(f ? { status: 'ok', formula: f } : { status: 'invalid' }))
        .catch(() => alive && setState({ status: 'unavailable' }))
    }, 250)
    return () => {
      alive = false
      clearTimeout(h)
    }
  }, [smiles])
  return state
}

/**
 * Editor del autor (ruta oculta #/editor): formulario a la izquierda y vista
 * previa real (reproductor y hoja de retroalimentación) a la derecha, que se
 * actualiza con cada tecla; en celular, pestañas Editar y Vista previa.
 * Descarga ejercicios.csv, traducciones.csv y retroalimentacion.csv listos
 * para plantillas/<paquete>/. El borrador se guarda en el navegador.
 */
export function EditorScreen() {
  const t = useT()
  const b = useBundle()
  const i18n = useContentStore((s) => s.i18n)
  const [draft, setDraft] = useState<Draft>(loadDraft)
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [frame, setFrame] = useState<'phone' | 'desktop'>('phone')
  const [preview, setPreview] = useState<Preview>('question')
  const [touched, setTouched] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>(loadDrafts)
  const smilesState = useSmilesCheck(draft.smiles)
  const lessons = useMemo(() => b.lessons.filter((l) => l.is_active), [b])

  const set = (patch: Partial<Draft>) => {
    setTouched(true)
    setDraft((d) => {
      const next = { ...d, ...patch }
      if (patch.prompt !== undefined && (!d.slug || d.slug === slugify(d.prompt))) next.slug = slugify(patch.prompt)
      try {
        store.set(KEY_EDITOR_DRAFT, JSON.stringify(next))
      } catch {
        /* sin guardado */
      }
      return next
    })
  }

  const errors = validateDraft({ ...draft, slug: draft.slug || slugify(draft.prompt) })
  const smilesError = smilesState.status === 'invalid' ? 'editor.err_smiles' : null
  const built = useMemo(() => buildExercise({ ...draft, slug: draft.slug || slugify(draft.prompt) || 'borrador' }), [draft])

  // Textos del borrador en la tabla de i18n (se sobrescriben en cada tecla) y la
  // plantilla de retroalimentación en el bundle mientras el editor está abierto.
  useEffect(() => {
    i18n?.addUi(built.translations)
  }, [built, i18n])
  useEffect(() => {
    const original = useContentStore.getState().bundle
    if (!original) return
    const others = original.feedbackTemplates.filter((f) => !f.id.startsWith(`${draft.pack}_ft_`))
    useContentStore.setState({ bundle: { ...original, feedbackTemplates: built.template ? [...others, built.template] : others } })
    return () => {
      const cur = useContentStore.getState().bundle
      if (cur) useContentStore.setState({ bundle: { ...cur, feedbackTemplates: cur.feedbackTemplates.filter((f) => !f.id.startsWith(`${draft.pack}_ft_`)) } })
    }
  }, [built.template, draft.pack])

  const n = draft.type === 'true_false' ? 2 : 4
  const correctValue = built.exercise.correct.value
  const wrongValue = built.exercise.payload.options?.find((o) => o.value !== correctValue)?.value ?? correctValue
  const previewProp = preview === 'question' ? undefined : { answer: { value: preview === 'correct' ? correctValue : wrongValue }, checked: true }
  const previewKey = `${JSON.stringify(built.exercise)}|${preview}`
  const canDownload = Object.keys(errors).length === 0 && !smilesError

  const current = (): Draft => ({ ...draft, slug: draft.slug || slugify(draft.prompt) })
  const saveCurrent = () => {
    const d = current()
    const list = [...drafts.filter((x) => !(x.pack === d.pack && x.slug === d.slug)), d]
    setDrafts(list)
    saveDrafts(list)
  }
  const removeDraft = (d: Draft) => {
    const list = drafts.filter((x) => !(x.pack === d.pack && x.slug === d.slug))
    setDrafts(list)
    saveDrafts(list)
  }

  const download = () => {
    // Todos los borradores guardados del mismo paquete más el actual (sin repetir).
    const d = current()
    const all = [...drafts.filter((x) => x.pack === d.pack && !(x.slug === d.slug)), d]
    const files = draftToCsv(all, i18n?.locale ?? 'es')
    for (const [name, text] of [['ejercicios.csv', files.ejercicios], ['traducciones.csv', files.traducciones], ['retroalimentacion.csv', files.retroalimentacion]] as const) {
      const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }

  const field = (id: keyof Draft, label: string, input: React.ReactNode, help?: string) => (
    <div className="editor-field">
      <label htmlFor={`ed-${id}`}>{label}</label>
      {input}
      {help && <span className="muted t-13">{help}</span>}
      {touched && errors[id] && (
        <span className="editor-error t-14" role="alert">
          {t(errors[id]!)}
        </span>
      )}
    </div>
  )

  const form = (
    <form className="editor-form" onSubmit={(e) => e.preventDefault()}>
      <div className="editor-row">
        {field('pack', t('editor.pack'), <input id="ed-pack" value={draft.pack} onChange={(e) => set({ pack: e.target.value })} />, t('editor.pack_help'))}
        {field('slug', t('editor.slug'), <input id="ed-slug" value={draft.slug} onChange={(e) => set({ slug: slugify(e.target.value) })} />, t('editor.slug_help', { id: built.exercise.id }))}
      </div>
      {field(
        'lessonId',
        t('editor.lesson'),
        <select id="ed-lessonId" value={draft.lessonId} onChange={(e) => set({ lessonId: e.target.value })}>
          <option value="">{t('editor.choose')}</option>
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {t(l.title_key)} ({l.id})
            </option>
          ))}
        </select>,
      )}
      {field(
        'type',
        t('editor.type'),
        <select id="ed-type" value={draft.type} onChange={(e) => set({ type: e.target.value as Draft['type'], correct: 0 })}>
          <option value="multiple_choice">{t('editor.type_mc')}</option>
          <option value="true_false">{t('editor.type_tf')}</option>
        </select>,
      )}
      {field('prompt', t('editor.prompt'), <textarea id="ed-prompt" rows={2} value={draft.prompt} onChange={(e) => set({ prompt: e.target.value })} />)}
      <fieldset className="editor-options">
        <legend>{t('editor.options')}</legend>
        {Array.from({ length: n }, (_, i) => (
          <div key={i} className="editor-option">
            <label className="editor-radio">
              <input type="radio" name="correct" checked={draft.correct === i} onChange={() => set({ correct: i })} aria-label={t('editor.mark_correct', { l: 'ABCD'[i] })} />
            </label>
            <label htmlFor={`ed-opt-${i}`} className="editor-letter">
              {'ABCD'[i]}
            </label>
            <input id={`ed-opt-${i}`} value={draft.options[i] ?? ''} onChange={(e) => set({ options: draft.options.map((o, j) => (j === i ? e.target.value : o)) })} />
          </div>
        ))}
        <span className="muted t-13">{t('editor.correct_help')}</span>
        {touched && (errors.options || errors.correct) && (
          <span className="editor-error t-14" role="alert">
            {t(errors.options ?? errors.correct!)}
          </span>
        )}
      </fieldset>
      {field('explanation', t('editor.explanation'), <textarea id="ed-explanation" rows={3} value={draft.explanation} onChange={(e) => set({ explanation: e.target.value })} />)}
      {field('hint', t('editor.hint'), <textarea id="ed-hint" rows={2} value={draft.hint} onChange={(e) => set({ hint: e.target.value })} />, t('editor.hint_help'))}
      <div className="editor-field">
        <label htmlFor="ed-smiles">{t('editor.smiles')}</label>
        <input id="ed-smiles" value={draft.smiles} onChange={(e) => set({ smiles: e.target.value })} spellCheck={false} />
        <span className="muted t-13">{t('editor.smiles_help')}</span>
        {smilesState.status === 'loading' && <span className="muted t-14">{t('editor.smiles_checking')}</span>}
        {smilesState.status === 'unavailable' && <span className="muted t-14">{t('editor.smiles_unavailable')}</span>}
        {smilesError && (
          <span className="editor-error t-14" role="alert">
            {t(smilesError)}
          </span>
        )}
        {smilesState.status === 'ok' && (
          <div className="editor-smiles-ok">
            <span className="t-14">
              {t('editor.formula')} <ChemText text={smilesState.formula ?? ''} />
            </span>
            <figure className="figure figure-small">
              <MoleculeView smiles={draft.smiles.trim()} label={t('figure.structure_prompt')} />
            </figure>
          </div>
        )}
      </div>
      <div className="confirm-actions">
        <button type="button" className="btn btn-primary" disabled={!canDownload} onClick={download}>
          {t('editor.download')}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setDraft(EMPTY)
            setTouched(false)
            try {
              store.remove(KEY_EDITOR_DRAFT)
            } catch {
              /* nada */
            }
          }}
        >
          {t('editor.clear')}
        </button>
      </div>
      <p className="muted t-14">{t('editor.download_help', { pack: draft.pack })}</p>
      <section className="section" aria-labelledby="ed-drafts">
        <h2 id="ed-drafts" className="t-18">
          {t('editor.drafts')}
        </h2>
        <p className="muted t-14">{t('editor.drafts_help')}</p>
        <button type="button" className="btn btn-secondary" disabled={!canDownload} onClick={saveCurrent}>
          {t('editor.save_draft')}
        </button>
        {drafts.length > 0 && (
          <ul className="data-list panel">
            {drafts.map((d) => (
              <li key={`${d.pack}_${d.slug}`}>
                <span>
                  <strong>{`${d.pack}_e_${d.slug}`}</strong>
                  <br />
                  <span className="t-14">{d.prompt.slice(0, 60)}</span>
                </span>
                <span className="confirm-actions">
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      setDraft(d)
                      setTouched(false)
                    }}
                  >
                    {t('editor.load_draft')}
                  </button>
                  <button type="button" className="link" onClick={() => removeDraft(d)}>
                    {t('editor.delete_draft')}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </form>
  )

  const previewPane = (
    <div className="editor-preview">
      <div className="editor-preview-controls">
        <div role="group" aria-label={t('editor.frame')} className="editor-seg">
          <button type="button" className={`link ${frame === 'phone' ? 'active' : ''}`} aria-pressed={frame === 'phone'} onClick={() => setFrame('phone')}>
            {t('editor.frame_phone')}
          </button>
          <button type="button" className={`link ${frame === 'desktop' ? 'active' : ''}`} aria-pressed={frame === 'desktop'} onClick={() => setFrame('desktop')}>
            {t('editor.frame_desktop')}
          </button>
        </div>
        <div role="group" aria-label={t('editor.state')} className="editor-seg">
          {(['question', 'correct', 'incorrect'] as Preview[]).map((p) => (
            <button key={p} type="button" className={`link ${preview === p ? 'active' : ''}`} aria-pressed={preview === p} onClick={() => setPreview(p)}>
              {t(`editor.state_${p}`)}
            </button>
          ))}
        </div>
      </div>
      <div className={`editor-frame ${frame}`}>
        <ExercisePlayer key={previewKey} exercises={[built.exercise]} attemptId="editor" mode="lesson" preview={previewProp} onRecord={() => undefined} onFinish={() => setPreview('question')} onClose={() => setPreview('question')} />
      </div>
    </div>
  )

  return (
    <AppShell>
      <main id="main" className="container page editor-page">
        <h1 className="t-28">{t('editor.title')}</h1>
        <p className="t-body muted">{t('editor.lead')}</p>
        <div className="editor-tabs" role="tablist" aria-label={t('editor.title')}>
          <button type="button" role="tab" aria-selected={tab === 'edit'} className={`top-nav-link ${tab === 'edit' ? 'active' : ''}`} onClick={() => setTab('edit')}>
            {t('editor.tab_edit')}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'preview'} className={`top-nav-link ${tab === 'preview' ? 'active' : ''}`} onClick={() => setTab('preview')}>
            {t('editor.tab_preview')}
          </button>
        </div>
        <div className={`editor-layout tab-${tab}`}>
          <section className="editor-col editor-col-form" aria-label={t('editor.tab_edit')}>
            {form}
          </section>
          <section className="editor-col editor-col-preview" aria-label={t('editor.tab_preview')}>
            {previewPane}
          </section>
        </div>
      </main>
    </AppShell>
  )
}
