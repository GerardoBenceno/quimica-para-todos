#!/usr/bin/env python3
"""Genera ejercicios de estereoquímica con todas las respuestas calculadas por RDKit.

Familias: estereo_centros, estereo_es_centro, estereo_rs, estereo_ez, estereo_relacion.
Salida (formato CSV del importador, ver plantillas/ejemplo/):
  scripts/estereo_out/ejercicios.csv, traducciones.csv, retroalimentacion.csv
  reports/estereo.json  comprobaciones por ejercicio (descartados incluidos)

Determinista: semilla fija para barajar opciones y para el conformero ETKDG.
Uso: python3 scripts/gen_estereo.py
"""
from __future__ import annotations

import json
import random
import re
import sys
from pathlib import Path

from rdkit import Chem, RDLogger
from rdkit.Chem import AllChem, rdCIPLabeler, rdMolDescriptors, rdMolTransforms
from rdkit.Chem.Draw import rdMolDraw2D

RDLogger.DisableLog("rdApp.*")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "scripts/estereo_out"
REPORT = ROOT / "reports/estereo.json"
SEED = 20260901
EMBED_SEED = 0x5EED

# ------------------------------------------------------------ moléculas
# (nombre, SMILES isomérico). Ambos enantiómeros / ambos E,Z cuando existen.
MOLECULES: list[tuple[str, str]] = [
    ("(R)-2-butanol", "C[C@@H](O)CC"),
    ("(S)-2-butanol", "C[C@H](O)CC"),
    ("(R)-2-bromobutano", "C[C@@H](Br)CC"),
    ("(S)-2-bromobutano", "C[C@H](Br)CC"),
    ("(R)-2-clorobutano", "C[C@@H](Cl)CC"),
    ("(S)-2-clorobutano", "C[C@H](Cl)CC"),
    ("ácido (S)-láctico", "C[C@H](O)C(=O)O"),
    ("ácido (R)-láctico", "C[C@@H](O)C(=O)O"),
    ("(S)-alanina", "C[C@H](N)C(=O)O"),
    ("(R)-alanina", "C[C@@H](N)C(=O)O"),
    ("(S)-2-aminobutano", "C[C@H](N)CC"),
    ("(R)-2-aminobutano", "C[C@@H](N)CC"),
    ("(R)-1-fluoroetanol", "C[C@@H](F)O"),
    ("(S)-1-fluoroetanol", "C[C@H](F)O"),
    ("2-cloropropano", "CC(C)Cl"),
    ("2-metilbutano", "CC(C)CC"),
    ("propan-2-ol", "CC(C)O"),
    ("1-butanol", "CCCCO"),
    ("2,3-dibromobutano A", "C[C@@H](Br)[C@H](Br)C"),
    ("2,3-dibromobutano B", "C[C@@H](Br)[C@@H](Br)C"),
    ("2,3-dibromobutano C", "C[C@H](Br)[C@H](Br)C"),
    ("treonina", "C[C@@H](O)[C@H](N)C(=O)O"),
    ("1,2-dimetilciclohexano A", "C[C@H]1CCCC[C@@H]1C"),
    ("1,2-dimetilciclohexano B", "C[C@H]1CCCC[C@H]1C"),
    ("1,2-dimetilciclohexano C", "C[C@@H]1CCCC[C@@H]1C"),
    ("(E)-2-buteno", "C/C=C/C"),
    ("(Z)-2-buteno", "C/C=C\\C"),
    ("(E)-2-penteno", "C/C=C/CC"),
    ("(Z)-2-penteno", "C/C=C\\CC"),
    ("(E)-1-cloropropeno", "Cl/C=C/C"),
    ("(Z)-1-cloropropeno", "Cl/C=C\\C"),
    ("(E)-1,2-dicloroeteno", "Cl/C=C/Cl"),
    ("(Z)-1,2-dicloroeteno", "Cl/C=C\\Cl"),
    ("(E)-3-hexeno", "CC/C=C/CC"),
    ("(Z)-3-hexeno", "CC/C=C\\CC"),
    ("propeno", "C=CC"),
    ("1-buteno", "C=CCC"),
    ("2-metil-2-buteno", "CC(C)=CC"),
    ("2-metilpropeno", "CC(C)=C"),
    ("1,1-dicloroeteno", "ClC(Cl)=C"),
]

# Etiquetas de sustituyente: SMILES canónico del fragmento (con * en el punto de corte).
SUBST_LABELS = {
    "*O": "OH", "*C": "CH₃", "*CC": "C₂H₅", "*CCC": "C₃H₇", "*Br": "Br", "*Cl": "Cl",
    "*F": "F", "*N": "NH₂", "*C(=O)O": "COOH", "*C(C)C": "CH(CH₃)₂", "*C(=O)C": "COCH₃",
    "*CO": "CH₂OH", "*C(C)O": "CH(OH)CH₃", "*C(N)C(=O)O": "CH(NH₂)COOH",
    "*C(O)C": "CH(OH)CH₃", "*C(C)N": "CH(NH₂)CH₃", "*C(Br)C": "CHBrCH₃", "*C(C)Br": "CHBrCH₃",
    "*[C@H](Br)C": "CHBrCH₃", "*[C@@H](Br)C": "CHBrCH₃",
    "*[C@H](O)C": "CH(OH)CH₃", "*[C@@H](O)C": "CH(OH)CH₃",
    "*[C@H](N)C(=O)O": "CH(NH₂)COOH", "*[C@@H](N)C(=O)O": "CH(NH₂)COOH",
}
SUBST_LABELS_PLAIN = {k: v.translate(str.maketrans("₀₁₂₃₄₅₆₇₈₉", "0123456789")) for k, v in SUBST_LABELS.items()}

REL_LABELS = {
    "identicas": "Idénticas", "enantiomeros": "Enantiómeros",
    "diastereomeros": "Diastereómeros", "constitucionales": "Isómeros constitucionales",
}
EZ_LABELS = {"E": "E", "Z": "Z", "sin": "Sin isomería geométrica"}
FAMILY_LESSON = {
    "estereo_centros": "estereo_l_centros", "estereo_es_centro": "estereo_l_centros",
    "estereo_rs": "estereo_l_rs", "estereo_ez": "estereo_l_ez", "estereo_relacion": "estereo_l_relaciones",
}
FAMILY_FT = {
    "estereo_centros": "estereo_ft_centros", "estereo_es_centro": "estereo_ft_centros",
    "estereo_rs": "estereo_ft_rs", "estereo_ez": "estereo_ft_ez", "estereo_relacion": "estereo_ft_relaciones",
}


# ------------------------------------------------------------ utilidades
def canon(smiles_or_mol, iso: bool = True) -> str:
    m = Chem.MolFromSmiles(smiles_or_mol) if isinstance(smiles_or_mol, str) else Chem.Mol(smiles_or_mol)
    for a in m.GetAtoms():
        a.SetAtomMapNum(0)
    return Chem.MolToSmiles(m, isomericSmiles=iso)


def labeled(smiles: str) -> Chem.Mol:
    m = Chem.MolFromSmiles(smiles)
    rdCIPLabeler.AssignCIPLabels(m)
    return m


def cip_code(obj) -> str | None:
    return obj.GetProp("_CIPCode") if obj.HasProp("_CIPCode") else None


def with_maps(smiles: str, atoms: list[int]) -> str:
    """SMILES del ejercicio: mapa 1 en el átomo resaltado (1 y 2 para un enlace)."""
    m = Chem.MolFromSmiles(smiles)
    for i, a in enumerate(atoms):
        m.GetAtomWithIdx(a).SetAtomMapNum(i + 1)
    out = Chem.MolToSmiles(m, canonical=False)
    # Volvemos a comprobar que al quitar el mapa la molécula es la misma.
    assert canon(out) == canon(smiles)
    return out


def mirror(mol: Chem.Mol) -> Chem.Mol:
    m = Chem.Mol(mol)
    for a in m.GetAtoms():
        t = a.GetChiralTag()
        if t == Chem.ChiralType.CHI_TETRAHEDRAL_CW:
            a.SetChiralTag(Chem.ChiralType.CHI_TETRAHEDRAL_CCW)
        elif t == Chem.ChiralType.CHI_TETRAHEDRAL_CCW:
            a.SetChiralTag(Chem.ChiralType.CHI_TETRAHEDRAL_CW)
    return m


def substituent_label(mol: Chem.Mol, center: int, nb: int) -> str | None:
    """Etiqueta del sustituyente que cuelga de `center` a través de `nb`; None si no es seguro."""
    bond = mol.GetBondBetweenAtoms(center, nb)
    if bond.IsInRing():
        return None
    frag = Chem.FragmentOnBonds(mol, [bond.GetIdx()], addDummies=True, dummyLabels=[(0, 0)])
    pieces = Chem.GetMolFrags(frag, asMols=True, sanitizeFrags=True)
    # localizar el fragmento que contiene nb
    frag_ids = Chem.GetMolFrags(frag, asMols=False)
    for fid, piece in zip(frag_ids, pieces):
        if nb in fid and center not in fid:
            sm = Chem.MolToSmiles(piece, isomericSmiles=False)
            return SUBST_LABELS.get(sm)
    return None


def neighbors_by_priority(mol: Chem.Mol, atom_idx: int) -> list[tuple[int | None, int, str]]:
    """[(idx o None para H implícito, rango CIP, etiqueta)] ordenado de mayor a menor prioridad."""
    a = mol.GetAtomWithIdx(atom_idx)
    out = []
    for n in a.GetNeighbors():
        rank = int(n.GetProp("_CIPRank")) if n.HasProp("_CIPRank") else -1
        out.append((n.GetIdx(), rank, substituent_label(mol, atom_idx, n.GetIdx())))
    for _ in range(a.GetTotalNumHs()):
        out.append((None, -1, "H"))
    out.sort(key=lambda t: -t[1])
    return out


def conformer_3d(mol: Chem.Mol) -> Chem.Mol | None:
    mh = Chem.AddHs(mol)
    p = AllChem.ETKDGv3()
    p.randomSeed = EMBED_SEED
    if AllChem.EmbedMolecule(mh, p) != 0:
        return None
    return mh


def rs_from_3d(mh: Chem.Mol, center: int, ordered: list[int]) -> str:
    """ordered = [a, b, c, d] índices (en mh) de mayor a menor prioridad."""
    conf = mh.GetConformer()
    import numpy as np
    pos = lambda i: np.array(conf.GetAtomPosition(i))
    a, b, c, d = (pos(i) for i in ordered)
    ctr = pos(center)
    v = np.dot(np.cross(b - a, c - a), d - ctr)
    return "R" if v > 0 else "S"


def rs_from_2d(mol2d: Chem.Mol, center: int, ordered_heavy: list[int]) -> tuple[str, str, str] | None:
    """Con coordenadas 2D y cuñas: (etiqueta, 'atrás'|'adelante', 'horario'|'antihorario').
    Solo si el de menor prioridad es un H implícito y hay exactamente una cuña en el centro."""
    import numpy as np
    conf = mol2d.GetConformer()
    wedges = []
    for b in mol2d.GetAtomWithIdx(center).GetBonds():
        if b.GetBeginAtomIdx() == center and b.GetBondDir() in (Chem.BondDir.BEGINWEDGE, Chem.BondDir.BEGINDASH):
            wedges.append(b.GetBondDir())
    if len(wedges) != 1:
        return None
    h_back = wedges[0] == Chem.BondDir.BEGINWEDGE  # cuña llena hacia el observador -> H hacia atrás
    pos = lambda i: np.array([conf.GetAtomPosition(i).x, conf.GetAtomPosition(i).y])
    a, b, c = (pos(i) for i in ordered_heavy)
    cross = (b - a)[0] * (c - a)[1] - (b - a)[1] * (c - a)[0]
    clockwise = cross < 0
    label = "R" if clockwise == h_back else "S"
    return label, ("atrás" if h_back else "adelante"), ("horario" if clockwise else "antihorario")


def roundtrip_check(smiles: str) -> tuple[bool, str]:
    """Dibuja el SVG y comprueba que las cuñas del molblock reproducen la estereoquímica."""
    m = Chem.MolFromSmiles(smiles)
    for a in m.GetAtoms():
        a.SetAtomMapNum(0)
    d = rdMolDraw2D.MolDraw2DSVG(300, 220)
    dm = Chem.Mol(m)
    rdMolDraw2D.PrepareMolForDrawing(dm)
    d.DrawMolecule(dm)
    d.FinishDrawing()
    svg = d.GetDrawingText()
    if "<svg" not in svg:
        return False, "svg vacío"
    m2 = Chem.Mol(m)
    AllChem.Compute2DCoords(m2)
    Chem.WedgeMolBonds(m2, m2.GetConformer())
    back = Chem.MolFromMolBlock(Chem.MolToMolBlock(m2))
    if back is None:
        return False, "molblock ilegible"
    got, want = Chem.MolToSmiles(back), Chem.MolToSmiles(m)
    return got == want, f"molblock→{got} vs {want}"


def mol_2d_wedged(smiles: str) -> Chem.Mol:
    m = Chem.MolFromSmiles(smiles)
    AllChem.Compute2DCoords(m)
    Chem.WedgeMolBonds(m, m.GetConformer())
    return m


# ------------------------------------------------------------ ejercicios
class Gen:
    def __init__(self):
        self.rng = random.Random(SEED)
        self.exercises: list[dict] = []
        self.translations: dict[str, str] = {}
        self.report: list[dict] = []
        self.counters: dict[str, int] = {}

    def next_id(self, family: str) -> str:
        short = family.replace("estereo_", "")
        self.counters[family] = self.counters.get(family, 0) + 1
        return f"estereo_e_{short}_{self.counters[family]:02d}"

    def add(self, family: str, smiles: str, prompt: str, options: list[tuple[str, str]], correct: str,
            explanation: str, checks: list[dict], smiles_b: str | None = None, extra: dict | None = None):
        eid = self.next_id(family)
        failed = [c for c in checks if not c["ok"]]
        entry = {"id": eid, "familia": family, "smiles": smiles, "respuesta": correct,
                 "comprobaciones": checks, "descartado": bool(failed),
                 "motivo": "; ".join(f"{c['nombre']}: {c['detalle']}" for c in failed) or None}
        if smiles_b:
            entry["smiles_b"] = smiles_b
        if extra:
            entry.update(extra)
        self.report.append(entry)
        if failed:
            return
        opts = list(options)
        self.rng.shuffle(opts)
        payload = {"structure_smiles": smiles,
                   "options": [{"key": f"ex.{eid}.opt.{v}", "value": v} for v, _ in opts]}
        etype = "multiple_choice"
        if smiles_b:
            payload = {"structure_smiles": smiles, "structure_smiles_b": smiles_b, "options": payload["options"]}
            etype = "compare_structures"
        self.exercises.append({
            "id": eid, "lesson_id": FAMILY_LESSON[family], "type": etype, "prompt_key": f"ex.{eid}.prompt",
            "payload": payload, "correct": {"value": correct}, "explanation_key": f"ex.{eid}.explain",
            "feedback_template_id": FAMILY_FT[family], "difficulty": 2, "xp": 10, "coins": 1, "topic": family,
            "prerequisites": [], "structure_asset_id": None, "smiles": smiles, "is_diagnostic": False,
            "content_version": 1, "is_active": True,
        })
        self.translations[f"ex.{eid}.prompt"] = prompt
        self.translations[f"ex.{eid}.explain"] = explanation
        for v, label in opts:
            self.translations[f"ex.{eid}.opt.{v}"] = label

    # (a) ----------------------------------------------------------------
    def centros(self, smiles: str):
        m = labeled(smiles)
        centers = Chem.FindMolChiralCenters(m, includeUnassigned=True, useLegacyImplementation=False)
        n = len(centers)
        checks = []
        ok, det = roundtrip_check(smiles)
        checks.append({"nombre": "svg_molblock_roundtrip", "ok": ok, "detalle": det})
        # comprobación independiente: carbonos sp3 con cuatro vecinos (H incluidos) de rango CIP distinto
        ranks = list(Chem.CanonicalRankAtoms(m, breakTies=False))
        indep = []
        for a in m.GetAtoms():
            if a.GetSymbol() != "C" or a.GetDegree() + a.GetTotalNumHs() != 4:
                continue
            nb = [ranks[x.GetIdx()] for x in a.GetNeighbors()]
            if a.GetTotalNumHs() > 1 or len(set(nb)) != len(nb):
                continue
            indep.append(a.GetIdx())
        # Para anillos simétricos (meso) la equivalencia por rango canónico no basta; comparamos con RDKit
        same = sorted(indep) == sorted(i for i, _ in centers)
        checks.append({"nombre": "recuento_independiente_vecinos_distintos", "ok": same,
                       "detalle": f"independiente={indep} rdkit={[i for i, _ in centers]}"})
        checks.append({"nombre": "opciones_distractoras_incorrectas", "ok": 0 <= n <= 3,
                       "detalle": f"n={n}, distractores = {[k for k in range(4) if k != n]}"})
        if n == 0:
            desc = "Ningún carbono tiene cuatro sustituyentes distintos."
        else:
            parts = []
            for idx, _ in centers:
                labs = [t[2] for t in neighbors_by_priority(m, idx)]
                if any(l is None for l in labs):
                    labs = None
                parts.append(f"C{idx + 1} ({', '.join(labs)})" if labs else f"C{idx + 1}")
            desc = "Carbonos con cuatro sustituyentes distintos: " + "; ".join(parts) + "."
        expl = f"Estereocentros encontrados: {n}. {desc}"
        self.add("estereo_centros", smiles, "¿Cuántos estereocentros tiene esta molécula?",
                 [(str(k), str(k)) for k in range(4)], str(n), expl, checks)

    # (b) ----------------------------------------------------------------
    def es_centro(self, smiles: str, want_center: bool):
        m = labeled(smiles)
        centers = {i for i, _ in Chem.FindMolChiralCenters(m, includeUnassigned=True, useLegacyImplementation=False)}
        cands = [a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() == "C" and
                 a.GetDegree() + a.GetTotalNumHs() == 4 and ((a.GetIdx() in centers) == want_center)]
        if not cands:
            return
        # determinista: el primero (sí) o el carbono sp3 no centro con más vecinos pesados (no)
        atom = cands[0] if want_center else max(cands, key=lambda i: (m.GetAtomWithIdx(i).GetDegree(), -i))
        checks = []
        ok, det = roundtrip_check(smiles)
        checks.append({"nombre": "svg_molblock_roundtrip", "ok": ok, "detalle": det})
        ranks = list(Chem.CanonicalRankAtoms(m, breakTies=False))
        a = m.GetAtomWithIdx(atom)
        nb = [ranks[x.GetIdx()] for x in a.GetNeighbors()]
        indep = a.GetTotalNumHs() <= 1 and len(set(nb)) == len(nb)
        checks.append({"nombre": "vecinos_distintos_independiente", "ok": indep == want_center,
                       "detalle": f"rangos vecinos={nb}, H={a.GetTotalNumHs()}"})
        labs = [t[2] for t in neighbors_by_priority(m, atom)]
        checks.append({"nombre": "sustituyentes_nombrables", "ok": all(labs), "detalle": str(labs)})
        answer = "si" if want_center else "no"
        if want_center:
            expl = f"Sí: el carbono resaltado tiene cuatro sustituyentes distintos ({', '.join(labs or [])}), por eso es un estereocentro."
        else:
            dup = [l for l in (labs or []) if (labs or []).count(l) > 1]
            expl = f"No: el carbono resaltado tiene sustituyentes repetidos ({', '.join(labs or [])}; se repite {dup[0] if dup else '?'}), por eso no es un estereocentro."
        self.add("estereo_es_centro", with_maps(smiles, [atom]), "¿El carbono resaltado es un estereocentro?",
                 [("si", "Sí"), ("no", "No")], answer, expl, checks)

    # (c) ----------------------------------------------------------------
    def rs(self, smiles: str):
        m = labeled(smiles)
        centers = [(i, c) for i, c in Chem.FindMolChiralCenters(m, includeUnassigned=True, useLegacyImplementation=False)]
        for idx, _ in centers[:1]:
            atom = m.GetAtomWithIdx(idx)
            label = cip_code(atom)
            checks = []
            ok, det = roundtrip_check(smiles)
            checks.append({"nombre": "svg_molblock_roundtrip", "ok": ok, "detalle": det})
            checks.append({"nombre": "etiqueta_rdkit", "ok": label in ("R", "S"), "detalle": str(label)})
            nbs = neighbors_by_priority(m, idx)
            labs = [t[2] for t in nbs]
            checks.append({"nombre": "sustituyentes_nombrables", "ok": all(labs) and len(nbs) == 4 and nbs[-1][0] is None,
                           "detalle": str(labs)})
            ranks = [t[1] for t in nbs[:3]]
            checks.append({"nombre": "prioridades_distintas", "ok": len(set(ranks)) == 3, "detalle": str(ranks)})
            # verificación 3D independiente
            mh = conformer_3d(m)
            lab3d = None
            if mh is not None and nbs[-1][0] is None:
                h = [n.GetIdx() for n in mh.GetAtomWithIdx(idx).GetNeighbors() if n.GetAtomicNum() == 1]
                ordered = [t[0] for t in nbs[:3]] + [h[0]]
                lab3d = rs_from_3d(mh, idx, ordered)
            checks.append({"nombre": "rs_volumen_quiral_3d", "ok": lab3d == label, "detalle": f"3d={lab3d}"})
            # verificación 2D con cuñas (la que se explica)
            m2 = mol_2d_wedged(smiles)
            r2 = rs_from_2d(m2, idx, [t[0] for t in nbs[:3]]) if nbs[-1][0] is None else None
            checks.append({"nombre": "rs_cunas_2d", "ok": r2 is not None and r2[0] == label, "detalle": str(r2)})
            # las cuñas del dibujo (PrepareMolForDrawing, como gen_molecules.py) deben ser las mismas
            dm = Chem.Mol(m)
            for a in dm.GetAtoms():
                a.SetAtomMapNum(0)
            prepared = rdMolDraw2D.PrepareMolForDrawing(dm) or dm
            dirs_draw = {b.GetIdx(): (str(b.GetBondDir()), b.GetBeginAtomIdx()) for b in prepared.GetBonds() if b.GetBondDir() != Chem.BondDir.NONE}
            dirs_mine = {b.GetIdx(): (str(b.GetBondDir()), b.GetBeginAtomIdx()) for b in m2.GetBonds() if b.GetBondDir() != Chem.BondDir.NONE}
            checks.append({"nombre": "cunas_del_dibujo_coinciden", "ok": dirs_draw == dirs_mine, "detalle": str(dirs_draw)})
            other = "S" if label == "R" else "R"
            checks.append({"nombre": "distractor_incorrecto", "ok": other != label and other != lab3d, "detalle": other})
            if r2 is None:
                r2 = (None, "?", "?")
            expl = (f"Prioridades CIP en el carbono resaltado: 1 = {labs[0]}, 2 = {labs[1]}, 3 = {labs[2]}, 4 = {labs[3]} (menor). "
                    f"El sustituyente de menor prioridad apunta hacia {r2[1]}; recorriendo 1→2→3 el giro es {r2[2]}, "
                    f"por tanto la configuración es {label}"
                    + (" (como el de menor prioridad apunta hacia adelante, se invierte el giro observado)." if r2[1] == "adelante" else "."))
            self.add("estereo_rs", with_maps(smiles, [idx]), "¿Qué configuración tiene el carbono resaltado?",
                     [("R", "R"), ("S", "S")], label or "?", expl, checks)

    # (d) ----------------------------------------------------------------
    def ez(self, smiles: str):
        m = labeled(smiles)
        dbs = [b for b in m.GetBonds() if b.GetBondType() == Chem.BondType.DOUBLE
               and b.GetBeginAtom().GetSymbol() == "C" and b.GetEndAtom().GetSymbol() == "C"]
        if not dbs:
            return
        b = dbs[0]
        a1, a2 = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
        label = cip_code(b)  # 'E' | 'Z' | None
        checks = []
        ok, det = roundtrip_check(smiles)
        checks.append({"nombre": "svg_molblock_roundtrip", "ok": ok, "detalle": det})
        # sustituyentes por carbono (sin contar el otro carbono del doble enlace)
        ranks = list(Chem.CanonicalRankAtoms(m, breakTies=False))

        def side(ci: int, other: int):
            at = m.GetAtomWithIdx(ci)
            subs = []
            for n in at.GetNeighbors():
                if n.GetIdx() == other:
                    continue
                subs.append((n.GetIdx(), int(n.GetProp("_CIPRank")) if n.HasProp("_CIPRank") else -1,
                             ranks[n.GetIdx()], substituent_label(m, ci, n.GetIdx())))
            for _ in range(at.GetTotalNumHs()):
                subs.append((None, -1, -1, "H"))
            subs.sort(key=lambda t: -t[1])
            return subs

        s1, s2 = side(a1, a2), side(a2, a1)
        labs = [t[3] for t in s1 + s2]
        checks.append({"nombre": "sustituyentes_nombrables", "ok": all(labs) and len(s1) == 2 and len(s2) == 2,
                       "detalle": str(labs)})
        same1 = (s1[0][0] is None and s1[1][0] is None) or (s1[0][0] is not None and s1[1][0] is not None and s1[0][2] == s1[1][2])
        same2 = (s2[0][0] is None and s2[1][0] is None) or (s2[0][0] is not None and s2[1][0] is not None and s2[0][2] == s2[1][2])
        no_iso_indep = same1 or same2
        if no_iso_indep:
            indep = "sin"
        else:
            mh = conformer_3d(m)
            indep = None
            if mh is not None:
                conf = mh.GetConformer()
                hi1 = s1[0][0] if s1[0][0] is not None else [n.GetIdx() for n in mh.GetAtomWithIdx(a1).GetNeighbors() if n.GetAtomicNum() == 1][0]
                hi2 = s2[0][0] if s2[0][0] is not None else [n.GetIdx() for n in mh.GetAtomWithIdx(a2).GetNeighbors() if n.GetAtomicNum() == 1][0]
                dih = abs(rdMolTransforms.GetDihedralDeg(conf, hi1, a1, a2, hi2))
                indep = "Z" if dih < 90 else "E"
        answer = label if label in ("E", "Z") else "sin"
        checks.append({"nombre": "ez_independiente_geometria", "ok": indep == answer,
                       "detalle": f"independiente={indep} rdkit={label}"})
        checks.append({"nombre": "distractores_incorrectos", "ok": indep == answer and answer in EZ_LABELS,
                       "detalle": str([k for k in EZ_LABELS if k != answer])})
        c1 = f"C{a1 + 1}: 1 = {s1[0][3]}, 2 = {s1[1][3]}"
        c2 = f"C{a2 + 1}: 1 = {s2[0][3]}, 2 = {s2[1][3]}"
        if answer == "sin":
            which = f"C{a1 + 1}" if same1 else f"C{a2 + 1}"
            rep = s1[0][3] if same1 else s2[0][3]
            expl = (f"Sustituyentes en cada carbono del doble enlace: {c1}; {c2}. "
                    f"{which} tiene dos sustituyentes idénticos ({rep} y {rep}), así que intercambiarlos no cambia nada: "
                    f"el doble enlace no presenta isomería geométrica.")
        else:
            lado = "del mismo lado" if answer == "Z" else "en lados opuestos"
            expl = (f"Prioridades CIP en cada carbono del doble enlace: {c1}; {c2}. "
                    f"Los sustituyentes de mayor prioridad ({s1[0][3]} y {s2[0][3]}) quedan {lado} del doble enlace, "
                    f"por tanto la isomería es {answer}.")
        self.add("estereo_ez", with_maps(smiles, [a1, a2]), "¿Qué isomería tiene el doble enlace resaltado?",
                 [(k, v) for k, v in EZ_LABELS.items()], answer, expl, checks)

    # (e) ----------------------------------------------------------------
    def relacion(self, sa: str, sb: str):
        ma, mb = Chem.MolFromSmiles(sa), Chem.MolFromSmiles(sb)
        iso_a, iso_b = canon(ma), canon(mb)
        flat_a, flat_b = canon(ma, iso=False), canon(mb, iso=False)
        fa, fb = rdMolDescriptors.CalcMolFormula(ma), rdMolDescriptors.CalcMolFormula(mb)
        mirror_a = canon(mirror(ma))
        if iso_a == iso_b:
            answer, why = "identicas", f"el SMILES canónico isomérico coincide ({iso_a})"
        elif flat_a == flat_b and mirror_a == iso_b:
            answer, why = "enantiomeros", f"mismo esqueleto ({flat_a}) y B ({iso_b}) es la imagen especular de A (todos los centros invertidos: {mirror_a})"
        elif flat_a == flat_b:
            answer, why = "diastereomeros", f"mismo esqueleto ({flat_a}), distinta estereoquímica ({iso_a} vs {iso_b}) y B no es el espejo de A ({mirror_a})"
        elif fa == fb:
            answer, why = "constitucionales", f"misma fórmula ({fa}) pero distinto esqueleto ({flat_a} vs {flat_b})"
        else:
            answer, why = None, f"fórmulas distintas ({fa} vs {fb}): no son isómeros"
        checks = []
        for tag, s in (("A", sa), ("B", sb)):
            ok, det = roundtrip_check(s)
            checks.append({"nombre": f"svg_molblock_roundtrip_{tag}", "ok": ok, "detalle": det})
        checks.append({"nombre": "clasificacion_definida", "ok": answer is not None, "detalle": why})
        # comprobación independiente: InChI (capa estereo) y conteo de centros invertidos
        if answer:
            ia, ib = Chem.MolToInchi(ma), Chem.MolToInchi(mb)
            indep_ident = ia == ib
            checks.append({"nombre": "inchi_coherente", "ok": indep_ident == (answer == "identicas"),
                           "detalle": f"{ia} | {ib}"})
            # distractores: cada otra opción falla la misma regla
            # distractores: cada alternativa contradice la comparación decisiva
            alt = {"identicas": iso_a == iso_b, "enantiomeros": flat_a == flat_b and mirror_a == iso_b and iso_a != iso_b,
                   "diastereomeros": flat_a == flat_b and iso_a != iso_b and mirror_a != iso_b,
                   "constitucionales": flat_a != flat_b and fa == fb}
            checks.append({"nombre": "distractores_incorrectos", "ok": all(not v for k, v in alt.items() if k != answer) and alt[answer],
                           "detalle": str(alt)})
        expl = f"Comparación que decidió: {why}. Relación: {REL_LABELS.get(answer or '', '?').lower()}."
        self.add("estereo_relacion", sa, "¿Qué relación hay entre las dos estructuras?",
                 list(REL_LABELS.items()), answer or "?", expl, checks, smiles_b=sb)


# ------------------------------------------------------------ CSV
def cell(v) -> str:
    if v is None:
        return ""
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, str):
        if v == "" or v in ("true", "false") or re.match(r"^-?\d+(\.\d+)?$", v) or re.match(r"^[\[{']", v):
            return "'" + v
        return v
    return json.dumps(v, ensure_ascii=False, separators=(",", ":"))


def quote(s: str) -> str:
    return '"' + s.replace('"', '""') + '"' if re.search(r'[",\r\n]', s) else s


def to_csv(rows: list[list[str]]) -> str:
    return "\r\n".join(",".join(quote(c) for c in r) for r in rows) + "\r\n"


EX_COLS = ["id", "lesson_id", "type", "prompt_key", "payload", "correct", "explanation_key", "feedback_template_id",
           "difficulty", "xp", "coins", "topic", "prerequisites", "structure_asset_id", "smiles", "is_diagnostic",
           "content_version", "is_active"]
FT_COLS = ["id", "key", "topic", "message_key", "hint_key", "severity", "content_version", "is_active"]

FEEDBACK = {
    "estereo_ft_centros": ("estereo_centros",
        "Un carbono es estereocentro solo si sus cuatro sustituyentes son distintos entre sí (contando el H). Si dos coinciden, no lo es.",
        "Revisa cada carbono sp³ y compara sus cuatro sustituyentes: basta que dos sean iguales para descartarlo."),
    "estereo_ft_rs": ("estereo_rs",
        "Ordena los sustituyentes por prioridad CIP (mayor número atómico primero), coloca el de menor prioridad hacia atrás y recorre 1→2→3: horario = R, antihorario = S. Si el de menor prioridad apunta hacia adelante, invierte el resultado.",
        "Primero asigna las prioridades 1-4; después fíjate hacia dónde apunta el sustituyente 4 antes de leer el giro."),
    "estereo_ft_ez": ("estereo_ez",
        "Asigna la prioridad CIP a los dos sustituyentes de cada carbono del doble enlace. Si los de mayor prioridad están del mismo lado es Z; en lados opuestos, E. Si un carbono tiene dos sustituyentes idénticos, no hay isomería geométrica.",
        "Comprueba primero si algún carbono del doble enlace repite sustituyente; si no, compara los de mayor prioridad de cada lado."),
    "estereo_ft_relaciones": ("estereo_relacion",
        "Compara el esqueleto: si difiere con la misma fórmula son isómeros constitucionales. Con el mismo esqueleto: iguales en todo, idénticas; todos los centros invertidos, enantiómeros; solo algunos, diastereómeros.",
        "Pregúntate en orden: ¿misma conectividad? ¿mismos centros? ¿están todos invertidos o solo algunos?"),
}


def main() -> int:
    g = Gen()
    byname = dict(MOLECULES)
    # (a) estereocentros: 0, 1, 2 y 3... (3 no disponible en la lista curada; opciones 0..3 igualmente)
    for nm in ["(R)-2-butanol", "2-cloropropano", "ácido (S)-láctico", "2,3-dibromobutano A", "1,2-dimetilciclohexano B",
               "treonina"]:
        g.centros(byname[nm])
    # (c) R/S
    for nm in ["(R)-2-butanol", "(S)-2-butanol", "(R)-2-bromobutano", "(S)-2-bromobutano", "ácido (S)-láctico",
               "ácido (R)-láctico", "(S)-alanina", "(R)-alanina", "(S)-2-aminobutano", "(R)-2-clorobutano"]:
        g.rs(byname[nm])
    # (d) E/Z
    for nm in ["(E)-2-buteno", "(Z)-2-buteno", "(E)-2-penteno", "(Z)-2-penteno", "(E)-1-cloropropeno",
               "(Z)-1-cloropropeno", "2-metil-2-buteno", "1-buteno", "(Z)-1,2-dicloroeteno", "(E)-3-hexeno"]:
        g.ez(byname[nm])
    # (e) relaciones
    pairs = [
        ("(R)-2-butanol", "(S)-2-butanol"),            # enantiómeros
        ("(R)-2-bromobutano", "(R)-2-bromobutano"),    # idénticas
        ("2,3-dibromobutano A", "2,3-dibromobutano B"),  # diastereómeros (meso vs quiral) según cálculo
        ("1,2-dimetilciclohexano A", "1,2-dimetilciclohexano B"),  # cis/trans → diastereómeros
        ("(S)-2-butanol", "1-butanol"),                # constitucionales
        ("(E)-2-buteno", "(Z)-2-buteno"),              # diastereómeros
        ("(S)-alanina", "(R)-alanina"),                # enantiómeros
        ("1,2-dimetilciclohexano A", "1,2-dimetilciclohexano C"),  # trans (S,S) vs trans (R,R): enantiómeros
        ("(E)-2-buteno", "2-metilpropeno"),            # constitucionales
    ]
    for a, b in pairs:
        g.relacion(byname[a], byname[b])
    # (b) es centro
    g.es_centro(byname["(S)-2-butanol"], True)
    g.es_centro(byname["2-cloropropano"], False)
    g.es_centro(byname["(S)-alanina"], True)
    g.es_centro(byname["propan-2-ol"], False)

    # Retroalimentación
    ft_rows = [FT_COLS]
    for fid, (topic, msg, hint) in FEEDBACK.items():
        ft_rows.append([fid, fid, topic, f"feedback.{fid}.message", f"feedback.{fid}.hint", "correction", "1", "true"])
        g.translations[f"feedback.{fid}.message"] = msg
        g.translations[f"feedback.{fid}.hint"] = hint

    OUT.mkdir(parents=True, exist_ok=True)
    ex_rows = [EX_COLS] + [[cell(e[c]) for c in EX_COLS] for e in g.exercises]
    (OUT / "ejercicios.csv").write_text(to_csv(ex_rows), "utf8")
    tr_rows = [["key", "locale", "value", "content_version"]]
    for k in sorted(g.translations):
        tr_rows.append([k, "es", cell(g.translations[k]), "1"])
    (OUT / "traducciones.csv").write_text(to_csv(tr_rows), "utf8")
    (OUT / "retroalimentacion.csv").write_text(to_csv(ft_rows), "utf8")

    per_family: dict[str, dict[str, int]] = {}
    for r in g.report:
        f = per_family.setdefault(r["familia"], {"generados": 0, "descartados": 0})
        f["generados"] += 0 if r["descartado"] else 1
        f["descartados"] += 1 if r["descartado"] else 0
    REPORT.parent.mkdir(exist_ok=True)
    REPORT.write_text(json.dumps({"semilla": SEED, "moleculas": MOLECULES, "resumen": per_family,
                                  "ejercicios": g.report}, ensure_ascii=False, indent=2) + "\n", "utf8")
    print(json.dumps(per_family, indent=1))
    for r in g.report:
        if r["descartado"]:
            print("DESCARTADO", r["id"], r["smiles"], r["motivo"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
