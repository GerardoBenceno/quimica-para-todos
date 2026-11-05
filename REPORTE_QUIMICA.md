# Reporte químico

Conflictos del seed, discrepancias de fórmula, moléculas sin 3D y ejercicios derivados para revisión del autor. Nada de esto se corrigió en el código: las correcciones se hacen en `seed/` y `packs/base` se vuelve a copiar con `npm run sync:base`. La tabla de fórmulas y la de resaltados se generan con `python3 scripts/gen_molecules.py` (datos crudos en `reports/mol_report.json`).

## Estado

- Errores químicos conocidos en ítems activos: **ninguno** detectado por la revisión automática (fórmulas, nombres contra estructura) ni por la lectura de los 58 enunciados (50 ejercicios y 8 ítems de diagnóstico).
- La parte química **no se marca como aprobada** desde aquí: queda pendiente de la revisión del autor sobre las observaciones de la sección "Observaciones de redacción" y sobre la lista de ejercicios derivados (hito 4).

## Fórmulas moleculares (hito 2)

Para cada SMILES único de los paquetes del manifest se calculó la fórmula con RDKit y se comparó con la que se deduce del propio seed: la fórmula escrita en el texto (por ejemplo "CH₃-CH₂-CH₃" o "Metano (CH₄)") y la de los nombres de alcanos (`2,3-dimetilbutano` da C₆H₁₄). Total: 19 SMILES, 0 discrepancias.

| SMILES | Fórmula RDKit | Fórmula según el texto | Ejercicios que la mencionan | Resultado | 3D |
|---|---|---|---|---|---|
| `C` | CH4 | CH4 | diag_07, e_cual_organico, e_metano, e_sp3_molecula | coincide | sí |
| `C=C` | C2H4 | C2H4 | e_sp2_molecula | coincide | sí |
| `C#C` | C2H2 | C2H2 | e_sp_molecula | coincide | sí |
| `CC(C)(C)C` | C5H12 | C5H12 | e_tipo_cuaternario | coincide | sí |
| `CCO` | C2H6O | sin dato en el texto | (solo estructura) | sin referencia | sí |
| `CC(=O)O` | C2H4O2 | sin dato en el texto | (solo estructura) | sin referencia | sí |
| `CC=O` | C2H4O | sin dato en el texto | (solo estructura) | sin referencia | sí |
| `CC(=O)C` | C3H6O | sin dato en el texto | (solo estructura) | sin referencia | sí |
| `COC` | C2H6O | sin dato en el texto | (solo estructura) | sin referencia | sí |
| `CN` | CH5N | sin dato en el texto | (solo estructura) | sin referencia | sí |
| `CC(=O)N` | C2H5NO | sin dato en el texto | (solo estructura) | sin referencia | sí |
| `CCC` | C3H8 | C3H8 | e_propano | coincide | sí |
| `CCCC` | C4H10 | C4H10 | e_butano | coincide | sí |
| `CCCCCC` | C6H14 | C6H14 | e_hexano_n | coincide | sí |
| `CCC(C)C` | C5H12 | C5H12 | e_2metilbutano | coincide | sí |
| `CC(C)C(C)C` | C6H14 | C6H14 | diag_08, e_23dimetilbutano | coincide | sí |
| `CC(C)C(CC)CCC` | C9H20 | C9H20 | e_complete_etilmetilhexano | coincide | sí |
| `CCC(C)(C)C` | C6H14 | C6H14 | e_22dimetilbutano | coincide | sí |
| `CCCC(C)C` | C6H14 | C6H14 | e_2metilpentano | coincide | sí |

"Sin referencia" significa que el texto del ejercicio no trae fórmula ni nombre de alcano con qué comparar (por ejemplo, los ejercicios de grupos funcionales solo muestran la estructura). En esos casos la estructura se verificó a mano contra el nombre común que da la explicación: `CCO` etanol, `CC(=O)O` ácido acético, `CC=O` acetaldehído, `CC(=O)C` acetona, `COC` dimetil éter, `CN` metilamina, `CC(=O)N` acetamida, `C=C` eteno, `C#C` etino. Todas coinciden.

## Moléculas sin 3D

Ninguna. Las 19 estructuras tienen SDF con hidrógenos (ETKDGv3, semilla fija `0x5EED`, optimización MMFF).

## Cadena principal resaltada

Se resalta la cadena principal con localizadores solo cuando el nombre correcto del seed (respuesta de la opción correcta, nombre armado de `fill_blanks` o nombre en el enunciado) es un alcano que se puede leer y existe una única cadena numerada, salvo simetría de la molécula, que reproduce sus localizadores. Si no, la estructura se muestra sin resaltar.

| SMILES | Nombre del seed | Resultado | Motivo |
|---|---|---|---|
| `C` | metano | sin resaltar | cadena de un solo carbono |
| `CC(C)(C)C` | 2,2-dimetilpropano | resaltada | cadena única salvo simetría |
| `CCC` | propano | resaltada | cadena única salvo simetría |
| `CCCC` | butano | resaltada | cadena única salvo simetría |
| `CCCCCC` | hexano | resaltada | cadena única salvo simetría |
| `CCC(C)C` | 2-metilbutano | resaltada | cadena única salvo simetría |
| `CC(C)C(C)C` | 2,3-dimetilbutano | resaltada | cadena única salvo simetría |
| `CC(C)C(CC)CCC` | 3-etil-2-metilhexano | resaltada | cadena única salvo simetría |
| `CCC(C)(C)C` | 2,2-dimetilbutano | resaltada | cadena única salvo simetría |
| `CCCC(C)C` | 2-metilpentano | resaltada | cadena única salvo simetría |

Estructuras que se muestran sin resaltar por no tener un nombre de alcano asociado en el seed: `C`, `C=C`, `C#C`, `CCO`, `CC(=O)O`, `CC=O`, `CC(=O)C`, `COC`, `CN`, `CC(=O)N`. Son metano (un solo carbono), eteno, etino y las de grupos funcionales; el resaltado del grupo funcional no se agregó porque requeriría definir patrones químicos que el seed no trae.

## Conflictos del seed

Ninguno que bloquee. Se registran dos puntos de configuración, no de química:

1. `app_config.cfg_diag_thresholds` usa una escala de aciertos (`max: 3, 6, 8`) distinta de `diagnostic.scoring.thresholds` (ratio 0.4, 0.75, 1.0). Por especificación se ignora y manda `diagnostic.scoring`.
2. `app_config.features.flags.molecules_3d` vale `false` en el seed; `public/config/features.json` lo enciende.

## Observaciones de redacción (no son errores químicos)

Se listan para que el autor decida; la app las muestra tal como están.

| Id | Texto | Observación |
|---|---|---|
| e_id_etanol, e_id_acetico, e_id_acetaldehido, e_id_acetona, e_id_eter, e_id_amina, e_id_amida (explain) | "CCO es etanol...", "CN es metilamina..." | La explicación muestra SMILES, notación que el estudiante no conoce. "CN" puede leerse como el grupo ciano. Sugerencia: usar la fórmula condensada (CH₃-CH₂-OH, CH₃-NH₂). |
| e_id_amina (explain), e_sust_metil (explain), e_sust_etil (explain), lesson.l_sp2.intro | "-NH2", "-CH3", "-CH2CH3", "CH2=CH2" | Dígitos normales en lugar de subíndices Unicode; el resto del seed usa ₂ y ₃. La app no puede convertirlos sin modificar el texto. |
| e_2metilbutano, e_23dimetilbutano, diag_08 (opciones) | "3-metilbutano", "3-etilbutano" | Distractores con nombres no válidos. Es intencional (la explicación lo aclara), pero por eso no se dibujan nunca como estructura en `choose_structure`. |

## Ejercicios derivados o modificados

Se completa en el hito 4 (draw_structure, choose_structure) y en el hito 5 (view_3d).
