# Plan de pulido

Lista priorizada de lo que hoy delata que la app es un prototipo, escrita después de leer `2026-11-04_prompt-claude-code-web.md`, `README.md`, `DECISIONES.md`, `REPORTE_QUIMICA.md` y `diseno/`, y de recorrer la app completa con Playwright a 393 px (Pixel 5) y 1280 px (`npm run verify -- --steps=welcome,flow,game,view3d --shots=...`). Se ejecuta en este orden; cada punto es una mejora pequeña y completa con `validate`, `test`, `build`, `verify`, commit y push.

## Qué delata el prototipo (hallazgos del recorrido)

| # | Hallazgo | Dónde se ve |
|---|---|---|
| 1 | Paleta gris neutra (`#F4F6F8`) sin la identidad del autor; ningún bloque de color, todo es blanco sobre gris. | Todas las pantallas |
| 2 | Los 13 PNG de `assets/images/` son placeholders oscuros de 5 KB. Carbo y los íconos de mundo nunca aparecen (el mapa usa miniaturas moleculares y los mundos "Próximamente" muestran un rectángulo punteado vacío). | Bienvenida, mapa, ruta, resultado, recompensas, chat_complete |
| 3 | `asset_metano_tetraedrico` (imagen de la intro de l_sp3) es un placeholder; la lección muestra un cuadro oscuro. | Intro de l_sp3 |
| 4 | Bienvenida: marca, un título y un botón sobre fondo gris, sin arte, sin enlace a información del proyecto. | Bienvenida |
| 5 | Pantalla de carga: solo la marca sin indicador; error de arranque con `⚠` y `↻` escritos en código y un `<pre>` con el mensaje técnico como único contenido; 404 interna de una línea. | AppGate, NotFoundScreen |
| 6 | Resultado sin celebración: lista de datos y botón; el "momento de victoria" de la primera sesión se ve igual que cualquier otra pantalla. | Resultado |
| 7 | Recompensas y cofres con íconos de línea genéricos; la tienda no muestra el protector de racha ni la moneda del seed. | Recompensas, ruta |
| 8 | Sin atajos de teclado en los ejercicios (solo flechas dentro del grupo de opciones). | Ejercicio |
| 9 | Ajustes mínimos: solo tema y reinicio. Sin vibración opcional ni respaldo del progreso (un estudiante que cambia de celular pierde todo). | Perfil |
| 10 | No existe "Acerca de": no se sabe quién hizo la app, con qué motores ni cómo se guardan los datos. | Navegación |
| 11 | `<meta name="description">` es solo el nombre; no hay Open Graph ni Twitter Card ni imagen para compartir; GitHub Pages responde su 404 genérica a rutas fuera del hash. | `index.html`, Pages |
| 12 | Lighthouse móvil 93: CSS bloqueante (`index-*.css` de 20 KB) y 76 KiB de JS sin usar en la bienvenida (todas las pantallas se importan de forma estática). | Primera carga |
| 13 | Ruta del mundo a 393 px: las etiquetas de lecciones bloqueadas se parten en tres líneas y chocan con el borde; la barra de pestañas tapa el último vértice en capturas de página completa. | Ruta (móvil) |
| 14 | Textos de interfaz que suenan a sistema: "Progreso reiniciado.", "No encontramos esta página.", "Este navegador no permite guardar datos". | Perfil, 404 |
| 15 | Receta para el arte inexistente: el README manda reemplazar archivos en `assets/images/` sin indicar tamaño ni formato, y no hay forma de subir un original y obtener la versión optimizada sin correr comandos. | README |

## Orden de ejecución

1. **Paleta nueva como tokens del tema.** Roles nuevos en `web_theme_claro_prusia` (`surface_warm`, `progress_track`, `block_strong`, `block_bright`, `block_mid`, `block_soft`, `block_pale`), nuevos valores de `background`, `primary_selected_bg`, `primary_halo`, `mol_highlight` y `control_border` (3:1 sobre pastel), y derivación en el tema oscuro. Test de contraste con los pares nuevos (tinta sobre cada pastel, bordes sobre pastel). Ningún color fijo en componentes.
2. **Arte del autor en el repo.** Mover los 12 originales y `prompts_generacion.txt` a `arte/`; script `scripts/optimize-art.ts` (sharp) que genera `assets/images/*.png` a 512 px y `*@256.png` con alfa, ≤ 150 KB, sin recorte ni recolor; corre antes de `dev`, `build` y `test`, y en el workflow. Presupuesto: el arte precacheado no pasa de 1.5 MB.
3. **Metano tetraédrico con RDKit.** `scripts/gen_metano.py` (ETKDG + MMFF, cuñas y líneas discontinuas, tinta `#1E1E1E`, transparente, 512 px, solo el rótulo "109.5°"), salida en `arte/originales/asset_metano_tetraedrico.png`.
4. **Conectar el arte donde el seed lo asigna.** `AssetImage` con `srcset`; Carbo idle en bienvenida, happy en resultado, think en pistas y diagnóstico, sad pequeño al fallar; íconos de mundo en el mapa y en el encabezado de la ruta; moneda, cofre y protector de racha en Recompensas; intro de l_sp3. Por debajo de 40 px se conserva el ícono de línea.
5. **Superficies cálidas y bloques planos.** Bienvenida, resultado, cofres y recompensas sobre `#FFF9E6`; encabezado de mundo y fondo de ilustración con bloques pastel planos; sin degradados, marcos ni sombras.
6. **Estados vacíos, de carga y de error.** Indicador de carga en el arranque, error con texto claro y detalle técnico plegado, 404 interna con Carbo think, estados vacíos de repaso y recompensas, carga de moléculas, visor 3D y editor.
7. **Atajos de teclado.** 1 a 4 eligen la opción visible, Enter comprueba y continúa; se anuncian en escritorio y no interfieren con el editor ni con los campos de texto.
8. **Ajustes.** Sección "Ajustes" en Perfil: tema, vibración al responder (opcional, solo si el dispositivo la soporta) y respaldo del progreso (exportar e importar un archivo JSON validado).
9. **Acerca de.** Ruta `/acerca` con qué es la app, cómo guarda los datos, motores de código abierto, versión y datos del autor marcados como `[completar]` cuando no están en el repo. Enlaces desde la bienvenida y el perfil.
10. **Metadatos para compartir y 404 propia.** Descripción, Open Graph y Twitter Card con imagen generada desde el arte; `404.html` con la marca y el enlace a la app, generada en el build con los colores del tema.
11. **Rendimiento en celular.** CSS del shell en línea en `index.html` (sin petición bloqueante) y pantallas cargadas con `React.lazy` para que la bienvenida no descargue el resto.
12. **Errores de flujo y textos.** Etiquetas de la ruta en móvil, textos de interfaz más claros, y lo que aparezca al recorrer el flujo después de los cambios.
13. **Documentación.** Receta del arte en el README, decisiones nuevas en `DECISIONES.md`, `CAMBIOS_PULIDO.md` con lo hecho y lo pendiente.
