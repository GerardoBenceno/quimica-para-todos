# Química para Todos (web)

Aplicación web progresiva (PWA) de química orgánica gamificada: mundos, rutas de lecciones, ejercicios cortos con retroalimentación, XP, monedas, racha, cofres y práctica de errores. Porta a web el MVP diseñado en Flutter (`2026-06-25_quimica-para-todos_guia-tecnica.md`) y agrega motores quimioinformáticos que corren en el navegador: RDKit.js para calificar estructuras dibujadas, Ketcher como editor 2D y 3Dmol.js como visor 3D. Todo corre en el cliente; no hay servidor propio ni claves en el repositorio.

El nombre de marca sale de `APP_DISPLAY_NAME` (`src/app/brand.ts`). Supuestos y decisiones: `DECISIONES.md`. Revisión química y ejercicios derivados: `REPORTE_QUIMICA.md`.

## Cómo correr

Requisitos: Node 22 y npm. Para regenerar moléculas, además Python 3 con las versiones de `requirements.txt`.

```bash
npm install
```

```bash
npm run dev
```

La app queda en `http://localhost:5173/quimica-para-todos/`. Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm test` | Tests con Vitest y Testing Library (incluye RDKit.js real en Node). |
| `npm run validate` | Valida los paquetes de contenido (esquemas, ids, referencias, i18n al 100 %, respuestas en sus opciones, moléculas pregeneradas). |
| `npm run build` | Typecheck estricto y build de producción con la base `/quimica-para-todos/`. |
| `npm run preview` | Sirve `dist/` en `http://localhost:4173/quimica-para-todos/`. |
| `npm run verify -- --steps=welcome,flow,game,draw,view3d,offline,a11y` | Tras `npm run build`: recorre la app en producción con Playwright bajo la ruta base. Falla con cualquier 404, error de consola, violación seria de axe, objetivo táctil menor de 44 px o desplazamiento horizontal. `--shots=<carpeta>` guarda capturas. |
| `npx tsx scripts/import-pack-csv.ts [id]` | Convierte `plantillas/<id>/*.csv` en `public/content/packs/<id>/`, actualiza el manifest, regenera moléculas y valida. Sin argumentos importa todas las carpetas menos `ejemplo`. |
| `npx tsx scripts/export-pack-csv.ts [paquete] [carpeta]` | Exporta un paquete a plantillas CSV (por defecto `base` a `plantillas/ejemplo/`). |
| `npm run art` | Genera `assets/images/` (512 px y 256 px, PNG con alfa) desde los originales de `arte/originales/`. Corre solo antes de `dev`, `build` y `test`. |
| `python3 scripts/gen_molecules.py` | Regenera `public/mol/` (SVG 2D, SDF 3D, `index.json`) y `reports/mol_report.json`. |
| `python3 scripts/gen_metano.py` | Redibuja `arte/originales/asset_metano_tetraedrico.png` (cuñas y líneas discontinuas desde coordenadas ETKDG + MMFF). |
| `npx tsx scripts/gen-share-image.ts` | Regenera `public/og.png`, la imagen que se ve al compartir el enlace (requiere Playwright con Chromium). |
| `npx tsx scripts/derive-web-pack.ts` | Regenera los ejercicios derivados de `public/content/packs/web/`. |

`npm run dev`, `build` y `test` corren antes `scripts/optimize-art.ts` (genera `assets/images/` desde `arte/originales/`), `scripts/sync-base.ts` (copia `seed/` a `packs/base`, `assets/images/` a `public/assets/images/` y actualiza la lista de archivos del manifest) y `scripts/copy-vendor.ts` (copia RDKit.js a `public/vendor/`, carpeta que no se versiona).

## Cómo publicar

1. En GitHub, Settings, Pages, Source: "GitHub Actions".
2. Haz push a `main`. El workflow `.github/workflows/deploy.yml` corre `art`, `validate`, `test` y `build`, y publica `dist/` en `https://<usuario>.github.io/quimica-para-todos/`. En ramas `claude/**` y en pull requests corre las mismas comprobaciones sin publicar.
3. Si el repositorio cambia de nombre, cambia `REPO_NAME` en `vite.config.ts` (o define `VITE_BASE`).

La app usa `HashRouter`, así que las rutas internas no necesitan configuración en GitHub Pages; para las direcciones fuera de la base el build emite una `404.html` propia con la marca y el enlace a la app. El service worker y el manifest usan la ruta base como `scope` y `start_url`. Los metadatos para compartir (`og:url`, `og:image`) usan la URL de GitHub Pages del repositorio declarado en `src/app/brand.ts`; si publicas en otro dominio, define `VITE_SITE_URL`.

## Arquitectura

```
arte/
  originales/               arte del autor, única fuente de verdad (1254 px, PNG con alfa, nombre = id del asset)
  prompts_generacion.txt    guía de estilo con la que se generó
assets/images/              versiones servidas (512 px y @256 px), generadas por scripts/optimize-art.ts
public/
  config/features.json      flags (fuente única en ejecución)
  config/ui.json            tema por defecto, locale, textos de UI, ancho angosto
  config/i18n/ui_es.json    textos de interfaz
  content/manifest.json     paquetes en orden de carga y sus archivos
  content/packs/base/       copia exacta de seed/ (no se edita)
  content/packs/web/        temas web y ejercicios derivados
  assets/images/            imágenes por id (seed/assets.json)
  mol/                      svg/, sdf/ e index.json pregenerados
src/
  app/        marca, rutas, bootstrap, selección de adaptadores, eventos de analítica
  core/       esquemas zod, unión e integridad de paquetes, catálogo de tipos, lógica de juego pura
  models/     tipos TS con los campos del seed
  ports/      interfaces de cada capacidad externa
  adapters/   local/, noop/, ketcher/, rdkit/, threedmol/, supabase/ (stubs), future/ (stubs)
  stores/     contenido, progreso y acciones (Zustand)
  services/   localización, tema, assets, almacenamiento seguro
  engine/     ExercisePlayer, hoja de retroalimentación y types/ (una vista por tipo)
  screens/    bienvenida, diagnóstico, mapa, ruta, lección, resultado, perfil, recompensas, repaso
  ui/         botones, cadena de la ruta, MoleculeView, ChemText, AdSlot, LockBadge
scripts/      gen_molecules.py, validate-content.ts, derive-web-pack.ts, verify-prod.mjs
```

**Puertos y adaptadores.** Pantallas y stores dependen solo de `src/ports/index.ts`. `src/app/adapters.ts` y `src/app/chemAdapters.ts` eligen el adaptador según los flags; los adaptadores futuros se cargan con `import()` dinámico solo si su flag está encendido.

| Puerto | Adaptador actual | Futuro (stub) |
|---|---|---|
| ContentRepository | `JsonPacksContentRepository` | `SupabaseContentRepository` |
| ProgressRepository | `LocalProgressRepository` (localStorage con respaldo en memoria) | `SupabaseProgressRepository` |
| AuthService | `LocalAnonymousAuthService` (UUID local) | `SupabaseAuthService` |
| EntitlementsService | `FreeEntitlementsService` | `ServerEntitlementsService` |
| AdsService | `NoopAdsService` | `ProviderAdsService` |
| AnalyticsService | `NoopAnalyticsService` | `ProviderAnalyticsService` |
| StructureEditor | `KetcherStructureEditor` | otro editor |
| StructureMatcher | `RdkitMatcher` (RDKit.js) | n.d. |
| MoleculeRenderer | `PregeneratedMoleculeRenderer` (SVG pregenerados) | RDKit en runtime |
| MoleculeViewer3D | `ThreeDmolViewer` (3Dmol.js + SDF) | n.d. |

**Contenido por paquetes.** `ContentRepository` carga los paquetes del manifest en orden, valida cada archivo con zod y los une por tipo. Un id repetido entre paquetes es error. Los ids de un paquete distinto de `base` llevan el prefijo `<paquete>_`. `packs/<nombre>/access.json` declara el acceso (`free` por defecto); la UI solo pregunta `EntitlementsService.hasAccess`.

**Flujo.** Bienvenida, diagnóstico saltable, resultado amable, primera lección del mundo recomendado, resultado (XP, aciertos, tiempo, racha) y solo entonces el mapa. Datos del usuario en un documento local bajo el `userId` de `AuthService`.

**PWA.** El precache contiene el shell (con el CSS en línea), los chunks de las pantallas, los paquetes de contenido, las moléculas pregeneradas, el arte (883 KB), las fuentes y 3Dmol.js (unos 2.6 MB, 159 entradas). Ketcher, su worker y los `.wasm` (Indigo y RDKit) quedan fuera y se guardan con `CacheFirst` al primer uso. No se subió `maximumFileSizeToCacheInBytes`.

## Cómo cambiar...

Cada receta toca como máximo dos archivos de código; casi todas, ninguno.

**Agregar un mundo o un paquete de contenido.** Un mundo nuevo del seed: agrégalo en `seed/worlds.json`, `units.json`, `lessons.json`, `exercises.json` y sus textos en `translations_es.json`; corre `npm run validate`. Un paquete nuevo (por ejemplo bioquímica): crea `public/content/packs/bio/` con los archivos que necesite (mismo esquema que el seed, ids con prefijo `bio_`) y agrega `"bio"` a `packs` en `public/content/manifest.json`; `npm run sync:base` completa la lista de archivos. Sin código.

**Agregar contenido desde una hoja de cálculo (sin tocar código).** 1) Copia la carpeta `plantillas/ejemplo/` (exportada del seed con `npx tsx scripts/export-pack-csv.ts base`) y ábrela en Google Sheets o Excel: `mundos.csv`, `unidades.csv`, `lecciones.csv`, `ejercicios.csv`, `diagnostico.csv` (más `diagnostico_scoring.json`), `retroalimentacion.csv` y `traducciones.csv`, una fila por registro y las mismas columnas que el seed. Las columnas con objetos o listas (`payload`, `correct`, `unlock_rule`, `intro`, `prerequisites`) llevan JSON en la celda; una celda vacía es `null`; un texto que parezca número, `true`/`false` o JSON se escribe con apóstrofo inicial (`'123`), como en Excel. 2) Borra las filas del ejemplo y escribe las tuyas con ids con el prefijo del paquete (`bio_w_lipidos`, `bio_e_01`); las claves `*_key` deben existir en `traducciones.csv`. 3) Sube la carpeta como `plantillas/<id>/` (por ejemplo `plantillas/bio/`) desde la web de GitHub. El despliegue instala RDKit y corre `npx tsx scripts/import-pack-csv.ts`, que genera `public/content/packs/<id>/`, agrega el paquete al manifest, genera las moléculas nuevas (SVG y SDF) y valida esquemas e integridad; los errores salen en español con archivo, fila y columna. En tu computadora, el mismo comando. Exportación inversa: `npx tsx scripts/export-pack-csv.ts <id> <carpeta>`. Sin código.

**Agregar un tipo de ejercicio.** 1) Agrega el nombre y su forma de respuesta (`options`, `blanks`, `structure` o `delegate`) en `src/core/exerciseTypes.ts`. 2) Crea su vista en `src/engine/types/<Nombre>.tsx`, que exporte `exerciseTypes = { <tipo>: { View, check? } }`; el registro la toma solo. Dos archivos.

**Cambiar colores o tipografía.** Edita los roles de `web_theme_claro_prusia` y `web_theme_oscuro_prusia` en `public/content/packs/web/themes.json`, o elige otro tema en `public/config/ui.json` (`theme`). Los componentes solo usan variables CSS (`--color-<rol>`, `--fs-<tamaño>`, `--font-sans`, `--mol-highlight`). Una familia tipográfica nueva: cambia `typography.font_family` y declara sus archivos en `src/ui/fonts.css` (un archivo).

**Cambiar textos.** Contenido: `seed/translations_es.json` (o el `translations_es.json` del paquete). Interfaz: `public/config/i18n/ui_es.json`. Sin código.

**Cambiar valores de XP, monedas o racha.** XP y monedas de cada ejercicio y lección: sus campos `xp`, `coins`, `xp_reward`, `coin_reward` en el seed. Respaldos: `app_config` (`rewards.xp`, `rewards.coins`). Cofres: `seed/rewards.json` (`value`, `trigger.every`). Costo de congelar racha: `rw_streak_freeze.trigger.cost_coins`. Pistas y reglas de racha: `app_config` (`rewards.coins.hint_cost`, `streak.rules`). Precedencias en `src/core/game/config.ts`. Sin código.

**Cambiar imágenes o la mascota.** Sube el original a `arte/originales/` con el nombre del id del asset (por ejemplo `asset_carbo_happy.png`), en PNG cuadrado con fondo transparente, idealmente de 1024 a 1254 px por lado y con margen transparente alrededor de la figura. Se puede hacer desde la web de GitHub ("Add file", "Upload files") sin correr nada: el deploy genera las versiones de 512 px y 256 px en `assets/images/` y las publica. Para una ilustración nueva, además agrega su registro en `seed/assets.json` (campo `uri` = `assets/images/<id>.png`) y asígnala donde corresponda (`worlds.json`, `rewards.json`, `characters.json`, `currencies.json` o `intro.image_asset_id` de una lección). La mascota y sus expresiones están en `seed/characters.json`. Las pantallas piden assets por id; si falta un archivo muestran un placeholder. Restricciones: cada versión servida debe pesar 150 KB o menos (el script falla si no), y lo que no tenga original en `arte/originales/` se retira de `assets/images/`. El metano tetraédrico no es arte dibujado: lo genera `scripts/gen_metano.py` con RDKit. Sin código.

**Cambiar el logo, los íconos de la PWA y la imagen para compartir.** Hoy la marca es la cadena en zigzag de `src/ui/BrandMark.tsx` y `public/icons/icon.svg`; los íconos de la PWA (`public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`) se derivan de ella. Si llega un logo oficial: ponlo en `arte/logo.png` (cuadrado, PNG con fondo transparente, al menos 1024 px), reemplaza los tres íconos (192, 512 y maskable con margen de seguridad del 10 %) y `icon.svg`, cambia `BrandMark` para que lo muestre y corre `npx tsx scripts/gen-share-image.ts` para regenerar `public/og.png`. Un archivo de código.

**Agregar o redibujar estructuras.** Edita el SMILES en `seed/` (o en el paquete que lo define), corre `npm run sync:base` si cambió el seed, luego `python3 scripts/gen_molecules.py` (procesa todos los paquetes del manifest) y `npx tsx scripts/derive-web-pack.ts` si cambió un par nombre-estructura. `npm run validate` falla si un SMILES usado no tiene entrada en `public/mol/index.json`. Sin código.

**Encender una función futura.** Pon su flag en `true` en `public/config/features.json` e implementa su adaptador en el stub correspondiente (`src/adapters/supabase/index.ts` o `src/adapters/future/`). Un archivo. Variables de Supabase: copia `.env.example` a `.env`.

**Cambiar de editor de moléculas.** Escribe un adaptador que implemente `StructureEditor` (en `src/adapters/<editor>/`) y devuélvelo en `selectEditor` de `src/app/chemAdapters.ts`. Dos archivos. Si el nuevo editor es usable a 360 px, `src/engine/drawPolicy.ts` decide si se dibuja en pantallas angostas.

## Calidad verificada

- 81 tests (paquetes, unión e ids duplicados, validación por tipo, draw_structure con RDKit.js real, desbloqueos, diagnóstico, barajado, atajos de teclado, respaldo del progreso, racha, cofres, selección de adaptadores, AdSlot, LockBadge, contraste AA de ambos temas con la paleta del autor, render del reproductor con cada tipo).
- `npm run verify` en `vite preview` bajo `/quimica-para-todos/`: flujo completo en celular y escritorio, gamificación, dibujo con Ketcher y calificación con RDKit.js, sustitución por choose_structure a 360 px, visor 3D, reapertura y primera sesión sin conexión, instalabilidad según Chrome, metadatos para compartir y 404 propia, y axe-core en 14 pantallas (incluye Acerca de y la página inexistente).
- Lighthouse 12.8.2 en la bienvenida: rendimiento 93 en móvil y 100 en escritorio; accesibilidad 100; buenas prácticas 100. (La categoría PWA ya no existe en Lighthouse; la instalabilidad se revisa con `Page.getInstallabilityErrors`.)
