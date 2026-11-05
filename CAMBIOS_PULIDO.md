# Cambios del pulido

Qué cambió respecto al cierre del hito 6, qué quedó pendiente y por qué. El orden sigue a `PLAN_PULIDO.md`. Ningún archivo de `seed/` ni de `public/content/packs/base/` se tocó; no se agregó ni cambió ningún ejercicio, respuesta, explicación ni texto químico.

## Qué cambió

1. **Paleta del autor como tokens del tema** (`public/content/packs/web/themes.json`). Fondo `#E3F1FB`, superficies `#FFFFFF`, superficie cálida `#FFF9E6`, seleccionado y halo `#C1E4F3`, pista de progreso `#A8D0EF`, resaltado de estructuras `#C1E4F3`, cinco bloques pastel planos, borde de control `#5A6473` (3:1 o más sobre todos los pasteles) y papel blanco para ilustraciones. El tema oscuro deriva los mismos roles. El test de contraste (`src/services/theme.test.ts`) pasó de 25 a 51 pares por tema.
2. **Arte del autor.** Los 12 originales y `prompts_generacion.txt` viven en `arte/`. `scripts/optimize-art.ts` genera `assets/images/` (512 px y 256 px, PNG con alfa, 883 KB en total, máximo 65 KB por archivo) antes de `dev`, `build` y `test` y en el workflow de despliegue. `scripts/gen_metano.py` dibuja `asset_metano_tetraedrico` con RDKit (ETKDG + MMFF, cuñas y líneas discontinuas, rótulo "109.5°").
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

## Para que lo corrija el autor

- `seed/assets.json`: el campo `license` de los 13 assets sigue en `"propio-por-generar"`, pero el arte ya existe. No se cambió porque el seed es del autor; conviene poner la licencia real del arte. Lo mismo para `width` y `height`, que están en `null` (los originales miden 1254 × 1254 y las versiones servidas 512 × 512).
- `public/config/i18n/ui_es.json`: `about.author`, `about.contact` y `about.license` están como `[completar]`.
- `REPORTE_QUIMICA.md` conserva las observaciones de redacción del seed; ninguna se tocó.

## Qué quedó pendiente y por qué

- **Logo oficial.** No hay `logo.png` entre los originales, así que la marca, los íconos de la PWA, el favicon y la imagen para compartir usan la cadena en zigzag. La receta para cambiarlos está en el README ("Cambiar el logo, los íconos de la PWA y la imagen para compartir").
- **Lighthouse después del pulido.** No se volvió a correr en esta sesión (requiere descargar Lighthouse); lo que medía 93 en móvil eran el CSS bloqueante y el JS sin usar, y ambos se atendieron. Queda como comprobación del autor: `npx lighthouse http://localhost:4173/quimica-para-todos/ --preset=desktop` sobre `npm run preview`.
- **`srcset` solo para PNG de `assets/images/`.** Un asset con otra extensión o alojado fuera se sirve sin variante de 256 px (funciona, solo pesa más).
- **Vibración en iOS.** Safari no expone `navigator.vibrate`; el ajuste no aparece ahí y no hay alternativa web.
- **Etiquetas de la ruta en pantallas de 360 px.** Se acortó el texto de las lecciones bloqueadas; los títulos largos ("Carbonos primario a cuaternario") siguen partiéndose en dos líneas, lo que es aceptable pero se ve apretado junto a los cofres.
