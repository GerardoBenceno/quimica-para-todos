#!/usr/bin/env python3
"""Pregenera las moléculas de todos los paquetes del manifest.

Por cada SMILES único que usan los paquetes de public/content/manifest.json:
  - public/mol/svg/<id>.svg        figura 2D (fixedBondLength 34)
  - public/mol/svg/<id>_thumb.svg  miniatura (fixedBondLength 16)
  - public/mol/svg/<id>_hl.svg     cadena principal resaltada con localizadores,
                                   solo si se deriva sin ambigüedad del nombre
                                   correcto del seed
  - public/mol/sdf/<id>.sdf        3D con hidrógenos (ETKDGv3, semilla fija, MMFF)
  - public/mol/index.json          clave = SMILES literal del contenido
  - reports/mol_report.json        fórmulas, nombres y casos para REPORTE_QUIMICA.md

Estilo: useBWAtomPalette, bondLineWidth 2, sin fondo; el negro se cambia por
currentColor y el relleno del resaltado por var(--mol-highlight) para que la
estructura siga al tema. No inventa coordenadas: si no hay 3D, sdf = null.

Uso: python3 scripts/gen_molecules.py   (requiere rdkit, ver requirements.txt)
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

from rdkit import Chem, RDLogger
from rdkit.Chem import AllChem, rdMolDescriptors
from rdkit.Chem.Draw import rdMolDraw2D

RDLogger.DisableLog("rdApp.*")

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
OUT = PUBLIC / "mol"

BOND_LENGTH = 34
THUMB_BOND_LENGTH = 16
LINE_WIDTH = 2
EMBED_SEED = 0x5EED
# Color centinela del resaltado; se reemplaza por la variable CSS del tema.
SENTINEL_RGB = (0.0, 1.0, 0.0)
SENTINEL_HEX = "#00FF00"
HIGHLIGHT_STYLE = "fill: var(--mol-highlight, #D5E1F1)"

SUB = str.maketrans("₀₁₂₃₄₅₆₇₈₉", "0123456789")


# ---------------------------------------------------------------- contenido
def load_packs() -> tuple[list[dict], dict[str, str]]:
    manifest = json.loads((PUBLIC / "content/manifest.json").read_text("utf8"))
    exercises: list[dict] = []
    translations: dict[str, str] = {}
    for pack in manifest["packs"]:
        files = manifest["files"].get(pack, [])
        d = PUBLIC / "content/packs" / pack
        if "exercises.json" in files:
            exercises += json.loads((d / "exercises.json").read_text("utf8"))
        if "diagnostic.json" in files:
            exercises += json.loads((d / "diagnostic.json").read_text("utf8")).get("items", [])
        if "translations_es.json" in files:
            for t in json.loads((d / "translations_es.json").read_text("utf8")):
                translations[t["key"]] = t["value"]
    return exercises, translations


def smiles_of(ex: dict) -> list[str]:
    out = [ex.get("smiles"), ex["payload"].get("structure_smiles")]
    out += [o.get("smiles") for o in ex["payload"].get("options", [])]
    if ex["type"] == "draw_structure":
        out.append(ex["correct"].get("smiles"))
    return [s for s in out if isinstance(s, str) and s]


def correct_label(ex: dict, tr: dict[str, str]) -> str | None:
    p = ex["payload"]
    if ex["type"] == "fill_blanks" and p.get("template"):
        name = p["template"]
        for b in p.get("blanks", []):
            name = name.replace("{" + b + "}", ex["correct"].get(b, ""))
        return name
    value = ex["correct"].get("value")
    for o in p.get("options", []):
        if o["value"] == value:
            return tr.get(o["key"])
    return None


# ---------------------------------------------------------- nombres IUPAC
PARENTS = {"met": 1, "et": 2, "prop": 3, "but": 4, "pent": 5, "hex": 6, "hept": 7, "oct": 8, "non": 9, "dec": 10}
ALKYL = {"met": 1, "et": 2, "prop": 3, "but": 4, "pent": 5}
MULT = {"": 1, "di": 2, "tri": 3, "tetra": 4}
NAME_RE = re.compile(
    r"^(?P<subs>(?:\d+(?:,\d+)*-(?:di|tri|tetra)?(?:met|et|prop|but|pent)il-?)*)"
    r"(?P<parent>met|et|prop|but|pent|hex|hept|oct|non|dec)ano$"
)
SUB_RE = re.compile(r"(\d+(?:,\d+)*)-(di|tri|tetra)?(met|et|prop|but|pent)il")


def parse_alkane(name: str) -> tuple[int, list[tuple[int, int]]] | None:
    """'3-etil-2-metilhexano' -> (6, [(3, 2), (2, 1)]). None si no es alcano."""
    n = name.strip().lower()
    m = NAME_RE.match(n)
    if not m:
        return None
    subs: list[tuple[int, int]] = []
    for loc, mult, alk in SUB_RE.findall(m.group("subs")):
        locs = [int(x) for x in loc.split(",")]
        if len(locs) != MULT[mult]:
            return None
        subs += [(x, ALKYL[alk]) for x in locs]
    return PARENTS[m.group("parent")], subs


def alkane_names_in(text: str) -> list[str]:
    words = re.findall(r"[0-9a-záéíóú,\-]+", text.lower())
    return [w for w in words if parse_alkane(w)]


def formula_from_condensed(token: str) -> str | None:
    t = token.translate(SUB).strip("()")
    t = re.sub(r"[\-=≡]", "", t)
    counts: dict[str, int] = {}
    for el, num in re.findall(r"([A-Z][a-z]?)(\d*)", t):
        counts[el] = counts.get(el, 0) + (int(num) if num else 1)
    if "C" not in counts:
        return None
    return hill(counts)


def condensed_formulas_in(text: str) -> list[str]:
    toks = re.findall(r"(?:[CHON][₀-₉0-9]*[\-=≡]?)+", text)
    out = []
    for tok in toks:
        if len(tok) >= 2 and "C" in tok and "H" in tok:
            f = formula_from_condensed(tok)
            if f:
                out.append(f)
    return out


def hill(counts: dict[str, int]) -> str:
    parts = []
    for el in ["C", "H"] + sorted(k for k in counts if k not in ("C", "H")):
        if counts.get(el):
            parts.append(el + (str(counts[el]) if counts[el] > 1 else ""))
    return "".join(parts)


def alkane_formula(parsed: tuple[int, list[tuple[int, int]]]) -> str:
    c = parsed[0] + sum(l for _, l in parsed[1])
    return hill({"C": c, "H": 2 * c + 2})


# -------------------------------------------------- cadena principal
def carbon_graph(mol: Chem.Mol) -> dict[int, list[int]] | None:
    if any(a.GetSymbol() != "C" for a in mol.GetAtoms()) or mol.GetRingInfo().NumRings() > 0:
        return None
    if any(b.GetBondType() != Chem.BondType.SINGLE for b in mol.GetBonds()):
        return None
    return {a.GetIdx(): [n.GetIdx() for n in a.GetNeighbors()] for a in mol.GetAtoms()}


def all_paths(g: dict[int, list[int]], length: int) -> list[list[int]]:
    paths: list[list[int]] = []

    def walk(path: list[int]):
        if len(path) == length:
            paths.append(path[:])
            return
        for n in g[path[-1]]:
            if n not in path:
                path.append(n)
                walk(path)
                path.pop()

    for start in g:
        walk([start])
    return paths


def branch_length(g: dict[int, list[int]], root: int, parent: int) -> int | None:
    """Longitud de una rama lineal; None si la rama está ramificada."""
    length, prev, cur = 1, parent, root
    while True:
        nxt = [n for n in g[cur] if n != prev]
        if not nxt:
            return length
        if len(nxt) > 1:
            return None
        prev, cur = cur, nxt[0]
        length += 1


def longest_chain(g: dict[int, list[int]]) -> int:
    best = 1
    for start in g:
        stack = [(start, -1, 1)]
        while stack:
            node, parent, d = stack.pop()
            best = max(best, d)
            for n in g[node]:
                if n != parent:
                    stack.append((n, node, d + 1))
    return best


def main_chain(mol: Chem.Mol, name: str) -> tuple[list[int] | None, str]:
    """Cadena principal numerada desde el nombre, o (None, motivo)."""
    parsed = parse_alkane(name)
    if not parsed:
        return None, "el nombre no es un alcano que el script sepa leer"
    n, subs = parsed
    g = carbon_graph(mol)
    if g is None:
        return None, "la estructura no es un alcano acíclico"
    if n < 2:
        return None, "cadena de un solo carbono"
    if longest_chain(g) != n:
        return None, f"la cadena más larga tiene {longest_chain(g)} carbonos y el nombre indica {n}"
    want = sorted(subs)
    valid = []
    for path in all_paths(g, n):
        got = []
        ok = True
        for i, atom in enumerate(path):
            for nb in g[atom]:
                if nb in path:
                    continue
                bl = branch_length(g, nb, atom)
                if bl is None:
                    ok = False
                got.append((i + 1, bl))
        if ok and sorted(got) == want:
            valid.append(path)
    if not valid:
        return None, "ninguna numeración de la cadena reproduce los localizadores del nombre"
    ranks = list(Chem.CanonicalRankAtoms(mol, breakTies=False))
    signatures = {tuple(ranks[a] for a in p) for p in valid}
    if len(signatures) > 1:
        return None, "varias cadenas o numeraciones no equivalentes cumplen el nombre"
    return min(valid), "ok"


# ------------------------------------------------------------- dibujo
def draw(mol: Chem.Mol, bond_length: int, chain: list[int] | None = None) -> str:
    m = Chem.Mol(mol)
    d = rdMolDraw2D.MolDraw2DSVG(-1, -1)
    o = d.drawOptions()
    o.fixedBondLength = bond_length
    o.bondLineWidth = LINE_WIDTH
    o.clearBackground = False
    o.useBWAtomPalette()
    o.padding = 0.12
    o.annotationFontScale = 1.25
    hl_atoms: list[int] = []
    hl_bonds: list[int] = []
    # Átomos con número de mapa en el SMILES ([C:1]): se resaltan (y el enlace
    # entre dos mapeados) con el mismo centinela, y el mapa se borra para que
    # no aparezca como rótulo.
    mapped = [a.GetIdx() for a in m.GetAtoms() if a.GetAtomMapNum()]
    for a in m.GetAtoms():
        a.SetAtomMapNum(0)
    if chain:
        for i, a in enumerate(chain):
            m.GetAtomWithIdx(a).SetProp("atomNote", str(i + 1))
        hl_atoms = list(chain)
        hl_bonds = [m.GetBondBetweenAtoms(a, b).GetIdx() for a, b in zip(chain, chain[1:])]
    elif mapped:
        hl_atoms = mapped
        hl_bonds = [b.GetIdx() for b in m.GetBonds()
                    if b.GetBeginAtomIdx() in mapped and b.GetEndAtomIdx() in mapped]
    if hl_atoms:
        o.highlightBondWidthMultiplier = 8
        o.highlightRadius = 0.25
        o.fillHighlights = True
    rdMolDraw2D.PrepareMolForDrawing(m)
    if hl_atoms:
        colors = {a: SENTINEL_RGB for a in hl_atoms}
        bcolors = {b: SENTINEL_RGB for b in hl_bonds}
        d.DrawMolecule(m, highlightAtoms=hl_atoms, highlightBonds=hl_bonds,
                       highlightAtomColors=colors, highlightBondColors=bcolors)
    else:
        d.DrawMolecule(m)
    d.FinishDrawing()
    return theme_svg(d.GetDrawingText())


def theme_svg(svg: str) -> str:
    svg = re.sub(r"<\?xml[^>]*\?>\s*", "", svg)
    svg = svg.replace("<!-- END OF HEADER -->\n", "")
    # Resaltado: relleno y trazo centinela -> variable del tema.
    svg = re.sub(r"fill:%s;" % SENTINEL_HEX, "", svg, flags=re.I)
    svg = re.sub(r"stroke:%s" % SENTINEL_HEX, "stroke:var(--mol-highlight, #D5E1F1)", svg, flags=re.I)
    svg = re.sub(r"fill='%s'" % SENTINEL_HEX, "fill='currentColor'", svg, flags=re.I)
    svg = re.sub(r"(<(?:path|ellipse)[^>]*?)style='([^']*)'([^>]*?)/>",
                 lambda mt: hl_fix(mt), svg)
    # Tinta: negro -> currentColor.
    svg = re.sub(r"#000000", "currentColor", svg, flags=re.I)
    svg = re.sub(r"\swidth='[^']*'\sheight='[^']*'", lambda mt: mt.group(0), svg, count=1)
    return svg


def hl_fix(mt: re.Match) -> str:
    head, style, tail = mt.group(1), mt.group(2), mt.group(3)
    if "var(--mol-highlight" in style:
        # Las formas del resaltado: relleno del tema, sin trazo extra.
        style = HIGHLIGHT_STYLE + ";" + re.sub(r"stroke:var\(--mol-highlight, #D5E1F1\)", "stroke:var(--mol-highlight, #D5E1F1)", style)
        return f"{head}style='{style}'{tail}/>"
    return mt.group(0)


# ----------------------------------------------------------------- 3D
def embed_3d(mol: Chem.Mol) -> str | None:
    mh = Chem.AddHs(mol)
    params = AllChem.ETKDGv3()
    params.randomSeed = EMBED_SEED
    if AllChem.EmbedMolecule(mh, params) != 0:
        return None
    if AllChem.MMFFHasAllMoleculeParams(mh):
        AllChem.MMFFOptimizeMolecule(mh, maxIters=2000)
    block = Chem.MolToMolBlock(mh)
    return block + "$$$$\n"


# --------------------------------------------------------------- main
def main() -> int:
    exercises, tr = load_packs()
    order: list[str] = []
    names: dict[str, set[str]] = {}
    formulas: dict[str, list[tuple[str, str]]] = {}
    for ex in exercises:
        if not ex.get("is_active", True):
            continue
        sm = smiles_of(ex)
        for s in sm:
            if s not in order:
                order.append(s)
        if not sm:
            continue
        main_s = ex.get("smiles") or ex["payload"].get("structure_smiles") or sm[0]
        label = correct_label(ex, tr) or ""
        prompt = tr.get(ex["prompt_key"], "")
        for text, where in ((label, "respuesta"), (prompt, "enunciado")):
            for nm in alkane_names_in(text):
                names.setdefault(main_s, set()).add(nm)
                formulas.setdefault(main_s, []).append((alkane_formula(parse_alkane(nm)), f"{ex['id']} ({where}: {nm})"))
            for f in condensed_formulas_in(text):
                formulas.setdefault(main_s, []).append((f, f"{ex['id']} ({where}: fórmula escrita)"))
        if ex["type"] == "draw_structure" and ex["payload"].get("name_key"):
            nm = tr.get(ex["payload"]["name_key"], "")
            if parse_alkane(nm):
                names.setdefault(ex["correct"]["smiles"], set()).add(nm.lower())

    if (OUT / "svg").exists():
        shutil.rmtree(OUT / "svg")
    if (OUT / "sdf").exists():
        shutil.rmtree(OUT / "sdf")
    (OUT / "svg").mkdir(parents=True)
    (OUT / "sdf").mkdir(parents=True)

    index: dict[str, dict] = {}
    report = {"formula": [], "highlight": [], "no_3d": [], "invalid": []}
    for s in order:
        mol = Chem.MolFromSmiles(s)
        if mol is None:
            report["invalid"].append(s)
            continue
        mid = "m_" + hashlib.sha1(s.encode()).hexdigest()[:10]
        formula = rdMolDescriptors.CalcMolFormula(mol)
        (OUT / "svg" / f"{mid}.svg").write_text(draw(mol, BOND_LENGTH), "utf8")
        (OUT / "svg" / f"{mid}_thumb.svg").write_text(draw(mol, THUMB_BOND_LENGTH), "utf8")

        hl_path = None
        hl_name = None
        for nm in sorted(names.get(s, set())):
            chain, why = main_chain(mol, nm)
            report["highlight"].append({"smiles": s, "name": nm, "ok": chain is not None, "reason": why})
            if chain and hl_path is None:
                (OUT / "svg" / f"{mid}_hl.svg").write_text(draw(mol, BOND_LENGTH, chain), "utf8")
                hl_path = f"mol/svg/{mid}_hl.svg"
                hl_name = nm

        sdf = embed_3d(mol)
        sdf_path = None
        if sdf:
            (OUT / "sdf" / f"{mid}.sdf").write_text(sdf, "utf8")
            sdf_path = f"mol/sdf/{mid}.sdf"
        else:
            report["no_3d"].append(s)

        expected = formulas.get(s, [])
        for f, src in expected:
            report["formula"].append({"smiles": s, "rdkit": formula, "expected": f, "source": src, "ok": f == formula})

        index[s] = {
            "id": mid,
            "formula": formula,
            "heavy_atoms": mol.GetNumHeavyAtoms(),
            "svg": f"mol/svg/{mid}.svg",
            "svg_thumb": f"mol/svg/{mid}_thumb.svg",
            "svg_highlight": hl_path,
            "highlight_note": hl_name,
            "sdf": sdf_path,
        }

    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", "utf8")
    (ROOT / "reports").mkdir(exist_ok=True)
    (ROOT / "reports/mol_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", "utf8")
    bad = [r for r in report["formula"] if not r["ok"]]
    print(f"{len(index)} SMILES; {len(report['no_3d'])} sin 3D; {len(bad)} discrepancias de fórmula; "
          f"{sum(1 for h in report['highlight'] if h['ok'])} resaltados")
    return 1 if report["invalid"] else 0


if __name__ == "__main__":
    sys.exit(main())
