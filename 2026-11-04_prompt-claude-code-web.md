# Prompt para Claude Code: Química para Todos (versión web, v7)

Antes de pegarlo:

1. Crea un repositorio en GitHub. Hazlo público si tu cuenta es gratuita, porque GitHub Pages en repos privados requiere GitHub Pro (incluido en el GitHub Student Developer Pack).
2. En el repo, entra a Settings, luego Pages, y en Source elige "GitHub Actions".
3. Sube a la raíz del repositorio el contenido de la carpeta `2026-11-04_quimica-para-todos-web`, menos `00_LEEME_REVISION.md` y `2026-11-04_prompt-revision-codigo.md`, que son solo para la revisión. Debe quedar así:
   - `seed/` (los 14 JSON de contenido)
   - `assets/images/` (los 13 placeholders)
   - `diseno/` (las 6 pantallas de referencia visual en `.dc.html` y sus capturas en `diseno/capturas/`)
   - `2026-06-25_quimica-para-todos_guia-tecnica.md`
   - `supabase_schema.sql`
   - `2026-11-04_prompt-claude-code-web.md` (este archivo)
4. En claude.ai/code abre una sesión sobre ese repo con Opus 5.5 y esfuerzo high, y pega el bloque completo.

---

```text
# PROYECTO: Química para Todos, app web gamificada de química orgánica (PWA)

Eres arquitecto e implementador. Construye una aplicación web progresiva (PWA), instalable en celular y usable en escritorio, que porta a web un MVP diseñado en Flutter. El diseño original está en 2026-06-25_quimica-para-todos_guia-tecnica.md; lee antes de programar las secciones A, B, G, I, J y S. Conserva su arquitectura content-driven y su flujo de usuario, cambia Flutter por un stack web, agrega motores quimioinformáticos que corren en el navegador y deja la app preparada para crecer (backend, login, pagos, anuncios, más contenido) sin implementar nada de eso todavía.

## Modo de trabajo
- La sesión tiene tiempo limitado. No te detengas a preguntar. Toma supuestos razonables, anótalos en DECISIONES.md y sigue.
- Trabaja por hitos en el orden de la sección "Hitos". Al cerrar cada uno, corre tests y build, verifica el sitio en la ruta base de producción y haz commit y push. Si la sesión se corta, lo hecho debe quedar funcionando y publicado.
- Si algo de esta especificación resulta técnicamente inviable, elige la alternativa más cercana, documéntala en DECISIONES.md y continúa.
- Errores químicos en el seed: no los corrijas tú ni inventes correcciones. Regístralos con sus ids en REPORTE_QUIMICA.md, continúa con lo que no dependa de ellos y no marques como aprobada la parte química mientras queden ítems activos con errores conocidos. Las correcciones las hace el autor en seed/, y packs/base se vuelve a copiar de ahí.

## Restricciones duras
- El nombre de marca sale SIEMPRE de una constante APP_DISPLAY_NAME. Nunca el literal en componentes ni strings.
- Todo texto visible es una clave i18n resuelta por (key, locale). Las claves de contenido vienen de los paquetes de contenido; las de UI, de un archivo aparte. Ningún literal de UI en el código. Solo locale "es" por ahora.
- Todo color y tipografía sale de un tema de los paquetes de contenido (themes.json), expuesto como CSS custom properties. El tema por defecto se elige en public/config/ui.json. Cero colores fijos en componentes.
- Assets por id desde seed/assets.json, nunca rutas fijas en componentes. Si falta un archivo, muestra un placeholder y no rompas la app.
- IDs de contenido inmutables. Retirar contenido = is_active=false. El progreso referencia scope por id.
- NO inventes química. Todo enunciado, respuesta y SMILES sale del seed. Los ejercicios nuevos solo reutilizan pares pregunta-respuesta o nombre-estructura que ya existen en el seed.
- NO copies Duolingo (nombres, personajes, colores, assets, "Super", ligas, mascota que regaña). La dirección visual está en diseno/ y en la sección "Diseño"; las reference_images del paquete Flutter quedan descartadas. La mascota es "Carbo" (char_carbo), propia.
- Sin servidor propio en esta fase. Todo corre en el cliente. Ningún secreto ni clave de API en el repo ni en el cliente.

## Stack
- Vite + React + TypeScript con strict: true y skipLibCheck: true. Estado con Zustand. Router con HashRouter (compatible con GitHub Pages sin configurar 404).
- React en la versión más reciente que acepten las peerDependencies de ketcher-react. Si no aceptan React 19, usa React 18.3.1.
- PWA con vite-plugin-pwa (ver "Integración técnica", punto 5).
- Tests con Vitest + Testing Library.
- Tipografía autoalojada para que funcione sin conexión: @fontsource-variable/ibm-plex-sans (subconjuntos latin, latin-ext y greek) y @fontsource/noto-sans-math como respaldo para ≡, → y ⇌.
- Motores químicos, open source: RDKit.js (@rdkit/rdkit) en el navegador, Ketcher (ketcher-react + ketcher-standalone) como editor 2D, 3Dmol.js como visor 3D. RDKit en Python solo para scripts de build.
- Versiones exactas en package.json y en requirements.txt para los scripts de Python.
- Despliegue en GitHub Pages con un workflow de GitHub Actions en cada push a main. base de Vite = "/<nombre-del-repo>/".

## Arquitectura: puertos y adaptadores
Cada capacidad externa vive detrás de una interfaz (puerto) con un adaptador intercambiable. Pantallas y stores dependen solo de las interfaces. Cambiar o agregar un proveedor = escribir un adaptador y registrarlo en el bootstrap, sin tocar pantallas.

| Puerto              | Adaptador actual                                  | Adaptador futuro                              |
|---------------------|---------------------------------------------------|-----------------------------------------------|
| ContentRepository   | JSON por paquetes (ver "Contenido por paquetes")  | Supabase                                      |
| ProgressRepository  | localStorage con try/catch y fallback en memoria  | Supabase con sync local-first                 |
| AuthService         | usuario anónimo local (UUID)                      | Supabase Auth anónima + vinculación de cuenta |
| EntitlementsService | todo gratis                                       | planes pagados verificados en servidor        |
| AdsService          | no-op                                             | proveedor de anuncios                         |
| AnalyticsService    | no-op                                             | GA4 o PostHog                                 |
| StructureEditor     | Ketcher                                           | otro editor si Ketcher no sirve en celular    |
| MoleculeRenderer    | SVG pregenerados                                  | RDKit en runtime                              |
| MoleculeViewer3D    | 3Dmol.js con SDF pregenerados                     | n.d.                                          |

- Feature flags en public/config/features.json: {"auth": false, "cloudSync": false, "payments": false, "ads": false, "analytics": false, "molecules3d": true, "aiFeedback": false, "social": false}. Se leen al arrancar. El seed trae sus propios flags en app_config (features.flags: cloud_sync, ai_feedback, molecules_3d, social); tómalos como valores por defecto y deja que features.json mande, para que en ejecución haya una sola fuente de verdad. Un flag solo decide qué adaptador se usa y si un componente se muestra; nada de lógica de negocio repartida en condicionales por las pantallas.
- Los adaptadores futuros no entran al bundle actual. Se cargan con import() dinámico solo si su flag está encendido.
- Todo el progreso se guarda bajo el userId que entrega AuthService, para que al conectar la nube el progreso local se migre al usuario remoto.

## Contenido por paquetes
- public/content/manifest.json lista los paquetes en orden de carga: ["base", "web"].
- public/content/packs/base/ es la copia exacta de seed/*.json. Nunca se edita a mano.
- public/content/packs/web/ guarda el contenido derivado para los tipos web, con el mismo esquema del seed (exercises.json, translations_es.json y, si hace falta, lessons.json y units.json), y un themes.json con web_theme_claro_prusia y web_theme_oscuro_prusia (ver "Diseño"). El tema oscuro del seed sigue existiendo pero deja de ser el predeterminado.
- ContentRepository carga los paquetes en orden y los une por tipo de registro. Un id duplicado entre paquetes es error de validación, nunca sobrescritura silenciosa. Los ids del paquete web llevan prefijo "web_".
- Un paquete puede traer solo algunos tipos de archivo; los que falten cuentan como vacíos. Así el paquete web existe desde el hito 1 con su themes.json aunque sus ejercicios lleguen después.
- El tema que indique public/config/ui.json manda sobre el campo is_default de los temas.
- Agregar contenido futuro (por ejemplo bioquímica) = crear packs/<nombre>/ y añadirlo al manifest, sin tocar código.
- Acceso opcional por paquete o por id en packs/<nombre>/access.json, con "free" por defecto. Lo consulta EntitlementsService. Hoy todo es "free".

## Estructura de carpetas
public/
  config/features.json
  content/manifest.json
  content/packs/base/     # copia exacta del seed
  content/packs/web/      # derivados
  assets/images/
  mol/                    # svg/, sdf/ e index.json pregenerados
src/
  app/        # APP_DISPLAY_NAME, router, bootstrap (flags, tema, i18n, registro de adaptadores)
  core/       # constantes, Result types, esquemas zod
  models/     # tipos TS que respetan exactamente los campos del seed
  ports/      # interfaces de todos los puertos
  adapters/   # local/, noop/, ketcher/, threedmol/, rdkit/ (+ supabase/ con stubs)
  stores/     # contenido, progreso, recompensas, racha, diagnóstico
  services/   # localization, theme, asset
  engine/     # ExercisePlayer + un componente por tipo + registro type -> componente
  screens/    # welcome, diagnostic, world-map, lesson-path, exercise, result, profile, quests, practice
  ui/         # botones, tarjetas, nodos de ruta, barras, MoleculeView, AdSlot, LockBadge
scripts/
  gen_molecules.py      # SVG 2D + SDF 3D + index.json
  validate-content.ts   # validación de paquetes (corre en CI)

## Modelos y validación
- Tipos TS para World, Unit, Lesson, Exercise, ExerciseOption, UserProgress, DiagnosticResult, Reward, UserReward, Streak, Currency, Asset, Translation, Theme, Character, Mistake, FeedbackTemplate, AppConfig, ContentVersion, LessonAttempt, ExerciseAttempt.
- Esquemas zod. Un paquete mal formado falla al cargar con mensaje claro, no en runtime de una pantalla.
- scripts/validate-content.ts revisa parseo, integridad referencial dentro y entre paquetes, ids únicos, cobertura i18n al 100%, que cada respuesta correcta esté en sus opciones y que todo SMILES usado tenga entrada en public/mol/index.json. Córrelo en CI antes del build. La comprobación de moléculas se activa en el hito 2, junto con el archivo que revisa.

## Contenido (ya en el seed)
- w_carbono (desbloqueado): carbono, hibridación sp/sp2/sp3, tipos de carbono.
- w_grupos (se desbloquea al completar w_carbono): grupos funcionales y clasificación.
- w_nomenclatura_alcanos (se desbloquea tras w_grupos): alcanos lineales, sustituyentes, numeración, ramificados.
- w_estereo y w_reacciones: coming_soon, atenuados, sin lecciones.
- Total: 5 mundos, 6 unidades, 13 lecciones, 50 ejercicios, 8 ítems de diagnóstico, 19 SMILES únicos.
- El seed ya incluye las correcciones químicas del 4 de noviembre de 2026, listadas en CAMBIOS_SEED.md. No las reviertas.

## Flujo de usuario
Respeta la sección I de la guía, incluida la primera sesión "una victoria antes que un menú": bienvenida (un botón, sin registro), diagnóstico saltable, resultado amable, directo a la primera lección del mundo recomendado, pantalla de resultado con XP, precisión y tiempo, y solo después el mapa de mundos.

## Motor de ejercicios
- ExercisePlayer con barra de progreso superior, un ejercicio por pantalla y botón Comprobar deshabilitado hasta que haya respuesta.
- Baraja las opciones de multiple_choice, identify_group, chat_complete y diagnostic, y el banco de fill_blanks, al iniciar cada intento; conserva ese orden durante el intento y valida siempre por value, nunca por posición. En el seed la respuesta correcta va primero en 56 de los 57 ítems con opciones, así que sin barajar se acierta eligiendo siempre la primera. true_false conserva su orden. Los incisos a), b), c), d) se asignan después de barajar.
- Tipos del seed: multiple_choice, true_false, identify_group, fill_blanks, chat_complete, diagnostic. Validación genérica contra correct. Acierto: explanation_key. Error: feedback_template sin bloquear avance y registro en mistakes. Cada intento se guarda en exercise_attempts.
- draw_structure: se muestra un nombre IUPAC y el usuario dibuja la molécula. Se califica en runtime con RDKit.js comparando el SMILES canónico de lo dibujado contra el del seed, después de quitar hidrógenos explícitos e ignorando estereoquímica, porque los nombres del seed no especifican configuración (3-etil-2-metilhexano tiene un estereocentro en C3 y el seed no da R ni S). Usa la opción de SMILES no isomérico si MinimalLib la expone; si no, implementa la comparación equivalente más robusta y documéntala. Si lo dibujado no se puede sanitizar, da el feedback "revisa valencias" sin contarlo como error. Tests con pares equivalentes y no equivalentes, incluido el mismo esqueleto con y sin cuña y con y sin hidrógenos explícitos.
- Derivación de draw_structure: solo desde ejercicios de nomenclatura del seed donde el nombre correcto y su structure_smiles ya están emparejados. No derives de grupos funcionales, porque una familia admite muchas estructuras correctas y la comparación canónica las rechazaría.
- choose_structure (variante para pantallas angostas, ver Integración técnica, punto 4): se muestra el nombre y el usuario elige entre 3 o 4 estructuras dibujadas. Solo se deriva cuando el nombre correcto y al menos dos distractores tienen cada uno su par nombre-SMILES en el seed. Un distractor sin SMILES en el seed (por ejemplo un nombre inválido) no se dibuja nunca.
- view_3d: no crea preguntas. Toma ejercicios existentes del seed que ya traen structure_smiles (hibridación, geometría) y les agrega un visor 3D rotable. Sus respuestas no cambian.
- Lista cada ejercicio derivado o modificado en REPORTE_QUIMICA.md para revisión del autor, con su id de origen.

## Integración técnica de motores químicos (puntos de falla conocidos)
1. Pregeneración de moléculas. scripts/gen_molecules.py usa RDKit en Python (pip install rdkit) para generar, por cada SMILES único de los paquetes enumerados en public/content/manifest.json, un SVG 2D y un SDF 3D (con hidrógenos, ETKDGv3 con semilla fija y optimización MMFF). Dibuja con useBWAtomPalette (heteroátomos en tinta, nunca la paleta CPK por defecto), bondLineWidth 2, fixedBondLength 34 (16 en las miniaturas de los mundos), sin fondo, y sustituye el negro por currentColor para que tome el color del tema. Para resaltar, usa highlightBonds y atomNote para localizadores, y cambia en el SVG el relleno del resaltado por style="fill: var(--mol-highlight, #D5E1F1)" para que también siga al tema. Escribe public/mol/index.json con clave = SMILES literal del seed. Los archivos generados se versionan en el repo; CI no los regenera.
   - MoleculeView incrusta el SVG en el DOM (lo descarga y lo inserta), nunca con img, porque currentColor y las variables CSS no atraviesan una imagen y en el tema oscuro la estructura quedaría negra sobre fondo oscuro. Son archivos propios del build; aun así, rechaza cualquier SVG que traiga script, foreignObject o atributos on*.
   - Comprueba la fórmula molecular de cada SMILES y reporta discrepancias en REPORTE_QUIMICA.md.
   - Si pip falla, genera los SVG con @rdkit/rdkit en Node y obtén el 3D de PubChem PUG REST por POST, con la SMILES en el cuerpo (smiles=...) y nunca en la ruta de la URL, porque caracteres como # y / rompen la ruta. Endpoint: POST https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/SDF?record_type=3d
   - Si no hay 3D para un SMILES, no inventes coordenadas. Marca la entrada sin 3D, desactiva view_3d para ella y anótalo en REPORTE_QUIMICA.md.
2. RDKit.js en runtime solo para draw_structure, con lazy loading. Resuelve el .wasm con locateFile usando import.meta.env.BASE_URL (o un import ?url de Vite), porque en GitHub Pages bajo /<repo>/ la ruta por defecto da 404. Si el glue JS falla al empaquetarse por su rama ENVIRONMENT_IS_NODE con llamadas node:, sírvelo desde public/ como script clásico en vez de importarlo como módulo.
3. Ketcher con lazy loading dentro de adapters/ketcher/, con su CSS y StandaloneStructServiceProvider de ketcher-standalone, para que funcione sin servidor. Publica los recursos estáticos que pida la versión fijada y apunta staticResourcesUrl a import.meta.env.BASE_URL. Verifica en vite preview que el editor arranque, dibuje y exporte sin servidor y sin peticiones 404. Si aparece "global is not defined" o "process is not defined", resuélvelo en vite.config con define (global como globalThis) o un polyfill mínimo, y comprueba que process.env.NODE_ENV se siga reemplazando en producción. Los conflictos de tipos de sus dependencias se contienen con skipLibCheck y tipos propios en el wrapper, sin relajar strict en el resto del proyecto.
4. Ketcher en celular. Prueba el editor a 360 px. Si no es usable (barras que no caben, gestos que no responden), configura una barra de herramientas reducida. Si aun así no sirve, en pantallas de menos de 600 px reemplaza cada draw_structure por su variante choose_structure; los que no tengan variante se omiten de la lección en esas pantallas y no cuentan para completarla. En escritorio se mantiene el dibujo. Antes de cerrar el hito 4 verifica que toda lección con draw_structure se pueda completar a 360 px, y documenta la decisión en DECISIONES.md.
5. PWA y archivos grandes. vite-plugin-pwa, desde la versión 0.20.2, rompe el build si un archivo a precachear supera maximumFileSizeToCacheInBytes (2 MiB por defecto). No subas el límite para meter los motores al precache. Excluye los .wasm y los chunks de Ketcher y RDKit con globIgnores y cachéalos en runtime con CacheFirst al primer uso. Si un chunk propio pasa de 2 MiB, divídelo. El precache contiene solo el shell, los paquetes de contenido y las moléculas pregeneradas. Verifica que manifest, start_url y scope del service worker usen la ruta base.
6. Verificación en producción. Al cerrar cada hito, corre vite build y vite preview con la base de producción y recorre el flujo completo con Playwright si está disponible. Incluye un ejercicio draw_structure y uno view_3d a partir de los hitos en que existen. Que funcione en localhost en la raíz no cuenta como verificado.

## Sistemas de juego
- Progreso por scope (world, unit, lesson) con status y progress. Mundos y unidades se desbloquean con su unlock_rule (requires_world o requires_unit con min_progress). Las lecciones del seed no traen regla, así que dentro de una unidad la primera lección activa por order queda disponible al desbloquearse la unidad y cada siguiente pide completar la anterior; una regla explícita de lección agrega requisitos. Completar una lección es responder todos sus ejercicios, no acertarlos todos.
- XP y monedas: cada ejercicio y cada lección usan los valores de su propio registro (xp, coins, xp_reward, coin_reward), con app_config como respaldo si faltan. rewards.json define valor y cadencia de los cofres. El costo de congelar la racha sale de rw_streak_freeze (trigger.cost_coins), con app_config como respaldo; las reglas de racha y el costo de las pistas salen de app_config. Cofres como nodos de la ruta. Racha que sube con el primer ejercicio del día.
- Diagnóstico: score = suma de weight de los aciertos; máximo = suma de weight de los ítems activos; ratio = score / máximo. El nivel sale solo de diagnostic.scoring.thresholds (límites inclusivos 0.4, 0.75 y 1.0). cfg_diag_thresholds de app_config es configuración heredada con otra escala y se ignora. El mundo recomendado se acota al primer mundo desbloqueado y se registran los temas débiles.
- Perfil con agregados (XP total, racha actual y máxima, mundos completados, ejercicios resueltos, monedas) y botón para reiniciar el progreso local.
- Práctica de errores priorizando los de mayor count.
- Reto contrarreloj al final de cada unidad si el seed lo define; si no, deja el tipo preparado.
- Ningún valor de juego (XP, monedas, costos, umbrales) va fijo en el código. Usa las fuentes y precedencias de esta sección y documéntalas en las recetas del README.

## Espacios para el futuro (preparar, NO implementar)
- Backend y nube: adapters/supabase/ con stubs que implementan las interfaces y lanzan NotImplemented. supabase_schema.sql queda como referencia del modelo. .env.example con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY vacías.
- Login: anónimo primero. El perfil reserva el lugar de "Guardar mi progreso en la nube", oculto mientras auth sea false.
- Pagos: EntitlementsService.hasAccess(scopeId) es la única pregunta que hace la UI sobre acceso. LockBadge se muestra solo si payments es true y el acceso del scope no es "free". Cuando existan pagos, el acceso se decidirá en servidor (webhook o Edge Function), nunca solo en el cliente.
- Anuncios: AdSlot con ubicaciones fijas y permitidas (pantalla de resultado y mapa de mundos) que devuelve null mientras ads sea false. Nunca dentro de un ejercicio ni durante el diagnóstico. Como la audiencia es 13+, cualquier proveedor futuro debe operar en modo no personalizado.
- Analíticas: eventos definidos en un solo archivo según la sección R de la guía, enviados a AnalyticsService no-op.

## Facilidad de cambio
- Escribe en el README una sección "Cómo cambiar..." con una receta corta para cada caso: agregar un mundo o un paquete de contenido, agregar un tipo de ejercicio, cambiar colores o tipografía, cambiar textos, cambiar valores de XP, monedas o racha, cambiar imágenes o la mascota, agregar o redibujar estructuras (editar el SMILES en seed/ o en el paquete que lo define, volver a copiar seed/ a packs/base si cambió y correr scripts/gen_molecules.py para todos los paquetes del manifest), encender una función futura (flag + adaptador) y cambiar de editor de moléculas.
- Si una receta requiere tocar más de dos archivos de código, hay acoplamiento de más y debes refactorizar hasta reducirlo.

## Diseño (dirección visual obligatoria)
La referencia está en diseno/: Main (inicio en escritorio), Ruta, Ejercicio, Retro (retroalimentación), Resultado y Sistema (tokens y componentes), con una captura PNG de cada una en diseno/capturas/. Son HTML con estilos en línea; tómalos como especificación de layout, tokens, estados y textos, no como código para copiar. Si algo de esta sección choca con esos archivos, mandan los archivos, salvo en accesibilidad: todo enlace o control interactivo tiene un área táctil de al menos 44 × 44 px, también en la navegación y en los enlaces secundarios (amplíala con min-height, padding o haciendo clicable la fila completa). Los enlaces dentro de un párrafo quedan exentos. El orden de las opciones en las capturas es ilustrativo; en la app se barajan.

Concepto: la estructura molecular es el elemento protagonista, dibujada como en un libro de texto. La app debe verse como material académico serio, no como una página genérica hecha con IA.

Tokens del tema claro (web_theme_claro_prusia, predeterminado). Usa el esquema de seed/themes.json y agrega los campos que falten:
- Negro de humo #1E1E1E: texto y enlaces de las estructuras.
- Grafito #545B66: texto secundario.
- Azul de Prusia #1D4F91 (hover #163B6C, fondo seleccionado #E8EFF8, halo #C9D6E8): acciones, enlaces, lección en curso.
- Malaquita #1E7A50 (fondo #E7F3EC): correcto.
- Bermellón #B83A2E (fondo #FBECEA): incorrecto.
- Amarillo de cromo #E2A100 solo como relleno, #8A5B00 para texto y bordes: racha, monedas, cofres.
- Resaltado #D5E1F1 (token --mol-highlight; #2F4A70 en el tema oscuro): lo que se señala dentro de una estructura.
- Papel #FFFFFF (superficies), Mesa #F4F6F8 (fondo), Línea #DCE1E7 (divisores), Borde de control #808995.
- Tema oscuro (web_theme_oscuro_prusia) opcional: deriva los mismos roles y verifica contraste AA de cada par.

Tipografía: IBM Plex Sans en toda la app, pesos 400, 500 y 600. Escala 12, 13, 14, 15, 16, 18, 22, 28 y 36 px (13 y 15 para datos secundarios y controles compactos, sin otros tamaños); cuerpo de lectura 18 px con interlineado 1.6 y máximo 62 caracteres por línea. Se eligió porque su I mayúscula con remates separa Cl de CI, y porque incluye griego para σ y π. Nada de texto en mayúsculas sostenidas.

Fórmulas: un componente ChemText convierte al mostrar los dígitos Unicode de subíndice y superíndice del contenido (₀ a ₉, ⁰ a ⁹, ¹ ² ³) en sub y sup, porque la fuente web no trae esos caracteres. El seed no se modifica.

Estructuras: tinta negra, enlace de 2 px y la misma longitud de enlace en todas las figuras grandes. El color dentro de una estructura solo aparece para señalar lo que la explicación menciona. Resalta la cadena principal con localizadores únicamente cuando se deriva sin ambigüedad del nombre correcto del seed; si no, muestra la estructura sin resaltar y anota el caso en REPORTE_QUIMICA.md.

Pantallas:
- Ruta del mundo: cadena en zigzag con ángulo de 120° donde cada vértice es una lección. Completada en tinta con palomita, en curso en Azul de Prusia con halo, bloqueada en blanco con borde. Los cofres cuelgan como ramificaciones cada N lecciones según rewards.json. Los enlaces pendientes van punteados.
- Mapa de mundos: índice en lista, como tabla de contenidos, con miniatura molecular sacada de un SMILES del propio mundo, "n de m lecciones" y estado. Nada de islas ni tarjetas con degradado.
- Ejercicio: enunciado 22/600, figura en panel blanco con borde, opciones como filas a), b), c), d) con role="radio", botón Comprobar abajo, pista con su costo en monedas.
- Retroalimentación: hoja inferior con veredicto, respuesta correcta, explicación del seed, la estructura con lo relevante resaltado y el mensaje de feedback_template.
- Resultado: aciertos, experiencia y tiempo en una lista simple, avance de la racha y la siguiente lección ya disponible.
- Carbo no aparece en las pantallas principales; queda para estados vacíos y mensajes, en trazo lineal del mismo grosor que los enlaces.

Forma y movimiento:
- Radios de 4 px en botones y opciones, 8 px en paneles, 12 px en hojas inferiores; círculo solo para los vértices de la ruta.
- Sin sombras, salvo en lo que flota (hoja de respuesta, menús).
- Movimiento solo como respuesta a una acción. El único momento animado es, al terminar una lección, el enlace que se dibuja hacia el siguiente vértice (stroke-dashoffset, unos 600 ms). Respeta prefers-reduced-motion.

Prohibido, porque delata un diseño genérico: degradados decorativos, emojis, botones píldora, desenfoques o vidrio, brillos y sombras grandes, burbujas o manchas de fondo, hero centrado con chips, saludos como "Bienvenido, futuro químico", rejillas de tarjetas idénticas con la misma sombra, etiquetas en mayúsculas sobre los títulos, flechas pegadas al texto de los botones, animaciones de entrada al hacer scroll y separadores con punto medio.

Accesibilidad: contraste AA, foco visible de 3 px en Azul de Prusia, objetivos táctiles de 44 px o más, navegación por teclado y aria-label en los botones con solo ícono.

## Hitos (en este orden; commit, push y verificación en ruta base al cerrar cada uno)
1. Scaffold Vite + React + TS + PWA, puertos con adaptadores locales y no-op, feature flags, carga y validación de paquetes (todavía sin la comprobación de moléculas), tokens del sistema visual, tipografía, ChemText, i18n, y workflow de GitHub Pages publicando la bienvenida en la ruta base.
2. Primero gen_molecules.py, public/mol/ y MoleculeView, y activa la comprobación de moléculas en validate-content. Después, el flujo completo con los 3 mundos y los 6 tipos del seed siguiendo las pantallas de diseno/: diagnóstico, mapa con miniaturas, ruta, ExercisePlayer con figuras, resultado y persistencia local.
3. Gamificación: XP, monedas, racha, cofres, tienda, perfil y práctica de errores.
4. draw_structure con RDKit.js y Ketcher, y paquete web con los derivados.
5. view_3d con 3Dmol.js.
6. Espacios para el futuro (stubs, AdSlot, LockBadge, .env.example), estados de carga y error, modo offline, revisión del manifest y del service worker en DevTools, prueba de instalación y de reapertura sin conexión bajo la ruta base, Lighthouse de rendimiento y accesibilidad (la categoría PWA ya no existe en Lighthouse) y README con las recetas.

## Tests
- Parseo e integridad de paquetes, unión en orden y error ante id duplicado.
- Validación genérica por tipo de ejercicio, incluida draw_structure con los pares descritos.
- Evaluación de unlock_rule, del desbloqueo secuencial de lecciones y del DiagnosticScorer con la escala de diagnostic.scoring.
- Barajado de opciones: el orden cambia entre intentos, se conserva dentro de un intento y la validación es por value.
- Selección de adaptador según flags; EntitlementsService devuelve "free" por defecto; AdSlot devuelve null con ads en false.
- Render de ExercisePlayer con cada tipo.

## Entregables
- Repo con la app publicada en GitHub Pages.
- README con cómo correr (npm install, npm run dev), cómo publicar, arquitectura y las recetas "Cómo cambiar...".
- DECISIONES.md con todos los supuestos tomados.
- REPORTE_QUIMICA.md con conflictos del seed (si hay), discrepancias de fórmula, moléculas sin 3D y la lista de ejercicios derivados para revisión.

## Qué NO debes hacer
- No hardcodear texto, color, asset, contenido químico ni valores de juego.
- No corregir química del seed en silencio ni editar packs/base.
- No implementar backend, login, pagos ni anuncios; solo puertos, stubs y flags apagados.
- No llamar APIs externas en runtime.
- No subir maximumFileSizeToCacheInBytes para meter los motores al precache.
- No usar personajes, arte ni nombres de Duolingo ni de las imágenes de referencia.
```
