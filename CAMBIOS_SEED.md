# Cambios al seed (4 de noviembre de 2026)

Correcciones de precisión química hechas por el autor antes de construir, a partir de la revisión previa. Solo cambian textos de seed/translations_es.json; ids, respuestas, opciones y SMILES quedan igual. Cada fila modificada subió su content_version.

| Clave | Antes | Ahora |
|---|---|---|
| ex.diag_04.prompt | El grupo -OH corresponde a: | El grupo -OH unido a un carbono saturado corresponde a: |
| ex.e_grupo_nh2.explain | -NH2 sobre un carbono define una amina. | Un -NH₂ unido a un grupo alquilo es una amina primaria. Si el nitrógeno estuviera unido al carbono de un C=O, sería una amida. |
| ex.e_grupo_nh2.prompt | El grupo -NH₂ unido a un carbono corresponde a: | El grupo -NH₂ unido a un grupo alquilo corresponde a: |
| ex.e_grupo_oh.explain | -OH unido a un carbono define un alcohol. | Un -OH unido a un carbono saturado, es decir, con solo enlaces sencillos, define un alcohol. En el -COOH el OH está unido a un carbonilo y forma parte de un ácido carboxílico. |
| ex.e_grupo_oh.prompt | El grupo -OH corresponde a la familia de los: | El grupo -OH unido a un carbono saturado corresponde a la familia de los: |
| feedback.ft_grupos_funcionales.message | Revisa el grupo: -OH alcohol; -CHO aldehído; C=O entre carbonos cetona; -COOH ácido carboxílico. | Revisa el grupo: -OH sobre un carbono saturado es alcohol; -CHO es aldehído; C=O entre dos carbonos es cetona; -COOH es ácido carboxílico. |
| feedback.ft_grupos_nitrogenados.message | -NH2 sobre carbono es amina; C(=O)-N es amida. | -NH₂ unido a un grupo alquilo es amina; si el nitrógeno está unido al carbono de un C=O, es amida. |
| feedback.ft_grupos_oxigenados.hint | ¿El carbonilo está al final o en medio de la cadena? | ¿Hay un C=O? Si lo hay, fíjate si está al final de la cadena o entre dos carbonos. Si no lo hay, revisa si el oxígeno une dos carbonos. |
| feedback.ft_organico.hint | Busca el carbono en la fórmula. | El carbono es necesario, pero no basta. Recuerda que el CO₂ se considera inorgánico. |
| feedback.ft_organico.message | Un compuesto orgánico se define por contener carbono (con hidrógeno y otros elementos). | Los compuestos orgánicos contienen carbono, casi siempre unido a hidrógeno. Algunos compuestos del carbono, como el CO₂, se clasifican tradicionalmente como inorgánicos. |
| lesson.l_grupos_intro.intro | El grupo funcional es el átomo o conjunto de átomos que define la familia y las propiedades de un compuesto: -OH alcohol, -CHO aldehído, C=O cetona, -COOH ácido carboxílico. | El grupo funcional es el átomo o conjunto de átomos que define la familia y las propiedades de un compuesto: -OH unido a un carbono saturado (alcohol), -CHO (aldehído), C=O unido a dos carbonos (cetona) y -COOH (ácido carboxílico). |
| lesson.l_grupos_nitrogenados.intro | El nitrógeno define aminas (-NH2 unido a carbono) y amidas (carbonilo C=O unido a nitrógeno). Distinguirlos depende de si hay o no un grupo carbonilo adyacente. | El nitrógeno aparece en aminas, como la metilamina (CH₃-NH₂), y en amidas, donde el nitrógeno está unido directamente al carbono de un grupo carbonilo (C=O). Distinguirlas depende de si hay o no un carbonilo junto al nitrógeno. |
| lesson.l_grupos_oxigenados.intro | El oxígeno aparece en varias familias según su entorno: -OH (alcohol), C=O terminal con H (aldehído), C=O entre carbonos (cetona), C-O-C (éter) y -COOH (ácido carboxílico). | El oxígeno aparece en varias familias según su entorno: -OH unido a un carbono saturado (alcohol), C=O terminal con H (aldehído), C=O entre carbonos (cetona), C-O-C (éter) y -COOH (ácido carboxílico). |
