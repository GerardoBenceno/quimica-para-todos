# Reporte químico

Conflictos del seed, discrepancias de fórmula, moléculas sin 3D y ejercicios derivados para revisión del autor. Nada de esto se corrigió en el código: las correcciones se hacen en `seed/` y `packs/base` se vuelve a copiar con `npm run sync:base`. La tabla de fórmulas y la de resaltados se generan con `python3 scripts/gen_molecules.py` (datos crudos en `reports/mol_report.json`).

## Estado

- Errores químicos conocidos en ítems activos: **ninguno** detectado por la revisión automática (fórmulas, nombres contra estructura) ni por la lectura de los 58 enunciados (50 ejercicios y 8 ítems de diagnóstico).
- La parte química **no se marca como aprobada** desde aquí: queda pendiente de la revisión del autor sobre las observaciones de redacción y sobre los 16 ejercicios derivados del paquete web (10 de dibujo o elección de estructura y 6 con visor 3D), listados al final.

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

Todos viven en `public/content/packs/web/` y los genera `npx tsx scripts/derive-web-pack.ts` desde el seed; no se editan a mano. Ningún ejercicio del seed se modificó. Reglas:

- **draw_structure**: solo de ejercicios de nomenclatura del seed que ya emparejan el nombre correcto con `payload.structure_smiles` (5). No se derivan de grupos funcionales. Los de `e_metano`, `e_propano` y `e_butano` no se derivaron porque su estructura está en el campo `smiles` y en una fórmula escrita, no en `payload.structure_smiles`. La respuesta es el mismo SMILES del seed; la explicación y el feedback son los del ejercicio de origen. El único texto nuevo es el enunciado "Dibuja la estructura: <nombre>" y, para `e_complete_etilmetilhexano`, el nombre completo armado con la plantilla y las piezas correctas del banco ("3-etil-2-metilhexano").
- **choose_structure**: variante de cada draw_structure para pantallas de menos de 600 px. Los distractores son otros pares nombre-estructura del seed, los de número de átomos más parecido; nunca se dibuja un nombre inválido (3-metilbutano, 3-etilbutano no tienen estructura).
- **view_3d**: ejercicios de hibridación del seed con estructura (metano, eteno, etino); misma pregunta, opciones y respuesta, con el visor 3D en lugar de la figura. Se excluyen los que preguntan cuál molécula es (e_sp3_molecula, e_sp2_molecula, e_sp_molecula), porque mostrar la molécula revelaría la respuesta.

| Id | Tipo | Origen | Nombre / enunciado | SMILES | Nota |
|---|---|---|---|---|---|
| web_draw_e_2metilbutano | draw_structure | e_2metilbutano | 2-metilbutano | `CCC(C)C` | Mismo par nombre-estructura del seed; explicación y feedback del ejercicio de origen. |
| web_choose_e_2metilbutano | choose_structure | e_2metilbutano | 2-metilbutano | `CCC(C)C` | Variante angosta de web_draw_e_2metilbutano. Distractores (pares del seed): 2,2-dimetilbutano `CCC(C)(C)C`, 2,3-dimetilbutano `CC(C)C(C)C`, 2-metilpentano `CCCC(C)C`. |
| web_draw_e_23dimetilbutano | draw_structure | e_23dimetilbutano | 2,3-dimetilbutano | `CC(C)C(C)C` | Mismo par nombre-estructura del seed; explicación y feedback del ejercicio de origen. |
| web_choose_e_23dimetilbutano | choose_structure | e_23dimetilbutano | 2,3-dimetilbutano | `CC(C)C(C)C` | Variante angosta de web_draw_e_23dimetilbutano. Distractores (pares del seed): 2,2-dimetilbutano `CCC(C)(C)C`, 2-metilpentano `CCCC(C)C`, 2-metilbutano `CCC(C)C`. |
| web_draw_e_complete_etilmetilhexano | draw_structure | e_complete_etilmetilhexano | 3-etil-2-metilhexano | `CC(C)C(CC)CCC` | Mismo par nombre-estructura del seed; explicación y feedback del ejercicio de origen. |
| web_choose_e_complete_etilmetilhexano | choose_structure | e_complete_etilmetilhexano | 3-etil-2-metilhexano | `CC(C)C(CC)CCC` | Variante angosta de web_draw_e_complete_etilmetilhexano. Distractores (pares del seed): 2,2-dimetilbutano `CCC(C)(C)C`, 2,3-dimetilbutano `CC(C)C(C)C`, 2-metilpentano `CCCC(C)C`. |
| web_draw_e_22dimetilbutano | draw_structure | e_22dimetilbutano | 2,2-dimetilbutano | `CCC(C)(C)C` | Mismo par nombre-estructura del seed; explicación y feedback del ejercicio de origen. |
| web_choose_e_22dimetilbutano | choose_structure | e_22dimetilbutano | 2,2-dimetilbutano | `CCC(C)(C)C` | Variante angosta de web_draw_e_22dimetilbutano. Distractores (pares del seed): 2,3-dimetilbutano `CC(C)C(C)C`, 2-metilpentano `CCCC(C)C`, 2-metilbutano `CCC(C)C`. |
| web_draw_e_2metilpentano | draw_structure | e_2metilpentano | 2-metilpentano | `CCCC(C)C` | Mismo par nombre-estructura del seed; explicación y feedback del ejercicio de origen. |
| web_choose_e_2metilpentano | choose_structure | e_2metilpentano | 2-metilpentano | `CCCC(C)C` | Variante angosta de web_draw_e_2metilpentano. Distractores (pares del seed): 2,2-dimetilbutano `CCC(C)(C)C`, 2,3-dimetilbutano `CC(C)C(C)C`, 2-metilbutano `CCC(C)C`. |
| web_v3d_e_sp3_geom | view_3d | e_sp3_geom | ¿Qué geometría tiene un carbono con hibridación sp³? | `C` | Mismo enunciado, opciones y respuesta; agrega el visor 3D rotable. |
| web_v3d_e_sp3_sigma | view_3d | e_sp3_sigma | Un carbono sp³ forma 4 enlaces sigma y ningún enlace pi. | `C` | Mismo enunciado, opciones y respuesta; agrega el visor 3D rotable. |
| web_v3d_e_sp3_molecula | view_3d | e_sp3_molecula | ¿Cuál molécula tiene todos sus carbonos con hibridación sp³? | `C` | No derivado: la respuesta es la propia molécula y el visor la revelaría. |
| web_v3d_e_sp2_geom | view_3d | e_sp2_geom | ¿Qué geometría tiene un carbono sp²? | `C=C` | Mismo enunciado, opciones y respuesta; agrega el visor 3D rotable. |
| web_v3d_e_sp2_enlaces | view_3d | e_sp2_enlaces | Un carbono sp² forma 3 enlaces sigma y 1 enlace pi. | `C=C` | Mismo enunciado, opciones y respuesta; agrega el visor 3D rotable. |
| web_v3d_e_sp2_molecula | view_3d | e_sp2_molecula | ¿Cuál molécula contiene carbonos con hibridación sp²? | `C=C` | No derivado: la respuesta es la propia molécula y el visor la revelaría. |
| web_v3d_e_sp_geom | view_3d | e_sp_geom | ¿Qué geometría tiene un carbono sp? | `C#C` | Mismo enunciado, opciones y respuesta; agrega el visor 3D rotable. |
| web_v3d_e_sp_enlaces | view_3d | e_sp_enlaces | Un carbono sp forma 2 enlaces sigma y 2 enlaces pi. | `C#C` | Mismo enunciado, opciones y respuesta; agrega el visor 3D rotable. |
| web_v3d_e_sp_molecula | view_3d | e_sp_molecula | ¿Cuál molécula contiene carbonos con hibridación sp? | `C#C` | No derivado: la respuesta es la propia molécula y el visor la revelaría. |

## Auditoría química automática (ronda de pulido)

`python3 -I scripts/audit_chem.py` recorre cada ejercicio activo con SMILES del seed y del paquete web (47 ejercicios: 27 del seed, 4 ítems del diagnóstico y 16 derivados; 19 SMILES únicos) y escribe `reports/audit_quimica.json`. Para cada uno calcula con RDKit la fórmula, el número de carbonos, la cadena más larga, la hibridación de cada carbono y los grupos funcionales por SMARTS (alcohol, éter, aldehído, cetona, ácido carboxílico, éster, amina, amida, nitrilo, alqueno, alquino, haluros, aromático), y los compara con lo que afirma el texto: nombre correcto de alcano (reconstruye el SMILES desde el nombre y exige localizadores mínimos), fórmulas escritas, carbonos de la cadena principal, familia afirmada, tipo de carbono, hibridación, geometría y conteo sigma y pi; en el paquete web comprueba además que cada derivado conserve SMILES, nombre, explicación y opciones de su origen y que todo distractor de `choose_structure` sea un par nombre-estructura real del seed.

Resultado: 242 comprobaciones, 47 coincidencias, 0 discrepancias, 0 sin referencia. Un control negativo aparte (no sobre el contenido) confirma que el auditor detecta "3-metilbutano", "3-etilbutano", una amina afirmada para la acetamida y un alcohol afirmado para una molécula con ácido. Limitaciones: solo traduce a estructura nombres de alcanos acíclicos con sustituyentes metil a butil; las familias de las explicaciones se leen por palabra; los 19 ejercicios del seed sin SMILES quedan fuera.
