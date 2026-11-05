import type {
  AccessLevel,
  AppConfig,
  Asset,
  Character,
  ContentVersion,
  Currency,
  DiagnosticItem,
  DiagnosticScoring,
  Exercise,
  FeedbackTemplate,
  Lesson,
  Reward,
  Theme,
  Translation,
  Unit,
  World,
} from '../../models'
import { PACK_FILE_SCHEMAS, formatZodError, type PackFileName } from '../schemas'
import { err, ok, type Result } from '../result'

/** Todo el contenido unido de los paquetes del manifest, en orden de carga. */
export interface ContentBundle {
  packs: string[]
  worlds: World[]
  units: Unit[]
  lessons: Lesson[]
  exercises: Exercise[]
  diagnosticItems: DiagnosticItem[]
  diagnosticScoring: DiagnosticScoring | null
  feedbackTemplates: FeedbackTemplate[]
  translations: Translation[]
  themes: Theme[]
  characters: Character[]
  assets: Asset[]
  rewards: Reward[]
  currencies: Currency[]
  appConfig: AppConfig[]
  contentVersions: ContentVersion[]
  /** Acceso por id de contenido; lo que falta es 'free'. */
  access: Record<string, AccessLevel>
  /** id -> paquete que lo define (para mensajes y para EntitlementsService). */
  origin: Record<string, string>
}

export type RawPack = { id: string; files: Partial<Record<string, unknown>> }

export interface ContentError {
  kind: 'parse' | 'duplicate' | 'fetch' | 'integrity'
  message: string
}

export function emptyBundle(): ContentBundle {
  return {
    packs: [],
    worlds: [],
    units: [],
    lessons: [],
    exercises: [],
    diagnosticItems: [],
    diagnosticScoring: null,
    feedbackTemplates: [],
    translations: [],
    themes: [],
    characters: [],
    assets: [],
    rewards: [],
    currencies: [],
    appConfig: [],
    contentVersions: [],
    access: {},
    origin: {},
  }
}

const LIST_FILES: Record<string, keyof ContentBundle> = {
  'worlds.json': 'worlds',
  'units.json': 'units',
  'lessons.json': 'lessons',
  'exercises.json': 'exercises',
  'feedback_templates.json': 'feedbackTemplates',
  'themes.json': 'themes',
  'characters.json': 'characters',
  'assets.json': 'assets',
  'rewards.json': 'rewards',
  'currencies.json': 'currencies',
  'app_config.json': 'appConfig',
  'content_versions.json': 'contentVersions',
}

const TRANSLATION_FILE = /^translations_([a-z]{2})\.json$/

export function schemaFor(file: string) {
  if (TRANSLATION_FILE.test(file)) return PACK_FILE_SCHEMAS['translations_es.json']
  return PACK_FILE_SCHEMAS[file as PackFileName]
}

/**
 * Une los paquetes en el orden dado. Cada archivo se valida con zod; un id
 * repetido entre (o dentro de) paquetes es error, nunca sobrescritura. Los
 * archivos ausentes cuentan como vacíos.
 */
export function mergePacks(packs: RawPack[]): Result<ContentBundle, ContentError> {
  const bundle = emptyBundle()
  // Espacio de ids compartido por todos los registros con campo id.
  const seen = new Map<string, string>()
  const seenTranslations = new Map<string, string>()
  const pendingAccess: { pack: string; default?: AccessLevel; ids?: Record<string, AccessLevel> }[] = []

  const claim = (recordId: string, pack: string, file: string): ContentError | null => {
    const prev = seen.get(recordId)
    if (prev !== undefined) {
      return {
        kind: 'duplicate',
        message: `id duplicado "${recordId}" en ${pack}/${file}; ya lo definía ${prev}`,
      }
    }
    seen.set(recordId, `${pack}/${file}`)
    bundle.origin[recordId] = pack
    return null
  }

  for (const pack of packs) {
    bundle.packs.push(pack.id)
    for (const [file, raw] of Object.entries(pack.files)) {
      if (raw === undefined) continue
      const schema = schemaFor(file)
      if (!schema) return err({ kind: 'parse', message: `${pack.id}/${file}: archivo desconocido` })
      const parsed = schema.safeParse(raw)
      if (!parsed.success) {
        return err({ kind: 'parse', message: formatZodError(`${pack.id}/${file}`, parsed.error) })
      }
      const data = parsed.data as unknown

      if (TRANSLATION_FILE.test(file)) {
        for (const t of data as Translation[]) {
          const k = `${t.locale}:${t.key}`
          const prev = seenTranslations.get(k)
          if (prev) {
            return err({
              kind: 'duplicate',
              message: `clave i18n duplicada "${t.key}" (${t.locale}) en ${pack.id}/${file}; ya la definía ${prev}`,
            })
          }
          seenTranslations.set(k, `${pack.id}/${file}`)
          bundle.translations.push(t)
        }
        continue
      }

      if (file === 'diagnostic.json') {
        const d = data as { items: DiagnosticItem[]; scoring: DiagnosticScoring | null }
        for (const item of d.items) {
          const e = claim(item.id, pack.id, file)
          if (e) return err(e)
          bundle.diagnosticItems.push(item)
        }
        if (d.scoring) {
          if (bundle.diagnosticScoring) {
            return err({
              kind: 'duplicate',
              message: `${pack.id}/diagnostic.json redefine scoring, que ya definía otro paquete`,
            })
          }
          bundle.diagnosticScoring = d.scoring
        }
        continue
      }

      if (file === 'access.json') {
        const a = data as { default?: AccessLevel; ids?: Record<string, AccessLevel> }
        pendingAccess.push({ pack: pack.id, ...a })
        continue
      }

      const target = LIST_FILES[file]
      if (!target) return err({ kind: 'parse', message: `${pack.id}/${file}: archivo desconocido` })
      for (const rec of data as { id: string }[]) {
        const e = claim(rec.id, pack.id, file)
        if (e) return err(e)
        ;(bundle[target] as unknown[]).push(rec)
      }
    }
  }

  // El acceso por paquete aplica a los ids que ese paquete definió; el acceso
  // por id manda sobre el del paquete.
  for (const a of pendingAccess) {
    if (a.default) {
      for (const [rid, pack] of Object.entries(bundle.origin)) if (pack === a.pack) bundle.access[rid] = a.default
    }
    for (const [rid, level] of Object.entries(a.ids ?? {})) bundle.access[rid] = level
  }

  return ok(bundle)
}
