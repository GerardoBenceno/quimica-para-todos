# Química para Todos — Guía técnica de arquitectura y construcción

> Documento de planeación para una app móvil educativa gamificada de química orgánica, pensada para construirse con Claude Code (Supercode Mode) y publicarse en Google Play Store.
>
> **Decisiones fijadas con el usuario (2026-06-25):**
> 1. Público objetivo: general, sin menores de 13 (audiencia 13+).
> 2. Login: anónimo primero, vinculación de cuenta opcional para nube.
> 3. Video: YouTube embebido in-app.
> 4. Nombre provisional: `Química para Todos`, con arquitectura preparada para renombrar.
>
> **Convención de versionado de nombre:** en todo el proyecto el nombre de marca se referencia por la variable `APP_DISPLAY_NAME` y nunca se escribe literal en código. El identificador técnico (applicationId, package, esquema de carpetas) usa un slug neutro `quimica_app` que no cambia aunque cambie la marca. Esto desacopla marca de identidad técnica.

---

## A. Resumen del producto

**Qué será.** `Química para Todos` es una app móvil de aprendizaje de química orgánica estructurada como juego por mundos, rutas y lecciones cortas. El usuario avanza por nodos, resuelve ejercicios de menos de 30 segundos cada uno, gana XP y monedas, mantiene una racha diaria y desbloquea contenido. El modelo pedagógico es práctica recuperativa con retroalimentación inmediata, no lectura lineal de un libro.

**Qué problema resuelve.** La química orgánica de bachillerato y primer año universitario tiene una curva de entrada alta: nomenclatura con muchas reglas, hibridación abstracta, grupos funcionales que se memorizan sin contexto. Los materiales tradicionales (manual escolar, PDF de 168 páginas como el de referencia) son densos y de baja interacción. El producto convierte ese contenido en microejercicios con refuerzo, que es el formato donde la retención por repetición espaciada funciona mejor.

**Para quién.** Audiencia primaria: estudiantes de 13 a 19 años que cursan química orgánica (bachillerato tecnológico, preparatoria, primer semestre universitario). Audiencia secundaria: autodidactas adultos y docentes que quieren material de refuerzo. El MVP se marca como 13+ para evitar el régimen estricto de menores de 13 (COPPA / Families Policy), manteniendo contenido apropiado para adolescentes.

**Qué experiencia tendrá.** Descarga, bienvenida breve, examen diagnóstico de 6 a 10 preguntas, recomendación de mundo inicial, mapa de mundos (algunos bloqueados para sugerir progreso futuro), entrada a un mundo, ruta de lecciones por nodos, intro de lección (texto corto, imagen de estructura, video embebido opcional), 4 a 8 ejercicios cortos, retroalimentación inmediata por acierto y por error, pantalla de resultado con XP, porcentaje, tiempo y recompensa, y persistencia de progreso. Perfil con racha, XP total y avance.

**Qué es educativo.** El contenido químico derivado del manual: química del carbono, hibridación $sp$, $sp^2$, $sp^3$, tipos de carbono, clasificación de compuestos, grupos funcionales, nomenclatura de alcanos. La corrección química es requisito no negociable; toda respuesta correcta se valida contra reglas IUPAC.

**Qué es gamificado.** XP, monedas, cofres, racha diaria, misiones, desbloqueo progresivo, retos contratiempo, estrellas por lección, y barra de progreso por mundo. La gamificación es andamiaje motivacional, no el fin; cada recompensa se ancla a un objetivo de aprendizaje (completar lección, mantener racha, dominar un tema débil).

**Qué debe probar el MVP.** Tres hipótesis: (1) que el formato gamificado retiene al usuario más de un día (retención D1 > 30 %), (2) que un usuario sin conocimientos previos completa la primera lección sin abandonar (tasa de finalización de primera lección > 60 %), (3) que el contenido derivado del manual es suficiente y correcto para enseñar nomenclatura básica de alcanos (precisión promedio de aciertos entre 60 % y 85 %, ni trivial ni frustrante).

**Visión futura.** Sincronización en nube, repetición espaciada con sistema de errores frecuentes, visualizador 3D de moléculas, retroalimentación generada por IA, bilingüe español e inglés, temas y personajes intercambiables, analíticas de aprendizaje y un editor de contenido para agregar mundos sin recompilar.

---

## B. Lectura de las imágenes y del manual

### B.1 Pantallas detectadas en las imágenes

| # | Pantalla | Función en la app | Equivalente de datos |
|---|---|---|---|
| 1 | Mapa de islas (Nomenclatura 0/44 desbloqueada; Grupos Funcionales 0/22, Estereoquímica 0/12, Bosque de Reacciones 0/122 bloqueados) | Navegación principal entre mundos, con estado bloqueado/desbloqueado y contador de progreso | `worlds` + `user_progress` |
| 2 | Score / escalera de proficiencia (Nomenclature Score 65, hitos 60 a 129) | Resultado del diagnóstico y mapa de metas de dominio | `diagnostic_results` + `app_config` (umbrales) |
| 3 | Ruta de lecciones por nodos (Section 1, Unit 56; nodos Identify Chains, Name Alkanes, Branching Rules, cofre, Listen & Practice) | Vista interna de un mundo: secuencia de lecciones y nodos de recompensa | `units` + `lessons` + `user_progress` |
| 4 | Ejercicio "Complete the name" (estructura dibujada, huecos `3-__-2-__hexane`, opciones metil/etil/propil/butil) | Ejercicio de completar nombre | `exercises` tipo `fill_blanks` |
| 5 | Ejercicio "Choose the correct name" (estructura, 4 opciones de nombre IUPAC) | Ejercicio de opción múltiple | `exercises` tipo `multiple_choice` |
| 6 | Ejercicio "Complete the chat" (personaje da dato curioso, usuario completa) | Ejercicio tipo chat con dato curioso | `exercises` tipo `chat_complete` |
| 7 | Resultado de lección "High scorer!" (TOTAL XP 44, GREAT 95 %, SPEEDY 2:50) | Pantalla de cierre de lección con métricas y reclamo de XP | `lesson_attempts` + `rewards` |
| 8 | Quests & Rewards (quest mensual, amigos, misiones diarias, racha 6 días) | Misiones diarias, racha y social | `rewards` + `streaks` + futuro módulo social |
| 9 | Perfil (score, racha 242, XP 4056, cursos completados, moléculas construidas) | Perfil del usuario y estadísticas agregadas | `users` + agregados de `*_attempts` |
| 10 | Intro de unidad / reto contratiempo (Unit 56, estrellas, niveles 1 de 3, hasta 10 XP) | Pantalla previa a reto cronometrado con estrellas | `lessons` tipo `timed_challenge` |
| 11 | Personajes (científico, chica rubia, blob azul, limones amarillos) | Mascotas y guías de la app | `characters` + `assets` |

### B.2 Qué conservar como inspiración

Conservar el patrón estructural, no el arte. Específicamente: el mapa de islas con bloqueo progresivo y contador `n/total` comunica avance de un vistazo; la ruta vertical de nodos con cofres intercalados crea ritmo entre esfuerzo y recompensa; la barra de progreso superior dentro del ejercicio reduce la sensación de longitud; la pantalla de resultado con tres métricas (XP, precisión, tiempo) da cierre claro; la intro de unidad con "gana hasta X XP" fija expectativa antes de empezar. La paleta oscura con acentos de color y la representación de estructuras químicas como ilustración central del ejercicio son acertadas para el dominio.

### B.3 Qué evitar por parecer copia de Duolingo

| Elemento en las imágenes | Riesgo | Reemplazo propuesto |
|---|---|---|
| Personajes limón con expresiones tipo Duo / blob azul | Diseño y lenguaje visual reconocible de Duolingo | Mascota propia ligada a química (ej. un átomo de carbono antropomórfico, un matraz, una abeja de benceno), estilo distinto |
| Chica rubia y científico genéricos | Se parecen a personajes de Duolingo (Lily, Zari) | Elenco propio con identidad química y diversidad |
| Badge "SUPER" | Marca registrada de Duolingo (Super Duolingo) | Nombre propio de suscripción futura, ej. `Plus` o `Pro` |
| "Add your score to LinkedIn" | Función específica de Duolingo | Omitir; si se quiere compartir, tarjeta genérica de logro |
| Leaderboard de amigos estilo ligas | Las "ligas" son seña de identidad de Duolingo | Posponer; si se hace, formato distinto (retos por tema, no ligas semanales) |
| Mascota que "regaña" por romper racha | Tono y meme asociado a Duo | Tono de apoyo, no culpa |

Regla operativa para Claude Code: ningún asset, nombre, color exacto ni copy proviene de Duolingo. Solo se reutiliza la **gramática de interacción** (rutas, nodos, XP, rachas), que es un patrón de producto no protegible, no la expresión concreta.

### B.4 Cómo convertir el mapa de islas en navegación real

El mapa es un grafo de `worlds`. Cada mundo tiene `id`, `slug`, `title`, `status` (`unlocked` / `locked` / `coming_soon`), `unlock_rule` (qué se requiere para desbloquear), `progress` (derivado de `user_progress`), y `order`. La pantalla renderiza tarjetas/islas desde la tabla `worlds` filtrada por estado. Tocar una isla desbloqueada navega a la ruta de lecciones de ese mundo; tocar una bloqueada muestra el requisito ("Completa Química del carbono para desbloquear"). El estado `coming_soon` muestra la isla atenuada sin requisito, solo como teaser. Nada de esto se codifica fijo: el mapa se construye desde datos, de modo que agregar una isla es insertar una fila.

### B.5 Cómo convertir las pantallas de ejercicio en tipos reutilizables

Cada pantalla de ejercicio se abstrae a un **motor de ejercicios** dirigido por datos. Un ejercicio es un objeto con `type` y un `payload` cuya forma depende del tipo. La UI tiene un componente raíz `ExercisePlayer` que recibe el objeto y delega en un widget por tipo (`MultipleChoiceView`, `FillBlanksView`, `IdentifyGroupView`, `TrueFalseView`, `ChatCompleteView`). Agregar un tipo nuevo es: definir el esquema del `payload`, escribir un widget, registrarlo en un mapa `type -> widget`. El resto (barra de progreso, validación, XP, retroalimentación) es común y vive en `ExercisePlayer`. Esto satisface el requisito de "agregar tipos de ejercicio sin reescribir la app".

### B.6 Lectura del manual: mapeo a contenido

El manual `Manual Orgánica 2023.pdf` (168 páginas) tiene tres unidades más anexos. Estructura real detectada:

| Sección del manual | Páginas | Uso en la app |
|---|---|---|
| Unidad 1: Química del carbono, aspectos históricos, concepto de compuesto orgánico | 9–14 | Mundo MVP 1 (intro) |
| Orbitales híbridos del carbono ($sp^3$, $sp^2$, $sp$) | 15–23 | Mundo MVP 1 (hibridación) |
| Tipos de carbono (primario a cuaternario) | 24–30 | Mundo MVP 1 (tipos de carbono) |
| Clasificación de compuestos orgánicos | 31–34 | Mundo MVP 2 (intro) |
| Clasificación por grupo funcional / familias | 35–44 | Mundo MVP 2 (núcleo) |
| Clasificación por estructura | 45–55 | Mundo MVP 2 / futuro |
| Isomería y tipos de isómeros | 56–68 | Futuro (mundo intermedio) |
| Unidad 2: Nomenclatura de alcanos | 69–78 | Mundo MVP 3 (núcleo) |
| Nomenclatura alquenos, alquinos | 79–87 | Futuro |
| Halogenuros de alquilo | 88–90 | Futuro |
| Aromáticos | 91–96 | Futuro |
| Nomenclatura alcoholes, aldehídos, cetonas, éteres, ácidos, ésteres, aminas, amidas | 101–144 | Futuro (un mundo por familia o agrupados) |
| Unidad 3: Reacciones (alcanos, alquenos, alquinos) | 145–165 | Futuro (Bosque de Reacciones) |
| Anexos Construye-T | 166–168 | **Ignorar** (instrucción explícita) |

**Útil para el MVP:** Unidad 1 completa (carbono, hibridación, tipos de carbono) y la clasificación por grupo funcional (Unidad 1, parte final) más nomenclatura de alcanos (Unidad 2, inicio). Esos tres bloques cubren los tres mundos del MVP.

**Para después:** isomería, nomenclatura de las demás familias, aromáticos, reacciones, estereoquímica.

**Ignorar:** anexos Construye-T, rúbricas de heteroevaluación, normas de seguridad de laboratorio y recomendaciones administrativas (páginas 4 a 8 y 12). No son contenido conceptual; las rúbricas a lo sumo inspiran el formato de "criterios de dominio" de una lección, nada más.

**Conversión a mundos, unidades, lecciones, ejercicios.** El mapeo jerárquico es directo: un capítulo del manual se vuelve un `world`, una subsección se vuelve una `unit`, un concepto puntual se vuelve una `lesson`, y cada ejemplo o ejercicio resuelto del manual se vuelve un `exercise`. Ejemplo concreto: la subsección "Hibridación $sp^3$ del carbono" (pp. 16–18) se convierte en una lección con intro de texto e imagen del metano tetraédrico, seguida de 5 ejercicios: dos de opción múltiple (geometría asociada a $sp^3$), uno de verdadero/falso ("el carbono $sp^3$ forma 4 enlaces sigma"), uno de identificar (marcar el carbono $sp^3$ en una estructura) y uno tipo chat con dato curioso. El seed data adjunto ya materializa este mapeo para los tres mundos del MVP.

---

## C. Análisis de Duolingo como referencia de producto

Duolingo es la referencia de **mecánica de producto**, no de marca. Su arquitectura de enganche se descompone en piezas reutilizables y no protegibles. La tabla traduce cada pieza a química orgánica.

| Elemento | Qué hace en Duolingo | Adaptación a química orgánica |
|---|---|---|
| Ruta de aprendizaje | Camino lineal-ramificado de nodos que impone orden y sensación de avance | Ruta por mundo: nodos = lecciones de un tema (ej. hibridación → tipos de carbono → clasificación) |
| Unidades | Agrupan lecciones bajo un objetivo | Unidad = subtema del manual (ej. "Orbitales híbridos") con 3 a 6 lecciones |
| Lecciones cortas | 4 a 15 ítems, menos de 5 min | 4 a 8 ejercicios por lección, menos de 3 min, una idea química por lección |
| XP | Puntos por ítem correcto, moneda de progreso | XP por ejercicio correcto, bonus por reto contratiempo y racha |
| Rachas | Días consecutivos con actividad, presión de pérdida | Racha diaria; congelar racha cuesta monedas (recompensa por constancia) |
| Misiones diarias | Objetivos cortos rotativos | "Completa 1 lección de nomenclatura", "Acierta 5 grupos funcionales seguidos" |
| Cofres | Recompensa sorpresa intercalada en la ruta | Cofre tras un bloque de lecciones: monedas o boost de XP |
| Recompensas | Monedas (gemas), boosts, cosméticos | Monedas para pistas, repetir reto sin penalización, futuros cosméticos |
| Amigos | Refuerzo social, comparación suave | **Posponer** a post-MVP; si se hace, retos por tema, no ligas |
| Rankings / ligas | Competencia semanal por divisiones | **Posponer**; señal de identidad de Duolingo, alto costo de moderación |
| Examen diagnóstico | Ubica al usuario y salta contenido conocido | Diagnóstico de 6 a 10 ítems que recomienda mundo inicial y marca temas débiles |
| Sistema de desbloqueo | Gating por progreso previo | `unlock_rule` por mundo y por unidad; bloqueado hasta cumplir prerrequisito |
| Práctica de errores | Reagrupa ítems fallados para repaso | Tabla `mistakes`: ejercicios fallados se reofrecen en sesiones de práctica |
| Retos contratiempo | Ejercicios rápidos cronometrados por XP extra | `timed_challenge`: gana hasta N XP si aciertas en tiempo, con estrellas |
| Perfil | Identidad, estadísticas, logros | Perfil con XP total, racha, mundos completados, moléculas resueltas |
| Progreso visible | Barras y contadores omnipresentes | Contador `n/total` por mundo, barra por lección, estrellas por reto |

**Lo que NO conviene copiar de Duolingo:** el sistema de vidas (corazones) que bloquea el avance es polémico y frustra; en su lugar, retroalimentación inmediata sin castigar con bloqueo. Las notificaciones agresivas de racha y la mascota que "culpa" generan rechazo; usar tono de apoyo. Las ligas competitivas exigen masa crítica de usuarios y moderación que un MVP no tiene.

**Principio rector:** Duolingo demuestra que el aprendizaje por microejercicios con bucle de recompensa retiene. Se adopta el bucle (intentar → feedback → recompensa → progreso visible), se descarta la estética y la marca.

---

## D. Recomendación de stack tecnológico

### D.1 Comparación

| Criterio | Flutter | React Native / Expo | Kotlin nativo | Unity | WebView / PWA empaquetada |
|---|---|---|---|---|---|
| Velocidad para MVP | Alta | Muy alta (Expo) | Media | Baja para UI de formularios | Muy alta |
| Facilidad para Claude Code | Alta (Dart tipado, un lenguaje) | Muy alta (TS, ecosistema enorme) | Media | Baja (C#, editor visual) | Alta |
| Mantenibilidad | Alta | Alta (cuidando deps nativas) | Alta pero solo Android | Media | Media (depende de WebView) |
| Agregar contenido por datos | Excelente | Excelente | Bueno | Bueno | Excelente |
| Temas / personajes intercambiables | Excelente (ThemeData, assets) | Muy bueno | Bueno | Bueno | Bueno |
| UI gamificada custom (mapas, nodos, dibujo de moléculas) | Excelente (CustomPainter, animaciones) | Bueno (requiere libs) | Bueno | Excelente (es un motor de juego) | Limitado |
| Visualizador 3D futuro | Bueno (model_viewer_plus, flutter_gl, o WebView 3Dmol.js) | Bueno (react-three-fiber, expo-gl) | Bueno (OpenGL/SceneView) | Excelente (nativo 3D) | Bueno (WebGL en WebView) |
| IA futura (HTTP a API) | Trivial | Trivial | Trivial | Trivial | Trivial |
| YouTube embebido | Bueno (youtube_player_iframe) | Bueno (react-native-youtube-iframe) | Bueno | Pobre | Nativo (iframe) |
| Offline | Excelente (Isar, Drift, Hive) | Bueno (WatermelonDB, SQLite) | Excelente (Room) | Medio | Pobre |
| Costo inicial | Cero (open source) | Cero | Cero | Cero hasta umbral de ingresos | Cero |
| Tamaño de app | Medio (~15–25 MB) | Medio-alto | Bajo | Alto (>40 MB) | Bajo |
| Riesgo de rechazo en Play | Bajo | Bajo | Bajo | Bajo | **Alto** (apps WebView puras se rechazan por "poco valor") |

### D.2 Recomendación

**Flutter** como stack primario. Justificación por criterio dominante:

1. **UI gamificada de alta fidelidad sin librerías frágiles.** El producto vive de mapas de islas, rutas de nodos, animaciones de recompensa y dibujo de estructuras químicas. `CustomPainter` y el sistema de animaciones de Flutter renderizan esto de forma consistente en todos los dispositivos, sin la fragmentación de estilos que aparece al combinar librerías nativas en React Native.
2. **Un solo lenguaje tipado, ideal para supervisar a un LLM sin programar.** Como no vas a codificar a mano, importa que el código sea homogéneo y que los errores los atrape el compilador. Dart tipado reduce los fallos silenciosos que en JavaScript se manifiestan en runtime. Claude Code produce Flutter idiomático con alta fiabilidad.
3. **Modelos de datos fuertemente tipados que calzan con el esquema de contenido.** El contenido (mundos, lecciones, ejercicios) se modela como clases con `fromJson`/`toJson`, lo que hace que un seed mal formado falle en parseo, no en pantalla.
4. **Offline de primera clase.** Isar o Drift dan persistencia local robusta para el MVP "anónimo primero", que es exactamente tu decisión de login.
5. **Camino claro a 3D y video.** `youtube_player_iframe` resuelve el video embebido; el 3D futuro se cubre con WebView + 3Dmol.js/RDKit.js (rápido) o `flutter_gl` (nativo) sin cambiar de stack.

**Alternativa fuerte y honesta: React Native con Expo.** Es casi un empate. Gana en dos puntos: Claude Code es marginalmente más fluido en TypeScript, y **EAS Update** permite enviar correcciones de código JavaScript over-the-air sin volver a pasar por revisión de Play, lo cual acelera la iteración. Pierde en consistencia de UI custom y en que el ecosistema de libs nativas introduce mantenimiento. Si priorizaras OTA de código por encima de fidelidad visual, Expo sería defendible. Para tu caso (UI muy custom, supervisor no programador, una sola plataforma objetivo al inicio), Flutter es la elección de menor riesgo.

**Descartados:** Kotlin nativo (duplicaría esfuerzo si luego quieres iOS, y no aporta ventaja decisiva aquí), Unity (sobredimensionado: es un motor de juego 3D, su UI de formularios y texto es pobre y el tamaño de app es alto), WebView/PWA empaquetada (riesgo real de rechazo en Play Store por política de "apps que solo envuelven un sitio web", y mala experiencia offline).

### D.3 Con qué empezar

Empezar con **app móvil real en Flutter, Android primero**, no con prototipo web ni híbrido. Razón: el prototipo web no prueba la experiencia táctil ni la mecánica de Play Store, que es justamente lo que el MVP debe validar. El prototipo visual (MVP 0) se hace **dentro de Flutter** con pantallas navegables y datos falsos, de modo que no se tira código al pasar a MVP 1. iOS se pospone: publicar en App Store agrega costo (99 USD/año) y fricción de revisión que el MVP no necesita.

> Estoy asumiendo que solo te interesa Android al inicio. Si quieres iOS desde el día 1, cámbialo antes de pasarlo a Claude Code: Flutter lo soporta sin cambiar de stack, pero suma la cuenta de Apple Developer y su revisión.

---

## E. Arquitectura general

Arquitectura modular en capas, dirigida por contenido (content-driven), con separación estricta entre presentación, lógica de dominio, datos y servicios. El principio es que **todo lo que cambia con frecuencia (contenido, temas, idioma, reglas de desbloqueo) sea dato, no código**, y que cada subsistema exponga una interfaz para sustituir su implementación (local hoy, remoto mañana) sin tocar el resto.

```
┌──────────────────────────────────────────────────────────────┐
│ PRESENTACIÓN (Flutter widgets, screens, navegación)          │
│  Welcome · Diagnostic · WorldMap · LessonPath · ExercisePlayer│
│  Result · Profile · Quests                                    │
├──────────────────────────────────────────────────────────────┤
│ ESTADO / DOMINIO (controllers, providers: Riverpod)          │
│  ContentController · ProgressController · DiagnosticController │
│  RewardController · StreakController · ThemeController         │
├──────────────────────────────────────────────────────────────┤
│ REPOSITORIOS (interfaces; intercambian local/remoto)         │
│  ContentRepository · ProgressRepository · UserRepository      │
│  ConfigRepository · AssetRepository                           │
├───────────────┬──────────────────────────────────────────────┤
│ FUENTE LOCAL  │ FUENTE REMOTA                                 │
│ JSON bundle   │ Supabase (Postgres + Auth + Storage + Edge)   │
│ Isar/Drift DB │ Remote Config (Firebase) · Analytics (GA4)    │
└───────────────┴──────────────────────────────────────────────┘
```

### E.1 Módulos, datos que manejan y comunicación

| Módulo | Qué hace | Datos que maneja | Cómo se comunica |
|---|---|---|---|
| **App móvil / frontend** | Renderiza pantallas, navegación, animaciones, input | Estado de UI, navegación | Llama a controllers de dominio; nunca toca datos crudos |
| **Backend / API** | Persistencia remota, auth, contenido remoto, futuras funciones | Todo lo sincronizable | Supabase client (REST/Realtime) detrás de repositorios |
| **Base de datos** | Verdad de progreso y contenido | Tablas del modelo (sección G) | Local (Isar/Drift) y remota (Postgres) con sincronización |
| **Almacenamiento de assets** | Imágenes, estructuras, videos, sprites | Archivos binarios + metadatos en `assets` | Supabase Storage (remoto) + bundle local; URLs en `assets` |
| **Sistema de contenido** | Sirve mundos/unidades/lecciones/ejercicios | `worlds`, `units`, `lessons`, `exercises`, `content_versions` | `ContentRepository`: lee JSON local o tablas remotas según `content_version` |
| **Sistema de progreso** | Registra avance, intentos, desbloqueos | `user_progress`, `lesson_attempts`, `exercise_attempts` | `ProgressController` escribe local; sincroniza a remoto si hay cuenta |
| **Sistema de ejercicios** | Motor que valida y puntúa ejercicios | `exercises`, `exercise_options`, `exercise_attempts` | `ExercisePlayer` consume objeto de ejercicio; emite evento de resultado |
| **Sistema de diagnóstico** | Ubica al usuario y recomienda mundo | `diagnostic_results`, ítems marcados `is_diagnostic` | `DiagnosticController` calcula score y mundo recomendado |
| **Sistema de recompensas** | Otorga XP, monedas, cofres | `rewards`, `user_rewards` | `RewardController` reacciona a eventos de progreso |
| **Sistema de perfil** | Agrega estadísticas del usuario | `users` + agregados | `UserRepository` lee/escribe perfil |
| **Sistema de racha** | Cuenta días consecutivos | `streaks` | `StreakController` actualiza al primer evento del día |
| **Sistema de monedas** | Saldo y gasto de moneda blanda | `currencies` (saldo en `users`) | `RewardController` ajusta saldo |
| **Localización / idiomas** | Sirve textos por idioma | `translations`, claves i18n | `LocalizationService` resuelve clave + locale |
| **Temas / personajes** | Cambia paleta, tipografía, mascotas | `themes`, `characters`, `assets` | `ThemeController` aplica `ThemeData`; assets por referencia |
| **Futuro: módulo IA** | Genera retroalimentación/explicaciones | Prompt + respuesta; sin datos sensibles | Edge Function proxy a proveedor LLM; nunca clave en cliente |
| **Futuro: moléculas 3D** | Renderiza moléculas interactivas | SMILES/MOL en `exercises`/`assets` | WebView 3Dmol.js o motor nativo; entrada por string químico |
| **Analíticas** | Eventos de uso y aprendizaje | Eventos anónimos (sección R) | GA4 / PostHog vía servicio `Analytics` con interfaz neutra |
| **Configuración remota** | Flags, umbrales, gating sin recompilar | Pares clave-valor en `app_config` | `ConfigRepository`: Firebase Remote Config o tabla `app_config` |

### E.2 Reglas de acoplamiento

La presentación no conoce Supabase ni JSON: solo habla con controllers. Los controllers no conocen el origen: solo hablan con repositorios (interfaces). Los repositorios deciden local vs remoto. Cambiar de "todo local" (MVP 1) a "nube" (MVP 2) es sustituir la implementación del repositorio, no reescribir pantallas. Esto es lo que permite que la app crezca sin destruirse.

> Estoy asumiendo Riverpod como gestor de estado (tipado, testeable, sin context boilerplate). Si prefieres Bloc, cámbialo antes de pasarlo a Claude Code; la arquitectura de capas no cambia.

---

## F. Backend recomendado

### F.1 Comparación

| Criterio | Firebase | Supabase | Node/NestJS propio | FastAPI propio | Appwrite | Strapi | Directus | Sheets/Airtable |
|---|---|---|---|---|---|---|---|---|
| Login anónimo | Sí, nativo | Sí, nativo | Manual | Manual | Sí | Plugin | Manual | No |
| Login opcional posterior | Sí | Sí (link identity) | Manual | Manual | Sí | Sí | Manual | No |
| Progreso/XP/monedas/racha | Firestore (NoSQL) | Postgres (relacional) | A medida | A medida | Sí | Sí | Sí | Limitado |
| Contenido dinámico | Remote Config + Firestore | Tablas + Storage | A medida | A medida | Sí | CMS | CMS | Sí (prototipo) |
| Lecciones sin recompilar | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Guardar diagnóstico | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Limitado |
| Costo bajo inicial | Free tier amplio | Free tier amplio | Hosting propio | Hosting propio | Free/self-host | Self-host | Self-host | Free |
| Escalabilidad | Muy alta | Alta | Según infra | Según infra | Media | Media | Media | No |
| Facilidad para Claude Code | Alta | Muy alta (SQL claro) | Media | Media | Media | Media | Media | Alta |
| Editar contenido sin código | Media (consola) | Alta (dashboard SQL + futuro CMS) | Baja | Baja | Media | Alta (CMS) | Alta (CMS) | Muy alta |
| IA futura (proxy seguro) | Cloud Functions | Edge Functions | Nativo | Nativo | Functions | Plugin | Hook | No |
| 3D futuro (Storage de modelos) | Storage | Storage | A medida | A medida | Storage | Media | Media | No |
| Modelo de datos | NoSQL | **Relacional** | Cualquiera | Cualquiera | NoSQL/SQL | SQL | SQL | Tabular |

### F.2 Por qué el modelo importa aquí

El contenido de esta app es intrínsecamente relacional: un ejercicio pertenece a una lección, que pertenece a una unidad, que pertenece a un mundo; un intento referencia a un usuario y a un ejercicio; las recompensas referencian usuarios. En NoSQL (Firestore) esto obliga a desnormalizar y a duplicar, lo que complica el versionado de contenido y los reportes de aprendizaje. Postgres modela esto de forma natural, con integridad referencial y consultas analíticas directas (sección R). Por eso el relacional (Supabase) es preferible al documento (Firebase) para este dominio.

### F.3 Recomendación final por etapa

| Etapa | Backend | Razón |
|---|---|---|
| **1. MVP rápido (MVP 0–1)** | **Ninguno: JSON local + Isar/Drift** | Login anónimo "100 % local" elimina backend; cero costo, cero latencia, cero superficie de privacidad. El progreso vive en el dispositivo. |
| **2. Versión seria (MVP 2)** | **Supabase** (Postgres + Auth anónima + Storage + RLS + Edge Functions) | Relacional para el contenido, auth anónima que calza con tu decisión de login, Storage para assets, Edge Functions para el futuro proxy de IA. SQL es fácil de generar y revisar con Claude Code. Free tier suficiente para pruebas cerradas. |
| **3. Versión escalable** | **Supabase como núcleo + servicios añadidos** | Postgres gestionado escala vertical y con réplicas. Si la lógica de IA o analíticas crece, se agregan microservicios (FastAPI/Node) junto a Supabase, sin migrar la base. Para edición de contenido por no técnicos, montar **Directus** sobre el mismo Postgres. |

**Combinación pragmática recomendada para MVP 2 en adelante:** Supabase para datos, auth y storage; **Firebase solo para Analytics (GA4) y Crashlytics**, porque su tooling de métricas móviles y reporte de fallos es superior y gratuito. Es un patrón común y no genera conflicto: cada servicio cubre lo que hace mejor.

> Estoy asumiendo que aceptas depender de un BaaS (Supabase) en lugar de un backend propio. Es la ruta de menor costo y menor mantenimiento para tu caso. Si por requisitos institucionales necesitas backend propio (FastAPI), cámbialo antes de pasarlo a Claude Code; el modelo de datos de la sección G es portable a cualquier Postgres.

---

## G. Modelo de datos

Diseño relacional normalizado. Convenciones: `id` es UUID (texto en local, `uuid` en Postgres); todas las tablas de contenido llevan `content_version` y `is_active`; todas las marcas de tiempo son UTC ISO 8601. "Local/Remoto/Ambos" indica dónde vive el dato. El DDL SQL completo va en el archivo adjunto `supabase_schema.sql`.

### G.1 Tablas

**`users`** — identidad y agregados del usuario. Local + Remoto. Obligatorios: `id`, `created_at`, `is_anonymous`. Campos: `id` (uuid), `is_anonymous` (bool), `display_name` (text, opcional), `locale` (text, default `es`), `theme_id` (text, fk `themes`), `coins` (int, default 0), `xp_total` (int, default 0), `current_streak` (int, default 0), `longest_streak` (int, default 0), `recommended_world_id` (text, fk `worlds`, opcional), `created_at`, `updated_at`. Para después: `email`, `auth_provider`, `avatar_character_id`.

**`worlds`** — islas del mapa. Remoto (cacheado local). Obligatorios: `id`, `slug`, `title_key`, `order`, `status`. Campos: `id`, `slug` (text único), `title_key` (clave i18n), `description_key`, `icon_asset_id` (fk `assets`), `order` (int), `status` (enum `unlocked`/`locked`/`coming_soon`), `unlock_rule` (jsonb: ej. `{"requires_world":"w_carbono","min_progress":1.0}`), `total_lessons` (int, derivable), `content_version`, `is_active`.

**`units`** — agrupan lecciones dentro de un mundo. Remoto (cacheado). Obligatorios: `id`, `world_id`, `title_key`, `order`. Campos: `id`, `world_id` (fk), `title_key`, `subtitle_key`, `order`, `unlock_rule` (jsonb), `content_version`, `is_active`.

**`lessons`** — unidad mínima de aprendizaje. Remoto (cacheado). Obligatorios: `id`, `unit_id`, `title_key`, `order`, `type`. Campos: `id`, `unit_id` (fk), `title_key`, `order`, `type` (enum `standard`/`timed_challenge`/`practice`/`diagnostic`), `intro` (jsonb: `{text_key, image_asset_id, youtube_id}`), `xp_reward` (int), `coin_reward` (int), `star_count` (int, para retos), `unlock_rule` (jsonb), `content_version`, `is_active`. Para después: `spaced_repetition_weight`.

**`exercises`** — ítem evaluable. Remoto (cacheado). Obligatorios: `id`, `lesson_id`, `type`, `prompt_key`, `correct`. Campos: `id`, `lesson_id` (fk, nullable si es ejercicio de banco reutilizable), `type` (enum `multiple_choice`/`fill_blanks`/`identify_group`/`true_false`/`chat_complete`/`diagnostic`), `prompt_key` (clave i18n del enunciado), `payload` (jsonb específico por tipo: estructura, huecos, opciones), `correct` (jsonb: respuesta(s) correcta(s)), `explanation_key` (feedback en acierto), `feedback_template_id` (fk `feedback_templates`, feedback en error), `difficulty` (int 1–5), `xp` (int), `coins` (int), `topic` (text), `prerequisites` (jsonb array de topics), `structure_asset_id` (fk `assets`, opcional), `smiles` (text, opcional, para 2D/3D), `is_diagnostic` (bool), `content_version`, `is_active`. Para después: `ai_feedback_enabled`.

**`exercise_options`** — opciones de respuesta (normalizadas; alternativa a guardarlas en `payload`). Remoto. Obligatorios: `id`, `exercise_id`, `label_key`, `is_correct`. Campos: `id`, `exercise_id` (fk), `label_key`, `value` (text), `is_correct` (bool), `order`. Nota de diseño: para MVP se permite guardar opciones embebidas en `exercises.payload`; la tabla normalizada se usa cuando se quiera reusar opciones o hacer analítica por distractor.

**`user_progress`** — estado de avance por usuario y nodo. Local + Remoto. Obligatorios: `id`, `user_id`, `scope_type`, `scope_id`, `status`. Campos: `id`, `user_id` (fk), `scope_type` (enum `world`/`unit`/`lesson`), `scope_id` (text), `status` (enum `locked`/`available`/`in_progress`/`completed`), `progress` (float 0–1), `stars` (int), `best_accuracy` (float), `updated_at`. Índice único `(user_id, scope_type, scope_id)`.

**`diagnostic_results`** — resultado del examen diagnóstico. Local + Remoto. Obligatorios: `id`, `user_id`, `score`, `recommended_world_id`, `created_at`. Campos: `id`, `user_id` (fk), `score` (int), `level_label` (text), `recommended_world_id` (fk `worlds`), `weak_topics` (jsonb array), `answers` (jsonb: ítem→respuesta), `created_at`.

**`rewards`** — catálogo de recompensas posibles. Remoto. Obligatorios: `id`, `type`, `value`. Campos: `id`, `type` (enum `xp`/`coins`/`chest`/`streak_freeze`/`cosmetic`), `value` (int), `title_key`, `icon_asset_id`, `trigger` (jsonb: condición que la otorga), `content_version`, `is_active`.

**`user_rewards`** — recompensas obtenidas por el usuario. Local + Remoto. Obligatorios: `id`, `user_id`, `reward_id`, `obtained_at`. Campos: `id`, `user_id`, `reward_id` (fk), `source` (text: lección/reto/racha), `obtained_at`, `claimed` (bool).

**`streaks`** — historial de racha. Local + Remoto. Obligatorios: `id`, `user_id`, `last_active_date`, `count`. Campos: `id`, `user_id`, `last_active_date` (date), `count` (int), `freezes_used` (int), `updated_at`. (El valor vigente se duplica en `users.current_streak` para lectura rápida.)

**`currencies`** — definición de monedas (extensible a multimoneda). Remoto. Obligatorios: `id`, `code`, `name_key`. Campos: `id`, `code` (text, ej. `coin`), `name_key`, `icon_asset_id`. El saldo del usuario vive en `users.coins` (MVP monomoneda); la tabla deja la puerta abierta a gemas/energía sin migración.

**`assets`** — metadatos de archivos. Remoto (binarios en Storage) + bundle local. Obligatorios: `id`, `kind`, `uri`. Campos: `id`, `kind` (enum `image`/`sprite`/`structure`/`video`/`icon`/`lottie`), `uri` (URL Storage o ruta bundle), `locale` (opcional), `width`, `height`, `alt_key`, `license` (text, importante para derechos), `content_version`, `is_active`.

**`translations`** — textos por idioma. Remoto (cacheado) + bundle local. Obligatorios: `id`, `key`, `locale`, `value`. Campos: `id`, `key` (text), `locale` (text), `value` (text), `content_version`. Índice único `(key, locale)`. Todo `*_key` de otras tablas resuelve aquí.

**`themes`** — paletas y tipografía. Remoto + bundle local. Obligatorios: `id`, `name`, `colors`. Campos: `id`, `name`, `colors` (jsonb: primary, surface, accent, success, error, etc.), `typography` (jsonb), `is_default` (bool), `content_version`, `is_active`.

**`characters`** — mascotas y guías. Remoto + bundle local. Obligatorios: `id`, `name_key`, `sprite_asset_id`. Campos: `id`, `name_key`, `role` (enum `mascot`/`guide`/`antagonist`), `sprite_asset_id` (fk `assets`), `expressions` (jsonb: estado→asset), `content_version`, `is_active`.

**`mistakes`** — registro de errores para práctica dirigida. Local + Remoto. Obligatorios: `id`, `user_id`, `exercise_id`, `count`, `last_failed_at`. Campos: `id`, `user_id`, `exercise_id` (fk), `topic` (text), `count` (int), `last_failed_at`, `resolved` (bool). Alimenta la práctica de errores y la repetición espaciada futura.

**`feedback_templates`** — retroalimentación preescrita por error. Remoto (cacheado) + bundle local. Obligatorios: `id`, `key`, `message_key`. Campos: `id`, `key` (text), `topic` (text), `message_key` (i18n), `hint_key` (opcional), `severity` (enum `info`/`correction`), `content_version`, `is_active`.

**`app_config`** — configuración remota clave-valor. Remoto (cacheado) + defaults local. Obligatorios: `id`, `key`, `value`. Campos: `id`, `key` (text único), `value` (jsonb), `description`, `updated_at`. Ejemplos: umbrales de diagnóstico, flags de features, costo de congelar racha.

**`content_versions`** — control de versiones de contenido. Remoto + Local (la app guarda la última aplicada). Obligatorios: `id`, `version`, `created_at`. Campos: `id`, `version` (int o semver text), `channel` (enum `stable`/`beta`), `notes`, `min_app_version` (text), `created_at`. La app compara su `content_version` cacheada contra la remota y decide si sincroniza.

**`lesson_attempts`** — intento de una lección completa. Local + Remoto. Obligatorios: `id`, `user_id`, `lesson_id`, `started_at`. Campos: `id`, `user_id`, `lesson_id` (fk), `started_at`, `finished_at`, `accuracy` (float), `xp_earned` (int), `coins_earned` (int), `stars` (int), `duration_seconds` (int), `completed` (bool).

**`exercise_attempts`** — intento de un ejercicio individual. Local + Remoto. Obligatorios: `id`, `user_id`, `exercise_id`, `is_correct`, `created_at`. Campos: `id`, `user_id`, `exercise_id` (fk), `lesson_attempt_id` (fk, opcional), `given_answer` (jsonb), `is_correct` (bool), `time_ms` (int), `created_at`. Es la base de toda la analítica de aprendizaje (sección R).

### G.2 Relaciones (resumen)

`worlds 1—N units 1—N lessons 1—N exercises 1—N exercise_options`. `users 1—N user_progress`, `users 1—N lesson_attempts 1—N exercise_attempts`, `users 1—N diagnostic_results`, `users 1—N user_rewards N—1 rewards`, `users 1—N mistakes N—1 exercises`. `translations`, `assets`, `themes`, `characters`, `feedback_templates`, `app_config`, `content_versions` son transversales referenciadas por clave.

### G.3 Ejemplos JSON

Los ejemplos completos y validados están en `seed/` (adjunto). Versión abreviada inline:

**1. Mundo**
```json
{
  "id": "w_carbono",
  "slug": "quimica-basica-del-carbono",
  "title_key": "world.carbono.title",
  "description_key": "world.carbono.desc",
  "icon_asset_id": "asset_icon_carbono",
  "order": 1,
  "status": "unlocked",
  "unlock_rule": null,
  "total_lessons": 8,
  "content_version": 1,
  "is_active": true
}
```

**2. Unidad**
```json
{
  "id": "u_hibridacion",
  "world_id": "w_carbono",
  "title_key": "unit.hibridacion.title",
  "subtitle_key": "unit.hibridacion.subtitle",
  "order": 2,
  "unlock_rule": { "requires_unit": "u_intro_carbono", "min_progress": 1.0 },
  "content_version": 1,
  "is_active": true
}
```

**3. Lección**
```json
{
  "id": "l_sp3",
  "unit_id": "u_hibridacion",
  "title_key": "lesson.sp3.title",
  "order": 1,
  "type": "standard",
  "intro": {
    "text_key": "lesson.sp3.intro",
    "image_asset_id": "asset_metano_tetraedrico",
    "youtube_id": null
  },
  "xp_reward": 20,
  "coin_reward": 5,
  "star_count": 0,
  "unlock_rule": null,
  "content_version": 1,
  "is_active": true
}
```

**4. Ejercicio de opción múltiple**
```json
{
  "id": "e_sp3_geom",
  "lesson_id": "l_sp3",
  "type": "multiple_choice",
  "prompt_key": "ex.sp3_geom.prompt",
  "payload": {
    "options": [
      { "key": "ex.sp3_geom.opt.tetraedrica", "value": "tetraedrica" },
      { "key": "ex.sp3_geom.opt.trigonal", "value": "trigonal_plana" },
      { "key": "ex.sp3_geom.opt.lineal", "value": "lineal" },
      { "key": "ex.sp3_geom.opt.angular", "value": "angular" }
    ]
  },
  "correct": { "value": "tetraedrica" },
  "explanation_key": "ex.sp3_geom.explain",
  "feedback_template_id": "ft_hibridacion_geom",
  "difficulty": 1,
  "xp": 10,
  "coins": 1,
  "topic": "hibridacion_sp3",
  "prerequisites": [],
  "structure_asset_id": null,
  "smiles": "C",
  "is_diagnostic": false,
  "content_version": 1,
  "is_active": true
}
```

**5. Ejercicio de completar nombre**
```json
{
  "id": "e_complete_dimetil",
  "lesson_id": "l_ramificados",
  "type": "fill_blanks",
  "prompt_key": "ex.complete_dimetil.prompt",
  "payload": {
    "template": "3-{b1}-2-{b2}hexano",
    "blanks": ["b1", "b2"],
    "bank": [
      { "key": "ex.bank.metil", "value": "metil" },
      { "key": "ex.bank.etil", "value": "etil" },
      { "key": "ex.bank.propil", "value": "propil" },
      { "key": "ex.bank.butil", "value": "butil" }
    ],
    "structure_smiles": "CC(C)C(CC)CCC"
  },
  "correct": { "b1": "etil", "b2": "metil" },
  "explanation_key": "ex.complete_dimetil.explain",
  "feedback_template_id": "ft_nomenclatura_sustituyentes",
  "difficulty": 3,
  "xp": 15,
  "coins": 2,
  "topic": "nomenclatura_alcanos_ramificados",
  "prerequisites": ["nomenclatura_alcanos_lineales"],
  "smiles": "CC(C)C(CC)CCC",
  "is_diagnostic": false,
  "content_version": 1,
  "is_active": true
}
```

> Nota química: el ejemplo de la imagen ("3-__-2-__hexano") es ilustrativo de formato. En el seed real cada plantilla se valida contra la cadena principal y la numeración IUPAC de menor localizador. La validación química se hace en la sección de verificación.

**6. Ejercicio de identificar grupo funcional**
```json
{
  "id": "e_identify_oh",
  "lesson_id": "l_grupos_intro",
  "type": "identify_group",
  "prompt_key": "ex.identify_oh.prompt",
  "payload": {
    "structure_smiles": "CCO",
    "structure_asset_id": "asset_etanol",
    "options": [
      { "key": "ex.group.alcohol", "value": "alcohol" },
      { "key": "ex.group.aldehido", "value": "aldehido" },
      { "key": "ex.group.cetona", "value": "cetona" },
      { "key": "ex.group.acido", "value": "acido_carboxilico" }
    ]
  },
  "correct": { "value": "alcohol" },
  "explanation_key": "ex.identify_oh.explain",
  "feedback_template_id": "ft_grupos_funcionales",
  "difficulty": 2,
  "xp": 12,
  "coins": 1,
  "topic": "grupos_funcionales",
  "prerequisites": [],
  "smiles": "CCO",
  "is_diagnostic": false,
  "content_version": 1,
  "is_active": true
}
```

**7. Retroalimentación por error**
```json
{
  "id": "ft_grupos_funcionales",
  "key": "feedback.grupos_funcionales.generic",
  "topic": "grupos_funcionales",
  "message_key": "feedback.grupos_funcionales.message",
  "hint_key": "feedback.grupos_funcionales.hint",
  "severity": "correction",
  "content_version": 1,
  "is_active": true
}
```
con la traducción asociada:
```json
{ "key": "feedback.grupos_funcionales.message", "locale": "es",
  "value": "Revisa el grupo terminal: -OH es alcohol; -CHO es aldehído; C=O en medio de la cadena es cetona; -COOH es ácido carboxílico." }
```

**8. Diagnóstico (ítem)**
```json
{
  "id": "diag_01",
  "lesson_id": null,
  "type": "diagnostic",
  "prompt_key": "diag.01.prompt",
  "payload": {
    "options": [
      { "key": "diag.01.opt.4", "value": "4" },
      { "key": "diag.01.opt.3", "value": "3" },
      { "key": "diag.01.opt.2", "value": "2" },
      { "key": "diag.01.opt.1", "value": "1" }
    ]
  },
  "correct": { "value": "4" },
  "difficulty": 1,
  "topic": "carbono_enlaces",
  "is_diagnostic": true,
  "weight": 10,
  "maps_to_world": "w_carbono",
  "content_version": 1,
  "is_active": true
}
```
con el bloque de resultado del diagnóstico que produce la app:
```json
{
  "id": "dr_user123",
  "user_id": "user123",
  "score": 65,
  "level_label": "Intermedio inicial",
  "recommended_world_id": "w_nomenclatura_alcanos",
  "weak_topics": ["hibridacion_sp2", "carbonos_terciarios"],
  "answers": { "diag_01": "4", "diag_02": "tetraedrica" },
  "created_at": "2026-06-25T18:00:00Z"
}
```

---

## H. Sistema de contenido

El contenido no se escribe en código. Vive como datos versionados que la app lee a través del `ContentRepository`. Esto permite agregar mundos, corregir un nombre IUPAC o traducir sin recompilar (en MVP 2 en adelante) o con un cambio de assets (en MVP 1).

### H.1 Comparación de fuentes

| Fuente | Prototipo rápido | MVP publicable | Versión seria | Versión con editor |
|---|---|---|---|---|
| JSON local (bundle) | **Óptimo** | Sí (con sync opcional) | No como única fuente | No |
| JSON remoto (Storage/CDN) | Bueno | **Bueno** | Bueno | Parcial |
| Base de datos (Postgres) | Excesivo | Sí | **Óptimo** | Sí |
| CMS headless (Directus/Strapi) | Excesivo | Posible | Bueno | **Óptimo** |
| Google Sheets | Bueno para redactar | No en producción | No | No |
| Airtable | Bueno para redactar | Riesgo de límites/costo | No | Parcial |
| Markdown | Bueno para intros de texto | Para texto, no para ejercicios | Complementario | Complementario |
| Seed data local | **Óptimo** | **Óptimo como fallback** | Como bootstrap | Como bootstrap |

### H.2 Recomendación por etapa

- **Prototipo rápido (MVP 0–1):** JSON local en el bundle (`assets/content/*.json`) más seed en la base local. El equipo redacta en Google Sheets o Markdown por comodidad y exporta a JSON con un script. Cero infraestructura.
- **MVP publicable (MVP 2):** Postgres (Supabase) como verdad, con el JSON local como **fallback offline**. La app sincroniza por `content_version`. Editar contenido = editar filas en el dashboard de Supabase.
- **Versión seria:** Postgres como verdad única, con CDN para assets pesados.
- **Versión con editor:** **Directus** montado sobre el mismo Postgres de Supabase. Da una UI de edición a personas no técnicas sin tocar el modelo. Es la respuesta a "panel para editar contenido sin recompilar".

### H.3 Cómo versionar contenido

Cada fila de contenido lleva `content_version` (entero incremental o semver). La tabla `content_versions` registra cada publicación con `channel` (`stable`/`beta`) y `min_app_version`. La app guarda la última versión aplicada. Al iniciar, compara su versión cacheada contra la remota: si la remota es mayor y compatible con la versión de app, descarga el delta y reconstruye la caché local. Los ejercicios nunca se borran físicamente: se marcan `is_active=false` para no romper intentos históricos que los referencian.

### H.4 Cómo evitar que una actualización rompa el progreso

Tres reglas. Primera, **los IDs son inmutables**: una vez publicado `e_sp3_geom`, ese id no se reutiliza para otra cosa; corregir el contenido del ejercicio mantiene el id y sube `content_version`. Segunda, **borrado lógico**: retirar un ejercicio es `is_active=false`, no `DELETE`, de modo que `exercise_attempts` y `mistakes` que lo referencian siguen siendo válidos. Tercera, **el progreso referencia scope estable** (`world`/`unit`/`lesson` por id), no posiciones ordinales; reordenar lecciones (`order`) no altera el progreso porque el progreso no depende del orden sino del id. Con esto, agregar o reordenar contenido nunca invalida el avance del usuario.

### H.5 Bloqueado / desbloqueado

El estado se deriva, no se guarda como verdad fija. Cada `world`/`unit`/`lesson` tiene `unlock_rule` (jsonb declarativo, ej. `{"requires_world":"w_carbono","min_progress":1.0}`). Al renderizar, el cliente evalúa la regla contra `user_progress`: si se cumple, el nodo está `available`; si no, `locked`. El estado `coming_soon` es un valor explícito en `worlds.status` para teasers sin regla. Así, desbloquear un mundo nuevo en una actualización es publicar la fila con su regla; nada hardcodeado.

### H.6 Agregar nuevos mundos

Insertar una fila en `worlds`, sus `units`, `lessons`, `exercises`, las `translations` de sus claves y los `assets`. Subir `content_version` y publicar en `content_versions`. La app lo detecta y lo muestra. Cero recompilación a partir de MVP 2.

### H.7 Cambiar imágenes / personajes

Los assets se referencian por id, nunca por ruta fija en código. Cambiar la mascota es: subir el nuevo sprite a Storage, actualizar `assets.uri` o crear un `asset` nuevo y apuntar `characters.sprite_asset_id` a él. El tema visual completo se cambia activando otro registro en `themes` (`is_default=true`). El `ThemeController` aplica colores y tipografía desde ese jsonb. Esto cumple "cambiar personajes, dibujos, íconos, fondos y tema después".

### H.8 Preparar traducciones futuras

Desde el día 1, **ningún texto de contenido se escribe literal en la UI**: todo es una clave i18n que resuelve en `translations` por `(key, locale)`. El MVP carga solo `locale='es'`. Agregar inglés es insertar filas `locale='en'` con las mismas claves; no se toca código. Las claves usan un esquema jerárquico (`world.carbono.title`, `ex.sp3_geom.prompt`) para legibilidad.

### H.9 Videos y links

El video se modela como `assets.kind='video'` con `uri` que para YouTube guarda el `youtube_id`, y la lección lo referencia en `intro.youtube_id`. El reproductor embebido (`youtube_player_iframe`) lo carga in-app. Para links externos (futuro), un asset `kind='video'` con `uri` de URL completa abre el navegador. Importante de cumplimiento (sección K/L): el embebido de YouTube obliga a respetar los YouTube API Services Terms y a declararlo en Data Safety.

> Estoy asumiendo que los videos serán de terceros (YouTube) y no producción propia alojada. Si vas a alojar tus propios videos, cámbialo antes de pasarlo a Claude Code: conviene Supabase Storage o un CDN, y cambia el cálculo de costos y de Data Safety.

---

## I. Experiencia de usuario completa

### I.1 Flujo paso a paso

1. **Bienvenida.** Una pantalla, no un carrusel largo. Logo, frase de valor ("Aprende química orgánica jugando") y un botón "Empezar". Sin registro. La fricción cero es deliberada: el usuario debe tocar un ejercicio en menos de 60 segundos desde abrir la app.
2. **Diagnóstico.** 6 a 10 ítems de opción múltiple y verdadero/falso, dificultad creciente, cubriendo enlaces del carbono, hibridación, tipos de carbono, grupos funcionales y nomenclatura básica. Barra de progreso visible. Se puede saltar ("No sé, empezar desde el principio") para no frustrar.
3. **Resultado de diagnóstico.** Pantalla tipo "score" (inspirada en la imagen 2): puntaje, etiqueta de nivel y los temas débiles detectados. Tono positivo, sin reprobar.
4. **Recomendación de mundo.** A partir del score y los temas débiles, la app destaca un mundo inicial ("Te recomendamos empezar en: Química básica del carbono") con un botón directo. El usuario puede ignorar la recomendación y elegir otro mundo desbloqueado.
5. **Mapa de mundos.** Islas con estado y contador `n/total`. La isla recomendada resaltada; otras desbloqueadas accesibles; bloqueadas con su requisito; `coming_soon` atenuadas.
6. **Mundo bloqueado / desbloqueado.** Tocar una bloqueada muestra "Completa X para desbloquear". Tocar `coming_soon` muestra "Próximamente". Tocar una desbloqueada entra a su ruta.
7. **Entrada al mundo.** Encabezado del mundo, progreso, y la ruta de lecciones por nodos.
8. **Introducción por texto o video.** Antes de los ejercicios de una lección, intro breve: texto corto (2 a 4 frases), imagen de estructura, y video YouTube embebido opcional. El usuario puede saltar la intro y ya.
9. **Ruta de lecciones.** Nodos verticales: lecciones, cofres intercalados, reto contratiempo al final de la unidad. El nodo activo resaltado; los siguientes atenuados hasta desbloquear.
10. **Ejercicios.** 4 a 8 por lección, servidos por el `ExercisePlayer`. Barra de progreso superior. Un ejercicio por pantalla. Botón "Comprobar" deshabilitado hasta que haya respuesta.
11. **Retroalimentación.** Inmediata. En acierto: confirmación verde breve más `explanation_key` (por qué es correcto). En error: panel con `feedback_template` (qué revisar), sin bloquear el avance; el ejercicio fallado se registra en `mistakes`.
12. **Resultado de lección.** Pantalla de cierre (inspirada en imagen 6): XP ganado, porcentaje de aciertos, tiempo, estrellas y recompensa. Botón "Reclamar" que anima el conteo de XP.
13. **XP.** Suma a `xp_total`; alimenta nivel de perfil y misiones.
14. **Monedas.** Se otorgan por lección y reto; se gastan en pistas y en congelar racha.
15. **Cofres.** Nodo de recompensa en la ruta; al abrir, animación y monedas o boost de XP.
16. **Racha.** Primer ejercicio del día incrementa la racha; se muestra en home y perfil; congelarla cuesta monedas.
17. **Perfil.** XP total, racha actual y máxima, mundos completados, ejercicios resueltos, temas dominados. Sin datos personales obligatorios.
18. **Repetición de errores.** Sección "Practicar errores" que reofrece ejercicios de `mistakes` priorizando los más fallados.
19. **Desbloqueo de nuevos caminos.** Al completar una unidad/mundo, la siguiente se evalúa contra su `unlock_rule` y pasa a `available` con una animación de desbloqueo.
20. **Reto contratiempo.** Pantalla de intro (imagen 11): "Acierta todo en tiempo para ganar la estrella, hasta N XP". Ejercicios rápidos; recompensa por velocidad y precisión.

### I.2 Propuesta de primera sesión (que no se sienta perdido)

Sesión objetivo: menos de 5 minutos, una sola victoria clara.

1. Bienvenida (1 toque).
2. Diagnóstico corto de 6 ítems con opción de saltar. Mensaje: "Esto solo nos dice por dónde empezar".
3. Resultado amable: "Tu punto de partida: Química básica del carbono" (aunque haya hecho bien el diagnóstico, en el MVP siempre se recomienda un mundo desbloqueado real).
4. Llevar directo, sin pasar por el mapa, a la **primera lección** del mundo recomendado (un solo botón "Empezar mi primera lección"). El mapa se descubre después, no antes; reduce parálisis.
5. Primera lección diseñada para ganar: 4 ejercicios, dificultad 1 a 2, intro de 3 frases. La probabilidad de completarla con > 75 % debe ser alta por diseño.
6. Pantalla de resultado celebratoria con la primera recompensa (XP + 1 cofre) y "racha: día 1".
7. Recién entonces, mostrar el mapa de mundos con la siguiente lección ya señalada, para fijar el siguiente paso.

El principio: **una victoria antes que un menú**. El usuario primero gana algo, luego explora.

---

## J. Diseño del MVP

Cuatro escalones. Cada uno es entregable y demostrable por separado. El criterio transversal: nada de lo construido en un escalón se tira en el siguiente.

### MVP 0 — Prototipo visual

- **Incluye:** todas las pantallas navegables en Flutter con datos falsos en memoria (bienvenida, diagnóstico, mapa, ruta, los 5 tipos de ejercicio, resultado, perfil). Tema visual base. Sin persistencia, sin lógica de puntuación real.
- **No incluye:** validación real de ejercicios, progreso guardado, backend, contenido del manual.
- **Esfuerzo relativo:** 1x (referencia).
- **Riesgos:** caer en pulir arte antes de validar flujo. Mitigar usando placeholders.
- **Entregables de Claude Code:** proyecto Flutter compilable, navegación completa, componentes UI base, mock data, tema aplicado.

### MVP 1 — Funcional local

- **Incluye:** motor de ejercicios real con validación; los 3 mundos del MVP con contenido del manual cargado desde JSON local; progreso, XP, monedas, racha y cofres persistidos en base local (Isar/Drift); diagnóstico funcional que recomienda mundo; práctica de errores; perfil con estadísticas reales.
- **No incluye:** cuenta, nube, contenido remoto, analíticas en servidor.
- **Esfuerzo relativo:** 2.5x.
- **Riesgos:** que el contenido químico tenga errores (mitigar con verificación, sección de validación) o que el MVP crezca demasiado (recorte sugerido más abajo).
- **Entregables de Claude Code:** motor de ejercicios con los 5 tipos, repositorios local, seed cargado, persistencia, sistema de recompensas y racha, pantallas conectadas a datos reales.

### MVP 2 — Backend básico

- **Incluye:** Supabase con auth anónima; sincronización de progreso a la nube; contenido servido desde Postgres con fallback al JSON local; `content_version` operativo; vinculación opcional de cuenta; analíticas (GA4) y Crashlytics.
- **No incluye:** IA, 3D, social, editor de contenido, pagos.
- **Esfuerzo relativo:** 2x.
- **Riesgos:** complejidad de sincronización local↔remoto (mitigar con estrategia "local-first, push diferido") y configuración de RLS (mitigar con políticas plantilla del esquema adjunto).
- **Entregables de Claude Code:** integración Supabase, repositorios remotos detrás de las mismas interfaces, migración SQL aplicada, capa de sync, instrumentación de analíticas.

### MVP 3 — Play Store testing

- **Incluye:** build release firmado (AAB), Play App Signing, ficha de tienda, política de privacidad publicada, Data Safety, content rating, internal testing y luego closed testing con testers; ciclo de correcciones.
- **No incluye:** lanzamiento abierto a producción (eso es Fase 6).
- **Esfuerzo relativo:** 1.5x.
- **Riesgos:** rechazo por Data Safety incompleta, por permisos no justificados, por requisito de testers; cambios de política de Google (verificar al momento).
- **Entregables de Claude Code:** configuración de firma y `build.gradle`, flavors debug/release, generación de AAB, checklist de tienda, textos de ficha base, borrador de política de privacidad.

### J.1 Si el MVP sigue siendo grande: recorte recomendado

Si hay que recortar para una primera prueba real, **comprimir a un solo mundo y tres tipos de ejercicio**:

- Un solo mundo: "Química básica del carbono" (2 unidades, 5 lecciones).
- Tres tipos de ejercicio: `multiple_choice`, `true_false`, `fill_blanks`. Posponer `identify_group` y `chat_complete`.
- Diagnóstico de 6 ítems que siempre recomienda ese mundo.
- Sin nube (solo MVP 1 local).
- Mantener: XP, monedas, racha, cofres, perfil, práctica de errores, resultado de lección.

Esto valida las tres hipótesis del producto (retención, finalización, corrección del contenido) con un tercio del contenido. Los otros dos mundos y los tipos de ejercicio restantes se agregan después sin tocar arquitectura, porque todo es dato.

---

## K. Estrategia para Google Play Store

> **Advertencia de vigencia:** los requisitos de Google Play cambian con frecuencia (target API level anual, reglas de Data Safety, requisito de testers para cuentas personales nuevas, políticas de menores e IA). Todo lo de esta sección debe **reverificarse en la Play Console y en la documentación oficial justo antes de publicar**. Lo que sigue es el procedimiento y los puntos de control, no una garantía de los umbrales exactos del día de publicación.

### K.1 Probar antes de publicar

Tres niveles de prueba antes de tocar producción: emulador y dispositivo físico (humo y funcional), **internal testing** (hasta ~100 testers, distribución casi inmediata, ideal para iterar), y **closed testing** (lista cerrada de testers, requerido para validar estabilidad y, para cuentas de desarrollador personales creadas recientemente, suele exigirse un periodo de pruebas cerradas con un número mínimo de testers durante varios días antes de poder solicitar producción). Reverificar el requisito de testers vigente.

### K.2 Debug vs release

Build **debug**: sin firmar para distribución, con logs y assertions, para desarrollo. Build **release**: optimizado, ofuscado (R8/ProGuard), firmado, sin logs sensibles. Solo el release se sube a Play. Configurar flavors para separar endpoints (Supabase de pruebas vs producción) y claves.

### K.3 APK vs AAB

Play exige **AAB** (Android App Bundle) para apps nuevas; el APK ya no se acepta como formato de publicación. El AAB permite a Google generar APKs optimizados por dispositivo. Para probar el AAB localmente se usa `bundletool`. Claude Code genera el AAB con `flutter build appbundle --release`.

### K.4 Firma de la app y Play App Signing

Se genera una **upload key** (keystore propio que debes resguardar y respaldar; si lo pierdes sin Play App Signing, pierdes la capacidad de actualizar). Con **Play App Signing** (recomendado y por defecto), Google administra la clave de firma final; tú firmas con la upload key y Google re-firma. Guardar el keystore, su contraseña y los alias en un gestor seguro, nunca en el repositorio.

### K.5 Version code y version name

`versionCode` (entero) se incrementa en cada subida; Play rechaza un `versionCode` repetido o menor. `versionName` (texto, ej. `1.0.0`) es la versión legible para el usuario. En Flutter ambos se controlan en `pubspec.yaml` (`version: 1.0.0+1`, donde `+1` es el `versionCode`).

### K.6 Canales de publicación

Orden: **internal testing** (rápido, equipo) → **closed testing** (testers invitados, valida estabilidad y cumple requisito de pruebas) → **open testing** (opcional, beta pública) → **production**. Cada salto pasa por revisión de Google.

### K.7 Ficha de Play Store

Necesarios: **nombre de la app** (usa `APP_DISPLAY_NAME`, máx. 30 caracteres), **ícono** (512×512 PNG), **gráfico destacado** (1024×500), **screenshots** (mínimo 2, recomendado 4 a 8 por tipo de dispositivo, teléfono obligatorio), **descripción corta** (máx. 80 caracteres), **descripción larga** (máx. 4000), categoría (Educación), **política de privacidad** (URL pública obligatoria), **Data Safety** (formulario de datos recopilados), **content rating** (cuestionario IARC), **target audience and content** (declarar 13+), y datos de contacto del desarrollador.

### K.8 Revisión de Google y producción

Tras enviar a producción, Google revisa (de horas a varios días). Si aprueba, se publica según el rollout configurado (recomendado **staged rollout**: 10 % → 50 % → 100 % para detectar fallos con bajo impacto). Las actualizaciones siguen el mismo flujo con `versionCode` incrementado.

### K.9 Qué puede causar rechazo

Data Safety inconsistente con lo que la app realmente hace; permisos solicitados sin justificación (la app no debería pedir más que red y, si acaso, notificaciones); política de privacidad ausente o inaccesible; content rating mal declarado; uso de marcas o assets de terceros (riesgo si el arte se parece a Duolingo, por eso el rediseño de personajes es obligatorio); apps que solo envuelven una web (razón extra para no usar WebView pura); metadatos engañosos; crashes en revisión.

### K.10 Cuidados específicos

- **Si la usan menores:** aunque el target sea 13+, si Google estima que atrae a menores, aplica **Families Policy**. Evitar ads personalizados, no recopilar datos de menores, declarar audiencia con precisión. Mantener contenido apropiado.
- **Si usas YouTube:** el embebido obliga a cumplir los **YouTube API Services Terms** y la privacidad de Google; declararlo en Data Safety (la reproducción puede implicar recopilación de datos por YouTube). Considerar que el contenido embebido sea de canales con licencia adecuada.
- **Si usas IA (futuro):** declarar funciones de IA generativa; Google tiene política específica para apps con IA generativa (moderación de contenido, reporte de contenido ofensivo, no generar contenido prohibido). No exponer claves de API en el cliente.
- **Si recolectas analíticas:** declarar exactamente qué se recoge (identificadores, eventos), su finalidad y si se comparte con terceros (GA4 = Google). Ofrecer forma de no rastrear si aplica.
- **Si agregas rankings, amigos o login:** entran datos personales y contenido generado por usuario; requiere moderación, posiblemente verificación de edad, y mayor detalle en privacidad y Data Safety.

### K.11 Checklist final de publicación

```
[ ] AAB release firmado con upload key (keystore respaldado fuera del repo)
[ ] Play App Signing habilitado
[ ] versionCode incrementado, versionName correcto
[ ] applicationId definitivo (no cambiar tras publicar)
[ ] target API level cumple el mínimo vigente de Google (verificar)
[ ] Permisos mínimos justificados (INTERNET; nada superfluo)
[ ] Política de privacidad publicada en URL accesible
[ ] Formulario Data Safety completo y veraz (incluye YouTube, analíticas)
[ ] Content rating (IARC) completado
[ ] Target audience declarado 13+ y revisado contra Families Policy
[ ] Ficha: nombre, ícono 512, destacado 1024x500, 4-8 screenshots, descripciones
[ ] Categoría Educación
[ ] Internal testing pasado sin crashes
[ ] Closed testing con testers requeridos durante el periodo vigente
[ ] Cumplimiento YouTube API Terms documentado
[ ] Staged rollout configurado
[ ] Datos de contacto del desarrollador correctos
[ ] Reverificación final de políticas el día del envío
```

---

## L. Privacidad, menores y datos

### L.1 Decisiones desde el inicio (ya fijadas y sus consecuencias)

- **Público:** general 13+, sin menores de 13. Consecuencia: se evita el régimen COPPA estricto, pero si la app atrae menores, aplica Families Policy de Google; el diseño debe ser apropiado y sin recolección excesiva.
- **Login:** anónimo primero. Consecuencia: en MVP 1 no se recolecta ningún dato personal (todo local). En MVP 2, la auth anónima de Supabase crea un identificador técnico sin email; el progreso se asocia a ese id sin PII. La cuenta opcional (email/Google) solo se pide si el usuario quiere respaldo en nube, con consentimiento explícito.
- **Videos:** YouTube embebido. Consecuencia: declarar en Data Safety que la reproducción puede implicar recolección por YouTube/Google; cumplir YouTube API Terms.

### L.2 Qué datos guardar y cuáles no

| Guardar | No guardar (MVP) |
|---|---|
| Identificador técnico anónimo (uuid) | Nombre real, dirección, teléfono |
| Progreso, XP, monedas, racha | Ubicación precisa |
| Intentos y errores (para aprendizaje) | Contactos, fotos, micrófono |
| Locale e idioma | Datos biométricos |
| Email solo si vincula cuenta (opt-in) | Identificadores publicitarios (sin ads) |
| Eventos de analítica anónimos | Datos sensibles de cualquier tipo |

Principio de minimización: recolectar lo mínimo para que el producto funcione y para medir aprendizaje, nada más.

### L.3 Analíticas

Usar GA4 o PostHog con eventos **anónimos** y sin PII (sección R). Documentar cada evento. Si se quiere mayor garantía de privacidad, PostHog self-host evita compartir con Google. Declarar en Data Safety con precisión.

### L.4 Qué debe decir la política de privacidad

Qué datos se recogen y con qué finalidad; que el uso base es anónimo; que el progreso se guarda local y, si el usuario lo elige, en la nube (Supabase); que se usan analíticas anónimas (nombrar proveedor); que se embebe YouTube y eso implica el procesamiento de datos por Google; que no se venden datos; los derechos del usuario (acceso, borrado) y un contacto; y la política para menores. Generar con el prompt secundario adjunto y revisar con criterio legal antes de publicar.

### L.5 Riesgos futuros y mitigación

- **IA futura:** nunca enviar PII al proveedor LLM; proxy por Edge Function con la clave en el servidor; moderar entradas y salidas; declarar la función. 
- **Amigos / rankings futuros:** introducen contenido y datos de usuario; exigen moderación, posible verificación de edad y actualización de privacidad y Data Safety.
- **Reducción de riesgo legal y de publicación:** mantener minimización de datos, rediseñar todo asset para no parecer Duolingo, mantener la política de privacidad y Data Safety sincronizadas con lo que la app realmente hace, y reverificar políticas antes de cada publicación.

> Estoy asumiendo que el MVP no mostrará anuncios ni cobrará. Si planeas ads o pagos, cámbialo antes de pasarlo a Claude Code: ambos cambian Data Safety, content rating, la política de privacidad y, con menores potenciales, las reglas de ads personalizados.

---

## M. Plan de desarrollo por fases

| Fase | Objetivo | Tareas | Entregables | Riesgos | Criterio para avanzar |
|---|---|---|---|---|---|
| **0. Planeación** | Fijar decisiones y materiales | Confirmar stack, backend, audiencia, login, videos; preparar seed y esquema; definir identidad visual propia | Esta guía, seed JSON, esquema SQL, prompt maestro, decisiones cerradas | Decisiones ambiguas que obliguen a rehacer | Decisiones críticas cerradas y seed validado |
| **1. Prototipo visual (MVP 0)** | Validar flujo y navegación | Scaffold Flutter, navegación, componentes UI, tema, mock data, todas las pantallas | App navegable con datos falsos | Pulir arte antes de validar flujo | Recorrido completo navegable sin crashes |
| **2. MVP funcional local (MVP 1)** | Producto jugable sin backend | Motor de ejercicios (5 tipos), carga de seed, persistencia local, XP/monedas/racha/cofres, diagnóstico, práctica de errores, perfil | App jugable offline con contenido real de 3 mundos | Errores químicos en contenido; MVP demasiado grande | 1 mundo completable de inicio a fin con progreso persistente |
| **3. Backend y nube (MVP 2)** | Sincronización y contenido remoto | Integrar Supabase, auth anónima, repos remotos, sync local-first, content_version, analíticas, Crashlytics | App con progreso en nube y contenido actualizable | Complejidad de sync; RLS mal configurada | Progreso sincroniza entre reinstalaciones; contenido se actualiza sin recompilar |
| **4. Pruebas internas** | Estabilidad técnica | Build release, internal testing, corrección de crashes, telemetría básica | AAB en internal testing, panel de crashes limpio | Crashes en dispositivos reales variados | Cero crashes críticos en internal testing |
| **5. Closed testing** | Validación con usuarios reales | Reclutar testers, cumplir periodo de pruebas, recoger métricas y feedback, iterar | Closed testing activo con métricas D1/D7 | No alcanzar número/periodo de testers requerido | Métricas mínimas alcanzadas y feedback incorporado |
| **6. Producción** | Lanzamiento público | Ficha final, Data Safety, content rating, staged rollout, monitoreo | App en producción con rollout gradual | Rechazo en revisión; fallos en rollout | App aprobada y estable en 100 % de rollout |
| **7. Expansión** | Crecer sin romper | Nuevos mundos/unidades, inglés, temas/personajes, 3D, IA, repetición espaciada, editor (Directus) | Releases incrementales por `content_version` y `versionCode` | Regresiones al crecer | Cada feature nueva no rompe progreso ni contenido existente |

---

## N. Checklist técnico para Claude Code

Lista por módulos. Cada ítem es una tarea accionable. El orden respeta dependencias (de arriba hacia abajo dentro de cada bloque).

**Proyecto base**
- [ ] Crear proyecto Flutter con `applicationId` neutro (ej. `app.quimica.quimica_app`).
- [ ] Configurar `pubspec.yaml` con `version: 0.1.0+1` y dependencias base (riverpod, go_router, isar/drift, freezed, json_serializable, youtube_player_iframe).
- [ ] Definir `APP_DISPLAY_NAME` como constante única; no escribir el nombre literal en ningún otro lugar.
- [ ] Estructura de carpetas por capas (ver prompt maestro).
- [ ] Configurar flavors `dev` y `prod`.

**Navegación**
- [ ] Router declarativo (go_router) con rutas: welcome, diagnostic, world_map, lesson_path, exercise_player, result, profile, quests, practice.
- [ ] Guardas de navegación según estado de onboarding/diagnóstico.

**Tema visual**
- [ ] `ThemeController` que aplica `ThemeData` desde un registro `themes` (jsonb de colores y tipografía).
- [ ] Tema oscuro base con acentos; tokens de color centralizados (sin colores hardcodeados en widgets).

**Componentes UI**
- [ ] Botón primario, tarjeta de isla, nodo de ruta, barra de progreso, panel de feedback, chip de opción, contador animado de XP, tarjeta de recompensa.

**Pantalla de bienvenida**
- [ ] Una pantalla, logo, frase, botón "Empezar"; sin registro.

**Diagnóstico**
- [ ] `DiagnosticController` que sirve ítems `is_diagnostic`, calcula score y `recommended_world_id` y guarda `diagnostic_results`.
- [ ] Pantalla de resultado tipo score con nivel y temas débiles.

**Mapa de mundos**
- [ ] Render desde `worlds` con estados unlocked/locked/coming_soon y contador `n/total` desde `user_progress`.
- [ ] Evaluación de `unlock_rule` en cliente.

**Ruta de lecciones**
- [ ] Render de `units`+`lessons` como nodos verticales con cofres y reto al final.
- [ ] Estado por nodo (available/in_progress/completed/locked).

**Motor de ejercicios**
- [ ] `ExercisePlayer` que recibe un `Exercise`, muestra barra de progreso, valida y emite resultado.
- [ ] Registro `type -> widget`; validación genérica contra `correct`.
- [ ] Registro de cada intento en `exercise_attempts` y, en error, en `mistakes`.

**Ejercicios de opción múltiple**
- [ ] `MultipleChoiceView` con selección única y comprobación.

**Ejercicios de completar nombre**
- [ ] `FillBlanksView` con plantilla, huecos y banco de fichas; validación por hueco.

**Ejercicios de grupos funcionales**
- [ ] `IdentifyGroupView` con estructura (asset o SMILES) y opciones de familia.

**Otros tipos**
- [ ] `TrueFalseView` y `ChatCompleteView`.

**Retroalimentación**
- [ ] Render de `explanation_key` en acierto y `feedback_template` en error desde `translations`.

**Progreso local**
- [ ] `ProgressRepository` local (Isar/Drift): `user_progress`, `lesson_attempts`, `exercise_attempts`, `mistakes`.

**Progreso remoto**
- [ ] `ProgressRepository` remoto (Supabase) detrás de la misma interfaz; sync local-first.

**XP**
- [ ] `RewardController` suma XP por ejercicio/lección/reto a `users.xp_total`.

**Monedas**
- [ ] Saldo en `users.coins`; gasto en pistas y congelar racha.

**Recompensas**
- [ ] Catálogo `rewards`, otorgamiento por trigger, `user_rewards`, animación de cofre.

**Perfil**
- [ ] Pantalla con agregados (XP, racha, mundos completados, ejercicios resueltos, temas dominados).

**Racha**
- [ ] `StreakController` actualiza al primer evento del día; `streaks`+`users.current_streak`.

**Assets**
- [ ] `AssetRepository` que resuelve `assets` por id (bundle local o Storage); manejo de placeholders.

**Personajes**
- [ ] Render de `characters` por id con expresiones por estado.

**Traducciones**
- [ ] `LocalizationService` que resuelve `(key, locale)` desde `translations`; solo `es` en MVP.

**Backend**
- [ ] Cliente Supabase, auth anónima, vinculación opcional de cuenta, Edge Function stub para IA futura.

**Base de datos**
- [ ] Aplicar `supabase_schema.sql`; políticas RLS; seed remoto desde el JSON.

**Analíticas**
- [ ] Servicio `Analytics` con interfaz neutra; eventos de la sección R; GA4/PostHog; Crashlytics.

**Pruebas**
- [ ] Unit tests del motor de ejercicios y de la lógica de desbloqueo; tests de parseo de seed; widget tests de `ExercisePlayer`.

**Build Android**
- [ ] Configurar firma, Play App Signing, `flutter build appbundle --release`, verificar con bundletool.

**Preparación Play Store**
- [ ] Ícono, screenshots, textos de ficha, política de privacidad, Data Safety, content rating, target audience.

---

## O. Prompt maestro para Claude Code

El prompt completo está también en el archivo adjunto `prompt-maestro-claude-code.md` (mismo texto, listo para copiar). Antes de pegarlo, coloca en la carpeta del proyecto los adjuntos `seed/` y `supabase_schema.sql` para que Claude Code los consuma.

````text
# PROYECTO: App educativa gamificada de química orgánica (nombre provisional "Química para Todos")

Eres el arquitecto e implementador. Construye desde cero una app móvil en Flutter, Android primero, dirigida por contenido (content-driven), preparada para crecer y para publicarse en Google Play Store. NO codifiques el contenido químico a mano: cárgalo desde los archivos JSON de seed que te proporciono. NO copies Duolingo ni uses sus nombres, personajes, colores ni assets; usa solo patrones de gamificación genéricos.

## Restricciones duras
- El nombre de marca se referencia SIEMPRE por una constante `APP_DISPLAY_NAME`. Nunca escribas el nombre literal en widgets, strings ni rutas. El identificador técnico es `quimica_app` y no cambia aunque cambie la marca.
- Todo texto visible al usuario es una clave i18n que se resuelve en `translations` por (key, locale). En el MVP solo cargas locale "es". Ningún literal de UI en el código.
- Todo color y tipografía sale de un tema (`ThemeController` desde tabla `themes`). Cero colores hardcodeados en widgets.
- Todos los assets (imágenes, sprites, estructuras, video) se referencian por id desde la tabla `assets`. Nunca rutas fijas en código.
- IDs de contenido inmutables. Retirar contenido = `is_active=false`, nunca DELETE. El progreso referencia scope por id, no por orden.

## Stack
- Flutter (Dart), Android primero.
- Estado: Riverpod. Navegación: go_router. Modelos: freezed + json_serializable.
- Persistencia local: Isar (o Drift si lo justificas). 
- Video: youtube_player_iframe (embebido in-app).
- Backend (fase 2, dejar preparado pero no obligatorio en fase 1): Supabase (Postgres, Auth anónima, Storage, Edge Functions). Analíticas: servicio con interfaz neutra (GA4/PostHog) + Crashlytics.

## Arquitectura (capas, acoplamiento estricto)
1. Presentación (screens/widgets) -> solo habla con controllers.
2. Dominio/estado (Riverpod controllers) -> solo habla con repositorios (interfaces).
3. Repositorios (interfaces) con dos implementaciones intercambiables: local (JSON+Isar) y remota (Supabase).
4. Servicios: Localization, Theme, Asset, Analytics, Config.
Cambiar de local a nube = cambiar implementación de repositorio, sin tocar pantallas.

## Estructura de carpetas
```
lib/
  app/            # APP_DISPLAY_NAME, router, theme bootstrap, main
  core/           # constantes, errores, utils, result types
  models/         # World, Unit, Lesson, Exercise, Reward, ... (freezed)
  repositories/   # interfaces + impl local/ + impl remote/
  controllers/    # Riverpod: content, progress, diagnostic, reward, streak, theme
  services/       # localization, theme, asset, analytics, config
  features/
    welcome/
    diagnostic/
    world_map/
    lesson_path/
    exercise_player/   # ExercisePlayer + views por tipo
    result/
    profile/
    quests/
    practice/
  ui/             # componentes compartidos (botones, tarjetas, nodos, barras)
assets/
  content/        # seed JSON (worlds, units, lessons, exercises, ...)
  images/ sprites/ themes/ i18n/
```

## Modelos de datos
Implementa clases freezed con fromJson/toJson para: World, Unit, Lesson, Exercise, ExerciseOption, UserProgress, DiagnosticResult, Reward, UserReward, Streak, Currency, Asset, Translation, Theme, Character, Mistake, FeedbackTemplate, AppConfig, ContentVersion, LessonAttempt, ExerciseAttempt. Respeta los campos del archivo `MODELO_DE_DATOS` (sección G de la guía) y el `supabase_schema.sql` adjunto. Un seed mal formado debe fallar en parseo, no en runtime.

## Seed data
Carga el contenido desde `assets/content/*.json` (te entrego: worlds.json, units.json, lessons.json, exercises.json, diagnostic.json, feedback_templates.json, translations_es.json, themes.json, characters.json, app_config.json). NO inventes química: usa exactamente lo que está en el seed. Si detectas un error químico en el seed, NO lo corrijas en silencio: detente y repórtalo.

## Contenido del MVP (3 mundos)
1. "Química básica del carbono" (DESBLOQUEADO): unidades intro al carbono, hibridación sp/sp2/sp3, tipos de carbono.
2. "Grupos funcionales y clasificación" (desbloquea tras el mundo 1): identificar -OH, -CHO, C=O, -COOH, etc.
3. "Nomenclatura de alcanos" (desbloquea tras el mundo 2): cadena principal, sustituyentes, numeración, lineales y ramificados.
Mundos teaser (coming_soon, atenuados): Estereoquímica, Bosque de Reacciones.

## Motor de ejercicios
Implementa `ExercisePlayer` dirigido por datos con barra de progreso superior y un ejercicio por pantalla. Tipos en el MVP: multiple_choice, fill_blanks, identify_group, true_false, chat_complete, y diagnostic. Registro `type -> widget`. Validación genérica contra el campo `correct`. En acierto: muestra `explanation_key`. En error: muestra `feedback_template` (sin bloquear avance) y registra el ejercicio en `mistakes`. Cada intento se guarda en `exercise_attempts`.

## Sistemas de juego
- Progreso: user_progress por scope (world/unit/lesson) con status y progress; desbloqueo evaluando unlock_rule contra el progreso.
- XP y monedas: RewardController suma a users.xp_total y users.coins.
- Recompensas y cofres: catálogo rewards, otorgar por trigger, user_rewards, animación.
- Racha: StreakController incrementa al primer evento del día; congelar racha cuesta monedas.
- Diagnóstico: DiagnosticController sirve ítems is_diagnostic, calcula score y recommended_world_id, guarda diagnostic_results.
- Perfil: agregados (XP total, racha, mundos completados, ejercicios resueltos).
- Práctica de errores: reofrece ejercicios desde mistakes priorizando los más fallados.

## Login y backend (preparar, no bloquear fase 1)
- Fase 1: 100% local, sin cuenta. Anónimo total.
- Fase 2: Supabase auth anónima; repositorios remotos detrás de las mismas interfaces; sync local-first (escribe local, empuja en segundo plano); vinculación opcional de cuenta para nube. Aplica `supabase_schema.sql` con RLS. Edge Function stub para futuro proxy de IA (clave en servidor, nunca en cliente).

## Temas, assets, traducciones (preparar desde el día 1)
- ThemeController desde tabla/JSON themes; tema oscuro base con acentos.
- AssetRepository resuelve por id (bundle local en fase 1, Storage en fase 2).
- LocalizationService resuelve (key, locale); solo "es" en MVP; agregar "en" después = nuevas filas, sin tocar código.
- Characters por id con expresiones por estado; mascota PROPIA, no de Duolingo.

## Preparación Play Store
- applicationId definitivo y estable. Flavors dev/prod. Firma + Play App Signing. `flutter build appbundle --release`. Permisos mínimos (INTERNET). Genera placeholders de ícono y screenshots y un README con los pasos de build y publicación.

## Buenas prácticas
- Código tipado, modular, testeable. Sin literales mágicos. Manejo de errores explícito (Result types).
- Tests: unit del motor de ejercicios y de unlock_rule; parseo de seed; widget test de ExercisePlayer.
- Documenta en README la arquitectura y cómo agregar un mundo/lección/ejercicio nuevo solo con datos.

## Cómo correr el proyecto
- Incluye en el README: `flutter pub get`, generación de código (build_runner) si aplica, `flutter run --flavor dev`, y cómo cargar el seed.

## Cómo generar build Android
- `flutter build appbundle --release --flavor prod`; verificación con bundletool; notas de firma y versionCode/versionName en pubspec (`version: x.y.z+n`).

## Qué NO debes hacer
- No copiar Duolingo (nombres, personajes, colores, assets, "Super", ligas).
- No hardcodear texto, color, asset ni contenido químico.
- No corregir química del seed en silencio (reporta).
- No pedir permisos innecesarios.
- No exponer claves de API en el cliente.
- No usar WebView como app (riesgo de rechazo en Play).

## Antes de programar, pregúntame si detectas ambigüedad en:
1. Nombre de paquete/applicationId definitivo.
2. Isar vs Drift (elige y justifica si no respondo).
3. Identidad visual de la mascota propia (descríbeme 2 opciones).
4. Si la fase 1 debe quedar 100% offline o ya integrar Supabase.
5. Cualquier conflicto entre el seed y las reglas IUPAC.
Procede con supuestos razonables SOLO en detalles menores, y decláralos en el README.
````

---

## P. Prompts secundarios para Kimi o Claude

Prompts cortos, autocontenidos, copiables. Cada uno produce un artefacto reutilizable. Todos asumen salida en JSON compatible con el esquema de la sección G cuando aplica.

**1. Crear contenido de química básica del carbono**
```text
Eres químico orgánico y diseñador instruccional. Genera el contenido de una unidad "Química básica del carbono" para una app de microaprendizaje. Cubre: enlaces del carbono, hibridación sp3/sp2/sp, geometrías (tetraédrica/trigonal plana/lineal), y tipos de carbono (primario a cuaternario). Entrega 4 lecciones; por lección: título, intro de 2-4 frases en español, y 5 ejercicios variados (multiple_choice, true_false, fill_blanks, identify). Devuelve SOLO JSON con la forma: world>units>lessons>exercises (campos: id, type, prompt, options[{value}], correct, explanation, feedback, difficulty 1-5, topic). Química correcta y verificable. Sin texto fuera del JSON.
```

**2. Crear banco de preguntas de grupos funcionales**
```text
Genera un banco de 30 ejercicios para identificar grupos funcionales orgánicos (alcohol, aldehído, cetona, ácido carboxílico, éter, amina, amida, éster, halogenuro). Cada ejercicio: una estructura descrita por SMILES, 4 opciones de familia, una correcta, explicación de por qué, y feedback de error que distinga los grupos confundibles. Dificultad 1-4. Devuelve SOLO JSON (array de exercises tipo identify_group con campos: id, smiles, options, correct, explanation, feedback, difficulty, topic). Verifica que cada SMILES corresponda al grupo indicado.
```

**3. Crear ejercicios de nomenclatura de alcanos**
```text
Genera 25 ejercicios de nomenclatura IUPAC de alcanos (lineales y ramificados, hasta 8 carbonos). Mezcla tipos: multiple_choice (elegir nombre correcto dada una estructura SMILES), fill_blanks (completar localizadores y sustituyentes en una plantilla), y true_false sobre reglas. Para cada uno indica la cadena principal, la numeración de menor localizador y el nombre IUPAC correcto. Devuelve SOLO JSON compatible con exercises (id, type, smiles, payload, correct, explanation, feedback, difficulty, topic). Cada nombre debe seguir reglas IUPAC y usar el menor conjunto de localizadores.
```

**4. Revisar si respuestas químicas son correctas**
```text
Actúa como revisor de química orgánica. Te paso un array JSON de ejercicios con su SMILES y su respuesta marcada como correcta. Para cada uno verifica: (a) que el SMILES sea válido, (b) que la respuesta correcta sea efectivamente correcta según IUPAC, (c) que los distractores sean plausibles pero incorrectos. Devuelve un array con: id, veredicto (ok/error), y si hay error, la corrección exacta y la regla violada. No cambies nada tú; solo reporta.
```

**5. Generar retroalimentación para errores**
```text
Para cada topic de química orgánica que te doy (ej. hibridacion_sp3, grupos_funcionales, numeracion_iupac), redacta una plantilla de retroalimentación breve (1-2 frases, español, tono de apoyo, sin regañar) que ayude a corregir el error más común de ese tema, más un "hint" opcional. Devuelve SOLO JSON: array de {key, topic, message, hint, severity}. Sin emojis. Preciso químicamente.
```

**6. Crear textos introductorios**
```text
Redacta las intros de lección para estos temas: [lista]. Cada intro: 2-4 frases en español, claras, sin tecnicismos innecesarios, que den intuición antes del formalismo. Incluye una analogía mínima cuando ayude. Devuelve SOLO JSON: array de {lesson_id, text}. Sin relleno motivacional.
```

**7. Crear descripción de Play Store**
```text
Escribe la ficha de Google Play para una app educativa de química orgánica gamificada, audiencia 13+, en español. Entrega: (a) nombre <=30 caracteres, (b) descripción corta <=80 caracteres, (c) descripción larga <=4000 caracteres con beneficios, temas que cubre y mención de que es para estudiar/repasar. Tono claro, sin superlativos vacíos, sin prometer lo que no hay. No menciones marcas de terceros. Devuelve texto plano etiquetado por sección.
```

**8. Crear política de privacidad base**
```text
Redacta una política de privacidad base (español) para una app móvil educativa, audiencia 13+, con: uso anónimo por defecto, progreso local y nube opcional (Supabase), analíticas anónimas, video de YouTube embebido (procesamiento por Google), sin venta de datos, derechos de acceso y borrado, y contacto. Marca con [CORCHETES] los campos a completar (nombre legal, email, jurisdicción). Aclara que debe revisarse con un profesional legal antes de publicar. Devuelve el documento en Markdown.
```

**9. Diseñar sistema de recompensas**
```text
Diseña un sistema de recompensas para una app de microaprendizaje (XP, monedas, cofres, racha, retos contratiempo) que motive sin volverse adictivo ni punitivo. Define: cuánta XP por ejercicio/lección/reto, cuándo cae un cofre, costo de congelar racha, y reglas para evitar inflación de recompensas. Justifica cada número. Devuelve SOLO JSON: {xp_rules, coin_rules, chest_rules, streak_rules} más una nota breve de justificación por bloque.
```

**10. Crear nombres de mundos, unidades y lecciones**
```text
Propón nombres atractivos pero claros para mundos, unidades y lecciones de química orgánica (ej. mundo de nomenclatura, grupos funcionales, estereoquímica, reacciones). Evita parecer Duolingo. Cada nombre: corto, evocador y fiel al tema. Devuelve SOLO JSON: array de {tipo, tema, nombre_es, nombre_en_sugerido}.
```

**11. Crear prompts de imágenes para personajes, fondos y mundos**
```text
Genera prompts de texto-a-imagen para una identidad visual PROPIA (no Duolingo) de una app de química orgánica: (a) una mascota original ligada a la química (describe concepto, no copies un limón ni un búho), (b) 3 islas/mundos temáticos, (c) iconografía de XP/monedas/cofre. Estilo: ilustración plana, amable, paleta oscura con acentos. Cada prompt en inglés, autocontenido, sin nombres de marcas. Devuelve array JSON {asset_tipo, prompt}.
```

**12. Revisar accesibilidad y claridad**
```text
Revisa estas pantallas/copies de una app educativa para accesibilidad y claridad: contraste de color suficiente, tamaño de toque, legibilidad, lenguaje simple, y que las estructuras químicas tengan texto alternativo. Te paso descripciones o capturas. Devuelve una lista priorizada de problemas con su corrección concreta. Sin relleno.
```

**13. Revisar si el MVP está demasiado grande**
```text
Te paso el alcance de un MVP de app educativa. Evalúa críticamente si es demasiado grande para una primera prueba. Identifica qué se puede recortar sin invalidar las hipótesis (retención, finalización, corrección de contenido). Propón una versión mínima de un mundo y 3 tipos de ejercicio. Devuelve: qué quitar, qué conservar, y por qué, en una tabla.
```

**14. Convertir contenido del manual en JSON**
```text
Te paso un fragmento de un manual de química orgánica. Conviértelo en contenido de app: detecta el tema, propón una lección (título + intro 2-4 frases) y 5 ejercicios (mezcla de multiple_choice, true_false, fill_blanks, identify). Mantén la química EXACTA del manual; no agregues afirmaciones no presentes salvo definiciones estándar correctas. Devuelve SOLO JSON compatible con lessons>exercises (id, type, prompt, options, correct, explanation, feedback, difficulty, topic). Ignora rúbricas y anexos administrativos.
```

**15. Crear diagnóstico inicial**
```text
Crea un examen diagnóstico de 8 ítems para ubicar a un usuario en química orgánica básica. Cubre: enlaces del carbono, hibridación, tipos de carbono, grupos funcionales, nomenclatura básica. Dificultad creciente. Cada ítem mapea a un mundo (maps_to_world) y tiene un peso (weight). Define umbrales de score -> mundo recomendado. Devuelve SOLO JSON: {items:[...], scoring:{thresholds}}. Química correcta.
```

---

## Q. Riesgos y decisiones importantes

### Q.1 Decisiones a tomar antes de empezar

| Decisión | Estado | Recomendación / consecuencia si no se decide |
|---|---|---|
| Público objetivo | **Decidido: 13+** | Evita COPPA estricto; cuidar Families Policy |
| Edad del usuario | **Decidido: sin <13** | Declarar con precisión en Play |
| Login | **Decidido: anónimo primero** | Cero PII en MVP 1; nube opcional |
| Contenido local o remoto | Recomendado: local en MVP 1, remoto en MVP 2 | Si se decide remoto desde inicio, sube costo y complejidad |
| Videos in-app o links | **Decidido: YouTube embebido** | Cumplir YouTube API Terms + Data Safety |
| IA desde MVP o después | Recomendado: después | Si se adelanta, requiere proxy seguro y política de IA |
| Stack | Recomendado: **Flutter** | Confirmar antes de generar proyecto |
| Backend | Recomendado: **Supabase** (MVP 2) | Confirmar antes de MVP 2 |
| Tamaño del MVP | Recomendado: 3 mundos, recortable a 1 | Si no se acota, riesgo de no terminar |
| Diseño propio vs copia | **Obligatorio: propio** | Rediseñar todo asset que se parezca a Duolingo |
| Derechos de imágenes | Pendiente | No usar arte de terceros sin licencia; generar propio |
| Corrección química | Crítico | Validar todo el seed contra IUPAC antes de publicar |
| Manejo de errores | Definido en arquitectura | Result types, sin crashes silenciosos |
| Privacidad | Definida | Minimización + política + Data Safety sincronizados |
| Play Store | Definido | Reverificar políticas antes de publicar |
| Escalabilidad | Cubierta por arquitectura | Repos intercambiables, contenido por datos |
| Costos | Bajo | Free tiers; vigilar al crecer Storage/usuarios |
| Mantenimiento | Cubierto | Contenido como dato, no código |

### Q.2 Qué puede salir mal y cómo evitarlo

1. **Errores químicos en el contenido.** Riesgo alto y de reputación. Evitar: revisión doble del seed con el prompt 4, validación de SMILES y de nombres IUPAC antes de publicar (ver sección de verificación de este paquete).
2. **Parecer copia de Duolingo (legal y rechazo en Play).** Evitar: rediseñar mascotas, paleta y nombres; usar solo patrones genéricos.
3. **MVP demasiado grande, no se termina.** Evitar: el recorte a 1 mundo y 3 tipos de ejercicio (sección J.1).
4. **Requisito de testers de Play no cumplido.** Evitar: reclutar testers temprano y cumplir el periodo de closed testing vigente.
5. **Data Safety inconsistente.** Evitar: declarar exactamente lo que la app hace (anónimo, analíticas, YouTube); mantenerlo sincronizado.
6. **Sincronización local↔nube corrompe progreso.** Evitar: estrategia local-first con IDs inmutables y borrado lógico; nunca DELETE de contenido referenciado.
7. **Dependencia de un LLM que introduce bugs sutiles.** Evitar: tests del motor y del parseo de seed; revisar diffs; tipado estricto.
8. **Costos inesperados al crecer.** Evitar: monitorear uso de Storage (videos propios encarecen) y de la base; mantener YouTube como host de video.
9. **Cambios de política de Google.** Evitar: reverificar antes de cada publicación; no asumir umbrales fijos.

---

## R. Métricas para validar el MVP

### R.1 Métricas y cómo instrumentarlas

Instrumentar con un servicio `Analytics` de interfaz neutra que emite eventos anónimos. En MVP 1 (local), bastan contadores locales y un export manual; en MVP 2, GA4 o PostHog. Cada métrica se deriva de un evento simple, sin construir un pipeline complejo.

| Métrica | Evento(s) base | Cómo se calcula | Objetivo MVP |
|---|---|---|---|
| Retención D1 | `app_open` con fecha | % de usuarios que abren al día siguiente del registro | > 30 % |
| Retención D7 | `app_open` con fecha | % que abre 7 días después | > 12 % |
| Terminan diagnóstico | `diagnostic_start`, `diagnostic_finish` | finish/start | > 70 % |
| Completan 1.ª lección | `lesson_start`, `lesson_finish` | usuarios con al menos 1 finish | > 60 % |
| Completan 1.er mundo | `world_complete` | usuarios con world_complete | > 20 % |
| Promedio de aciertos | `exercise_attempt{is_correct}` | correctos/total | 60–85 % |
| Errores más frecuentes | `exercise_attempt{is_correct=false, topic}` | top topics por fallo | (diagnóstico de contenido) |
| Tiempo por lección | `lesson_finish{duration}` | mediana de duración | < 5 min |
| Lecciones repetidas | `lesson_start` con repetición de lesson_id | repeticiones/usuario | observacional |
| Uso de recompensas | `reward_claim`, `coin_spend` | tasa de reclamo y gasto | observacional |
| Racha promedio | `users.current_streak` | media y distribución | crecer en el tiempo |
| Comentarios de testers | feedback cualitativo | conteo y temas | observacional |
| Abandono por pantalla | `screen_view` + `screen_exit` | embudo por pantalla | detectar caídas |

### R.2 Conjunto mínimo de eventos

Para no complicar la app, basta instrumentar 8 eventos: `app_open`, `diagnostic_start`, `diagnostic_finish`, `lesson_start`, `lesson_finish` (con `duration`, `accuracy`), `exercise_attempt` (con `is_correct`, `topic`, `time_ms`), `world_complete`, `reward_claim`. Todas las métricas de R.1 se derivan de estos ocho. Sin PII, sin identificadores publicitarios.

---

## S. Recomendación final

**Para tu caso yo haría: stack Flutter, backend Supabase (desde MVP 2; MVP 1 sin backend, 100 % local), arquitectura modular content-driven en capas con repositorios intercambiables, y empezaría con un MVP recortado a un solo mundo ("Química básica del carbono") y tres tipos de ejercicio, validando localmente antes de tocar la nube y Play Store.**

1. **Stack final:** Flutter (Dart), Android primero. Riverpod, go_router, freezed, Isar, youtube_player_iframe.
2. **Backend final:** ninguno en MVP 1 (local con Isar); Supabase en MVP 2 (Postgres, Auth anónima, Storage, Edge Functions); Firebase solo para Analytics y Crashlytics.
3. **MVP recortado recomendado:** 1 mundo (Química básica del carbono, 2 unidades, 5 lecciones), 3 tipos de ejercicio (multiple_choice, true_false, fill_blanks), diagnóstico de 6 ítems, XP/monedas/racha/cofres/perfil/práctica de errores, todo local. Agregar los otros 2 mundos y los tipos restantes después, solo con datos.
4. **Primeras 10 tareas:**
   1. Confirmar las 5 preguntas abiertas (abajo) y el seed adjunto.
   2. Scaffold Flutter con `applicationId` neutro, flavors, `APP_DISPLAY_NAME`, estructura de carpetas por capas.
   3. Modelos freezed para World/Unit/Lesson/Exercise y carga del seed JSON local (con parseo que falle si el seed es inválido).
   4. ThemeController + tema oscuro base; LocalizationService con `es`.
   5. Navegación completa (go_router) entre todas las pantallas con datos reales del mundo 1.
   6. Motor `ExercisePlayer` con multiple_choice, true_false, fill_blanks; validación + feedback + registro de intentos.
   7. Persistencia local (Isar): user_progress, lesson_attempts, exercise_attempts, mistakes.
   8. Sistema de XP/monedas/racha/cofres + pantalla de resultado de lección.
   9. Diagnóstico funcional que recomienda el mundo 1; pantalla de score.
   10. Perfil + práctica de errores + tests del motor y del parseo de seed.
5. **Preguntas que debes responder antes de programar:**
   1. ¿`applicationId`/paquete definitivo (ej. `app.quimica.quimica_app`)?
   2. ¿Confirmas Flutter como stack y Supabase como backend de MVP 2?
   3. ¿Identidad de la mascota propia (concepto) para no parecer Duolingo?
   4. ¿MVP 1 totalmente offline o ya integrar Supabase desde el inicio?
   5. ¿Apruebas el seed químico adjunto tras revisarlo, o quieres ajustes?
6. **Archivos que debes preparar (ya incluidos en este paquete):**
   - `seed/worlds.json`, `seed/units.json`, `seed/lessons.json`, `seed/exercises.json`, `seed/diagnostic.json`, `seed/feedback_templates.json`, `seed/translations_es.json`, `seed/themes.json`, `seed/characters.json`, `seed/app_config.json`.
   - `supabase_schema.sql` (esquema + RLS).
   - `prompt-maestro-claude-code.md` (prompt listo para pegar).
   - Esta guía como referencia de arquitectura.
   - Pendiente de tu lado: assets propios (mascota, íconos, íconos de mundo) generados con el prompt 11.
7. **Prompt final para Claude Code:** sección O / archivo `prompt-maestro-claude-code.md`.
8. **Ruta más segura para publicar en Play Store:** internal testing → closed testing (cumpliendo el periodo y número de testers vigentes) → producción con staged rollout (10/50/100 %), con Data Safety, content rating y política de privacidad completas y reverificadas el día del envío, permisos mínimos, y todos los assets propios (sin parecido a Duolingo).

### Reglas finales respetadas
No se copia Duolingo (mecánica como inspiración, no marca ni arte). Nombre provisional `Química para Todos`, renombrable vía `APP_DISPLAY_NAME`. Pensada para Play Store, para crecer (contenido como dato, repos intercambiables) y para modificarse sin destruirse (IDs inmutables, borrado lógico, versionado de contenido). Contenido químico basado en el manual, con anexos Construye-T ignorados, y validado contra IUPAC en la verificación de este paquete.

