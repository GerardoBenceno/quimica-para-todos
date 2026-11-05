# Cambios del pulido

Qué cambió respecto al cierre del hito 6, qué quedó pendiente y por qué. El orden sigue a `PLAN_PULIDO.md`. Ningún archivo de `seed/` ni de `public/content/packs/base/` se tocó; no se agregó ni cambió ningún ejercicio, respuesta, explicación ni texto químico.

## Qué cambió

1. **Paleta del autor como tokens del tema** (`public/content/packs/web/themes.json`). Fondo `#E3F1FB`, superficies `#FFFFFF`, superficie cálida `#FFF9E6`, seleccionado y halo `#C1E4F3`, pista de progreso `#A8D0EF`, resaltado de estructuras `#C1E4F3`, cinco bloques pastel planos, borde de control `#5A6473` (3:1 o más sobre todos los pasteles) y papel blanco para ilustraciones. El tema oscuro deriva los mismos roles. El test de contraste (`src/services/theme.test.ts`) pasó de 25 a 51 pares por tema.
2. **Arte del autor.** Los 12 originales y `prompts_generacion.txt` viven en `arte/`. `scripts/optimize-art.ts` genera `assets/images/` (512 px y 256 px, PNG con alfa, 883 KB en total, máximo 65 KB por archivo) antes de `dev`, `build` y `test` y en el workflow de despliegue. `scripts/gen_metano.py` dibuja `asset_metano_tetraedrico` con RDKit (ETKDG + MMFF) con la convención de libro: los dos H del plano con línea normal y 109.5° reales sobre el papel (el único ángulo rotulado), y cuña y línea discontinua juntas del otro lado, simétricas respecto a la bisectriz.
3. **Arte conectado donde el seed lo asigna.** Carbo idle en la bienvenida y en el estado vacío de repaso, happy en el resultado, think en pistas, diagnóstico y página inexistente, sad pequeño al fallar; íconos de mundo en el mapa (64 px) y en la banda de la ruta (72 px); moneda, cofre y protector de racha en Recompensas; metano en la intro de l_sp3. Por debajo de 40 px se conservan los íconos de línea.
4. **Superficies cálidas y bloques planos.** Bienvenida, encabezado del resultado y filas de cofres y tienda sobre `#FFF9E6`; banda pastel en el encabezado de cada mundo; bloque pastel detrás de Carbo en la bienvenida. Sin degradados, marcos ni sombras.
5. **Estados.** Carga inicial con la marca completa; error de arranque con título, explicación, reintento y detalle técnico plegado (los textos de UI se cargan antes que el contenido); página inexistente con navegación, Carbo y salidas; aviso de carga del visor 3D.
6. **Atajos de teclado** en los ejercicios: 1 a 4 eligen la opción visible, Enter comprueba y continúa. Aviso solo con teclado físico. Test nuevo.
7. **Ajustes** en Perfil: tema, vibración al responder (solo donde el dispositivo la expone) y respaldo del progreso (descargar e importar un archivo JSON validado, con confirmación). Tests del respaldo.
8. **Acerca de** (`#/acerca`): qué es, qué contiene (contado desde el contenido), datos y sin conexión, motores de código abierto, versión, código fuente y datos del autor como `[completar]`. Enlaces desde la bienvenida y el perfil.
9. **Metadatos para compartir y 404.** Descripción, Open Graph y Twitter Card con `public/og.png` (generada por `scripts/gen-share-image.ts`); `404.html` propia emitida en el build con los colores del tema.
10. **Rendimiento.** CSS del shell en línea (sin petición bloqueante) y pantallas con carga diferida: bundle inicial de 447 a 335 KB. El precache subió de 1.8 a 2.6 MB por el arte (dentro del límite de 1.5 MB de crecimiento) y los chunks de pantallas.
11. **Textos de interfaz** más claros en reinicio, error y página inexistente, y estado de lecciones bloqueadas más corto en la ruta ("Se abre tras la lección n").
12. **Verificación.** `npm run verify` revisa además `og:image`, `og.png`, `404.html`, Acerca de y la página inexistente (axe y objetivos táctiles). Recorrido completo repetido a 393 px y 1280 px en ambos temas sin errores de consola ni desplazamiento horizontal.

## Ronda 2

13. **Metano tetraédrico corregido** a la convención de libro (ver arriba, punto 2).
14. **Vista de revisión `#/revision`** (ruta oculta, sin enlace): cada ejercicio de cada paquete y del diagnóstico con enunciado, opciones con la correcta marcada, plantilla y banco, respuesta, explicación, mensaje y pista de retroalimentación, SMILES, estructura dibujada, fórmula molecular calculada con RDKit.js (orden de Hill, nuevo método `formula` del puerto `StructureMatcher`) y avisos de integridad; filtros por mundo, lección, tipo y paquete; botón de imprimir con hoja de estilos de impresión sin navegación. Incluida en la verificación de accesibilidad.

15. **Importador desde hoja de cálculo.** `scripts/pack-csv.ts` (exportar e importar), `scripts/export-pack-csv.ts`, `scripts/import-pack-csv.ts`, plantilla de ejemplo en `plantillas/ejemplo/` exportada del seed (solo filas del seed, sin química nueva), paso en el workflow y receta en el README. Test de ida y vuelta: exportar el seed y reimportarlo da un paquete idéntico; test de errores por archivo, fila y columna.

16. **Auditoría química automática** (`scripts/audit_chem.py`, `reports/audit_quimica.json`): 47 ejercicios con SMILES, 242 comprobaciones, 0 discrepancias. Resumen y limitaciones en `REPORTE_QUIMICA.md`.

17. **PWA**: aviso discreto cuando el service worker instaló una versión nueva (no recarga sola a mitad de un ejercicio; botón "Actualizar ahora"), sección "Instalar como app" en Ajustes cuando el navegador expone `beforeinstallprompt` (Chromium) y mensajes claros sin conexión: el aviso global explica que el editor de estructuras necesita haberse abierto antes con internet, y el editor lo repite si falla su descarga sin conexión.

18. **Hallazgos de las auditorías de código, rendimiento y accesibilidad** (corregidos los confirmados): el respaldo valida tipos además de claves y completa campos de versiones viejas (`freezes_available`, `in_progress`), y el repositorio local descarta un documento malformado en lugar de dejar la app en blanco; una lección respondida al 100 % y cerrada antes de "Continuar" ahora se cierra al volver en vez de reiniciarse; un `in_progress` que apunta a una lección inexistente ya no deja vacío el mapa; la racha mostrada respeta el tope semanal de protectores y un reloj o zona horaria hacia atrás no suma días; Enter repetido no se salta la retroalimentación; `AssetImage` reinicia su estado al cambiar de asset; los cofres bloqueados siguen siendo alcanzables por teclado (`aria-disabled`); la barra de Ketcher oculta de verdad formas, plantillas de anillos, tabla periódica, cargas, imágenes y portapapeles, y sus botones muestran el foco; la imagen de la bienvenida (LCP) se precarga desde el HTML y se carga sin `lazy`; los textos de UI y el contenido se piden en paralelo. Tests nuevos de racha y de respaldo malformado. Mediciones en `reports/lighthouse-movil.report.json` (rendimiento 90, accesibilidad 100 antes de estas mejoras), `reports/lighthouse-escritorio.report.json` (100, 100) y `reports/axe-temas.json` (0 violaciones en 56 combinaciones de pantalla, tema y viewport).

19. **Escritorio a dos columnas en la ruta del mundo**: desde 960 px la cadena va a la izquierda y la lección en curso (intro, texto y botón de empezar) en un panel fijo a la derecha; por debajo de 960 px el diseño móvil no cambia.

20. **Accesibilidad fina**: las regiones `role="status"` de perfil, recompensas y repaso existen siempre (los lectores de pantalla no anuncian una región que aparece ya con texto), la plantilla de huecos usa `role="group"` en lugar de un párrafo con nombre, y el salto del diagnóstico sin ítems ocurre en un efecto, no durante el render.

## Ronda 3

21. **RDKit en el workflow de deploy**: `actions/setup-python` y `pip install -r requirements.txt` antes de importar las plantillas, así un paquete subido por la web con SMILES nuevos genera sus SVG y SDF en CI. Prueba de extremo a extremo `scripts/ci-import-smoke.ts` (corre en CI antes del import real): arma `plantillas/ciprueba/` con la primera lección con estructuras del seed (ids y claves con prefijo `ciprueba_`, sin química nueva), importa, comprueba SVG y SDF de cada SMILES y limpia plantilla, paquete, manifest y reporte de moléculas; después valida que el contenido quedó como antes. No se publica nada del paquete temporal.

## Para que lo corrija el autor

- `seed/assets.json`: el campo `license` de los 13 assets sigue en `"propio-por-generar"`, pero el arte ya existe. No se cambió porque el seed es del autor; conviene poner la licencia real del arte. Lo mismo para `width` y `height`, que están en `null` (los originales miden 1254 × 1254 y las versiones servidas 512 × 512).
- `public/config/i18n/ui_es.json`: `about.author`, `about.contact` y `about.license` están como `[completar]`.
- `REPORTE_QUIMICA.md` conserva las observaciones de redacción del seed; ninguna se tocó.

## Qué quedó pendiente y por qué

- **Logo oficial.** No hay `logo.png` entre los originales, así que la marca, los íconos de la PWA, el favicon y la imagen para compartir usan la cadena en zigzag. La receta para cambiarlos está en el README ("Cambiar el logo, los íconos de la PWA y la imagen para compartir").
- **Rendimiento móvil.** Lighthouse móvil dio 90 antes de precargar la imagen de la bienvenida; la mayor oportunidad restante es fusionar en el build los 22 JSON de configuración y contenido en un solo archivo (5 saltos de red en serie en el arranque) y diferir zod (86 KB) fuera del bundle inicial. Ambas tocan el repositorio de contenido y se dejan para una sesión con tiempo de verificar el modo sin conexión.
- **Teclado en el editor de estructuras.** Ketcher no permite colocar átomos sin ratón; en pantallas angostas ya se sustituye por elegir estructura, y en escritorio queda documentado como límite del editor.
- **`srcset` solo para PNG de `assets/images/`.** Un asset con otra extensión o alojado fuera se sirve sin variante de 256 px (funciona, solo pesa más).
- **Repaso espaciado tipo Leitner.** No se hizo: cambia la forma del documento de progreso (caja e intervalo por error) y exige migración del respaldo y tests de intervalos; no cabía completo y verificado en el presupuesto de la ronda 2.
- **Fusionar los JSON de arranque y diferir zod.** Mayor ahorro restante en móvil según la medición (5 saltos de red en serie, 86 KB de zod en el bundle inicial); tocan el repositorio de contenido y el modo sin conexión, se dejan para una sesión con tiempo de verificarlos.
- **Vibración en iOS.** Safari no expone `navigator.vibrate`; el ajuste no aparece ahí y no hay alternativa web.
- **Etiquetas de la ruta en pantallas de 360 px.** Se acortó el texto de las lecciones bloqueadas; los títulos largos ("Carbonos primario a cuaternario") siguen partiéndose en dos líneas, lo que es aceptable pero se ve apretado junto a los cofres.
