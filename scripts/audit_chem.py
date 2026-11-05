#!/usr/bin/env python3
"""Auditoría química automática de los ejercicios con SMILES.

Para cada ejercicio del seed (exercises.json + diagnostic.json) y del paquete
web (public/content/packs/web/exercises.json) que traiga algún SMILES:

  1. Calcula con RDKit la fórmula molecular, el número de carbonos, la cadena
     de carbonos más larga, la hibridación de los carbonos y los grupos
     funcionales presentes (SMARTS).
  2. Extrae lo que afirma el ejercicio: nombre correcto (opción correcta,
     plantilla de fill_blanks o name_key), familia afirmada (opción correcta de
     identify_group y menciones en la explicación), carbonos afirmados
     ("cadena de 5 carbonos", "C₆H₁₄", "CH₃-CH₂-CH₃"), tipo de carbono,
     hibridación/geometría y enlaces sigma/pi.
  3. Compara cada afirmación con lo calculado. Para los nombres de alcano
     sencillos (metano…decano con metil/etil/propil/butil) además construye la
     estructura a partir del nombre y la compara con el SMILES del ejercicio.
     Para el paquete web comprueba que el SMILES, el nombre y las opciones
     coinciden con el ejercicio de origen (payload.source_exercise_id).
  4. Imprime un resumen y escribe reports/audit_quimica.json.

No modifica nada en seed/ ni en public/content/. Solo lee.

Uso: python3 -I scripts/audit_chem.py
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

from rdkit import Chem, RDLogger
from rdkit.Chem import rdMolDescriptors

RDLogger.DisableLog("rdApp.*")

ROOT = Path(__file__).resolve().parent.parent
SEED = ROOT / "seed"
WEB = ROOT / "public/content/packs/web"
OUT = ROOT / "reports/audit_quimica.json"

SUB = str.maketrans("₀₁₂₃₄₅₆₇₈₉", "0123456789")


# ------------------------------------------------------------------ carga
def load_json(p: Path):
    return json.loads(p.read_text("utf8"))


def load_all() -> tuple[list[tuple[str, dict]], dict[str, str]]:
    """[(pack, ejercicio)], traducciones es (seed + web)."""
    tr: dict[str, str] = {}
    for p in (SEED / "translations_es.json", WEB / "translations_es.json"):
        for t in load_json(p):
            if t.get("locale", "es") == "es":
                tr[t["key"]] = t["value"]
    items: list[tuple[str, dict]] = []
    items += [("seed", e) for e in load_json(SEED / "exercises.json")]
    items += [("seed", e) for e in load_json(SEED / "diagnostic.json")["items"]]
    items += [("web", e) for e in load_json(WEB / "exercises.json")]
    return items, tr


def smiles_of(ex: dict) -> list[str]:
    p = ex.get("payload", {})
    out = [ex.get("smiles"), p.get("structure_smiles"), ex.get("correct", {}).get("smiles")]
    out += [o.get("smiles") for o in p.get("options", [])]
    seen: list[str] = []
    for s in out:
        if isinstance(s, str) and s and s not in seen:
            seen.append(s)
    return seen


def main_smiles(ex: dict) -> str | None:
    p = ex.get("payload", {})
    for s in (ex.get("smiles"), p.get("structure_smiles"), ex.get("correct", {}).get("smiles")):
        if isinstance(s, str) and s:
            return s
    return None


def correct_option(ex: dict) -> dict | None:
    value = ex.get("correct", {}).get("value")
    if value is None:
        return None
    for o in ex.get("payload", {}).get("options", []):
        if o.get("value") == value:
            return o
    return None


def correct_name(ex: dict, tr: dict[str, str]) -> str | None:
    """Texto de la respuesta correcta (nombre), según el tipo de ejercicio."""
    p = ex.get("payload", {})
    if ex["type"] == "fill_blanks" and p.get("template"):
        name = p["template"]
        for b in p.get("blanks", []):
            v = ex["correct"].get(b, "")
            txt = next((tr.get(o["key"], v) for o in p.get("bank", []) if o.get("value") == v), v)
            name = name.replace("{" + b + "}", txt)
        return name
    if p.get("name_key"):
        return tr.get(p["name_key"])
    o = correct_option(ex)
    return tr.get(o["key"]) if o else None


# ------------------------------------------------------------------ RDKit
# Patrones SMARTS. El orden importa solo para la lectura; se evalúan todos.
SMARTS = {
    "acido_carboxilico": "[CX3](=O)[OX2H1]",
    "ester": "[CX3](=O)[OX2H0][#6]",
    "amida": "[NX3][CX3](=[OX1])[#6,#1]",
    "aldehido": "[CX3H1](=O)[#6,#1]",
    "cetona": "[#6][CX3](=O)[#6]",
    "alcohol": "[CX4][OX2H]",
    "eter": "[#6;!$(C=O)][OX2H0][#6;!$(C=O)]",
    "amina": "[NX3;H2,H1,H0;!$(NC=O);!$(N=*);!$(N#*)][#6]",
    "nitrilo": "[CX2]#[NX1]",
    "alqueno": "[CX3]=[CX3]",
    "alquino": "[CX2]#[CX2]",
    "haluro_alquilo": "[CX4][F,Cl,Br,I]",
    "haluro_acilo": "[CX3](=O)[F,Cl,Br,I]",
    "aromatico": "a",
}
PATTS = {k: Chem.MolFromSmarts(v) for k, v in SMARTS.items()}
# Un ácido carboxílico también casa con el patrón de alcohol/éster? No: el
# patrón de alcohol exige C sp3; el de éster exige O sin H. Pero la amida casa
# "cetona"/"aldehído"? No, exigen carbonos a ambos lados. Se dejan así.

ESTER_PATT = Chem.MolFromSmarts("[CX3](=O)[OX2H0][#6]")


def detect_groups(mol: Chem.Mol) -> list[str]:
    found = [k for k, p in PATTS.items() if mol.HasSubstructMatch(p)]
    # Metanol (CO): el O está unido a un solo carbono, patrón de alcohol ok.
    # Metilamina (CN): N con 2 H, patrón de amina ok.
    if not found:
        # Alcano: solo C y H, enlaces simples, sin anillos aromáticos.
        if all(a.GetSymbol() in ("C", "H") for a in mol.GetAtoms()) and all(
            b.GetBondType() == Chem.BondType.SINGLE for b in mol.GetBonds()
        ):
            found = ["alcano"]
    return found


def carbon_graph(mol: Chem.Mol) -> dict[int, list[int]]:
    g: dict[int, list[int]] = {}
    for a in mol.GetAtoms():
        if a.GetSymbol() == "C":
            g[a.GetIdx()] = [n.GetIdx() for n in a.GetNeighbors() if n.GetSymbol() == "C"]
    return g


def longest_carbon_chain(mol: Chem.Mol) -> int:
    g = carbon_graph(mol)
    best = 0
    for start in g:
        stack = [(start, [start])]
        while stack:
            node, path = stack.pop()
            best = max(best, len(path))
            for n in g[node]:
                if n not in path:
                    stack.append((n, path + [n]))
    return best


def carbon_types(mol: Chem.Mol) -> dict[int, int]:
    """{número de vecinos carbono: cuántos carbonos lo tienen}."""
    out: dict[int, int] = {}
    for idx, nbrs in carbon_graph(mol).items():
        out[len(nbrs)] = out.get(len(nbrs), 0) + 1
    return out


HYB_NAME = {
    Chem.HybridizationType.SP3: "sp3",
    Chem.HybridizationType.SP2: "sp2",
    Chem.HybridizationType.SP: "sp",
}


def carbon_hybridizations(mol: Chem.Mol) -> set[str]:
    return {HYB_NAME.get(a.GetHybridization(), str(a.GetHybridization())) for a in mol.GetAtoms() if a.GetSymbol() == "C"}


def sigma_pi_per_carbon(mol: Chem.Mol) -> set[tuple[int, int]]:
    """Conjunto de (sigma, pi) por carbono, contando H implícitos."""
    out = set()
    for a in mol.GetAtoms():
        if a.GetSymbol() != "C":
            continue
        sigma = a.GetTotalNumHs()
        pi = 0
        for b in a.GetBonds():
            sigma += 1
            pi += {Chem.BondType.SINGLE: 0, Chem.BondType.DOUBLE: 1, Chem.BondType.TRIPLE: 2}.get(b.GetBondType(), 0)
        out.add((sigma, pi))
    return out


def hill(counts: dict[str, int]) -> str:
    parts = []
    for el in ["C", "H"] + sorted(k for k in counts if k not in ("C", "H")):
        if counts.get(el):
            parts.append(el + (str(counts[el]) if counts[el] > 1 else ""))
    return "".join(parts)


def canon(smiles: str) -> str | None:
    m = Chem.MolFromSmiles(smiles)
    return Chem.MolToSmiles(m) if m else None


# ------------------------------------------------------- nombres de alcano
PARENTS = {"met": 1, "et": 2, "prop": 3, "but": 4, "pent": 5, "hex": 6, "hept": 7, "oct": 8, "non": 9, "dec": 10}
ALKYL = {"met": 1, "et": 2, "prop": 3, "but": 4}
MULT = {"": 1, "di": 2, "tri": 3, "tetra": 4}
NAME_RE = re.compile(
    r"^(?P<subs>(?:\d+(?:,\d+)*-(?:di|tri|tetra)?(?:met|et|prop|but)il-?)*)"
    r"(?P<parent>met|et|prop|but|pent|hex|hept|oct|non|dec)ano$"
)
SUB_RE = re.compile(r"(\d+(?:,\d+)*)-(di|tri|tetra)?(met|et|prop|but)il")


def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def parse_alkane(name: str) -> tuple[int, list[tuple[int, int]]] | None:
    """'3-etil-2-metilhexano' -> (6, [(3, 2), (2, 1)]); None si no es alcano legible."""
    n = strip_accents(name.strip().lower())
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


def alkane_formula(parsed: tuple[int, list[tuple[int, int]]]) -> str:
    c = parsed[0] + sum(l for _, l in parsed[1])
    return hill({"C": c, "H": 2 * c + 2})


def alkane_smiles(parsed: tuple[int, list[tuple[int, int]]]) -> str | None:
    """Construye el SMILES canónico a partir del nombre. None si los localizadores no caben."""
    n, subs = parsed
    chain = [[] for _ in range(n)]
    for loc, length in subs:
        if loc < 1 or loc > n:
            return None
        chain[loc - 1].append("(" + "C" * length + ")")
    smi = "".join("C" + "".join(br) for br in chain)
    return canon(smi)


def alkane_name_issues(parsed: tuple[int, list[tuple[int, int]]], mol: Chem.Mol) -> list[str]:
    """Problemas del nombre frente a la estructura: cadena más larga y localizadores mínimos."""
    n, subs = parsed
    issues = []
    if longest_carbon_chain(mol) != n:
        issues.append(f"la cadena más larga tiene {longest_carbon_chain(mol)} C y el nombre indica {n}")
    locs = sorted(l for l, _ in subs)
    rev = sorted(n + 1 - l for l, _ in subs)
    if rev < locs:
        issues.append(f"los localizadores {locs} no son los menores posibles ({rev})")
    return issues


def alkane_names_in(text: str) -> list[str]:
    words = re.findall(r"[0-9a-záéíóú,\-]+", text.lower())
    return [w for w in words if parse_alkane(w)]


# ------------------------------------------------------ fórmulas en texto
GROUP_FRAGMENTS = {"COOH", "CHO", "OH", "NH2", "CH3", "CH2", "CH2CH3", "CH", "COC", "CN", "CO"}


def formula_from_condensed(token: str) -> str | None:
    t = token.translate(SUB).strip("()")
    t = re.sub(r"[\-=≡]", "", t)
    counts: dict[str, int] = {}
    for el, num in re.findall(r"([A-Z][a-z]?)(\d*)", t):
        counts[el] = counts.get(el, 0) + (int(num) if num else 1)
    if "C" not in counts or "H" not in counts:
        return None
    return hill(counts)


def condensed_formulas_in(text: str) -> list[tuple[str, str]]:
    """[(token, fórmula Hill)] de fórmulas moleculares/condensadas escritas en el texto.

    Se omiten los fragmentos de grupo (precedidos por '-' o de la lista
    GROUP_FRAGMENTS, como -COOH o -CH3), que no describen la molécula entera.
    """
    out = []
    for m in re.finditer(r"(?<![A-Za-z])(?:[CHNO][₀-₉0-9]*[\-=≡]?)+", text):
        tok = m.group(0).rstrip("-=≡")
        if len(tok) < 2 or "C" not in tok or "H" not in tok:
            continue
        if m.start() > 0 and text[m.start() - 1] == "-":
            continue
        plain = tok.translate(SUB).replace("-", "").replace("=", "").replace("≡", "")
        if plain in GROUP_FRAGMENTS:
            continue
        f = formula_from_condensed(tok)
        if f:
            out.append((tok, f))
    return out


NUM_WORDS = {"un": 1, "uno": 1, "una": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10}


def num(s: str) -> int:
    s = s.lower()
    return int(s) if s.isdigit() else NUM_WORDS[s]


NUM = r"(\d+|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)"
CHAIN_RE = re.compile(r"cadena(?: principal)? de " + NUM + r" carbonos?", re.I)
LINEAR_RE = re.compile(r"\b" + NUM + r" carbonos? (?:en cadena|lineales)", re.I)
# Solo plural: "tiene un carbono sp²" habla de un átomo, no cuenta la molécula.
TOTAL_RE = re.compile(r"(?:tiene|de)\s+" + NUM + r" carbonos\b", re.I)
SOLO_RE = re.compile(r"de un solo carbono", re.I)
COLON_RE = re.compile(r"(?:^|\.\s*)" + NUM + r" carbonos?:", re.I)
BONDED_RE = re.compile(r"unid[oa]s? a " + NUM + r" carbonos", re.I)
HYB_RE = re.compile(r"\bsp(³|²|3|2)?\b")
SIGMA_RE = re.compile(r"(\d+|ningún|ninguno) enlaces? sigma", re.I)
PI_RE = re.compile(r"(\d+|ningún|ninguno) enlaces? pi\b", re.I)

FAMILY_WORDS = {
    "alcohol": "alcohol",
    "eter": "eter",
    "aldehido": "aldehido",
    "cetona": "cetona",
    "acido carboxilico": "acido_carboxilico",
    "ester": "ester",
    "amina": "amina",
    "amida": "amida",
    "alqueno": "alqueno",
    "alquino": "alquino",
    "alcano": "alcano",
    "haluro de alquilo": "haluro_alquilo",
    "nitrilo": "nitrilo",
}
FAMILY_LABEL = {
    "alcohol": "alcohol", "eter": "éter", "aldehido": "aldehído", "cetona": "cetona",
    "acido_carboxilico": "ácido carboxílico", "ester": "éster", "amina": "amina", "amida": "amida",
    "alqueno": "alqueno", "alquino": "alquino", "alcano": "alcano", "haluro_alquilo": "haluro de alquilo",
    "nitrilo": "nitrilo", "aromatico": "aromático", "haluro_acilo": "haluro de acilo",
}
# Frases que implican un grupo aunque no se nombre la familia.
FAMILY_HINTS = [
    (r"grupo -?cooh|-cooh\b", "acido_carboxilico"),
    (r"grupo -?oh\b|tiene -oh", "alcohol"),
    (r"grupo -?nh2|-nh2\b", "amina"),
    (r"doble enlace", "alqueno"),
    (r"triple enlace", "alquino"),
    (r"solo tiene enlaces simples", "alcano"),
    (r"\bhidrocarburo\b", "hidrocarburo"),
]
GEOMETRY_BY_HYB = {"tetraedrica": "sp3", "trigonal_plana": "sp2", "lineal": "sp"}
CARBON_TYPE = {"primario": 1, "secundario": 2, "terciario": 3, "cuaternario": 4}


def families_in(text: str) -> list[str]:
    t = strip_accents(text.lower())
    found: list[str] = []
    for word, fam in FAMILY_WORDS.items():
        # "ácido" solo, en contexto de ácido acético/ácido carboxílico, también cuenta.
        if re.search(r"\b" + re.escape(word) + r"s?\b", t):
            found.append(fam)
    if "acido_carboxilico" not in found and re.search(r"\bacido\b", t):
        found.append("acido_carboxilico")
    for patt, fam in FAMILY_HINTS:
        if re.search(patt, t) and fam not in found:
            found.append(fam)
    return found


def family_of_option(text: str) -> str | None:
    t = strip_accents(text.lower()).strip()
    return FAMILY_WORDS.get(t) or ("acido_carboxilico" if t.startswith("acido") else None)


# ------------------------------------------------------------- auditoría
class Audit:
    def __init__(self, pack: str, ex: dict, tr: dict[str, str], seed_by_id: dict[str, dict]):
        self.pack, self.ex, self.tr, self.seed_by_id = pack, ex, tr, seed_by_id
        self.checks: list[dict] = []  # {"tipo", "afirma", "rdkit", "ok", "fuente"}
        self.claims: dict = {}

    def add(self, tipo: str, afirma, rdkit, ok: bool, fuente: str):
        self.checks.append({"tipo": tipo, "afirma": afirma, "rdkit": rdkit, "ok": bool(ok), "fuente": fuente})

    def text(self, key: str | None) -> str:
        return self.tr.get(key, "") if key else ""

    def run(self) -> dict:
        ex, tr = self.ex, self.tr
        smi = main_smiles(ex)
        mol = Chem.MolFromSmiles(smi) if smi else None
        entry = {
            "id": ex["id"], "pack": self.pack, "type": ex["type"], "smiles": smi,
            "smiles_todos": smiles_of(ex),
            "formula": None, "n_carbonos": None, "cadena_mas_larga": None,
            "grupos_detectados": [], "hibridacion_carbonos": [],
            "afirmado": {}, "resultado": "sin referencia", "detalle": [],
        }
        if mol is None:
            entry["resultado"] = "discrepancia"
            entry["detalle"] = [f"SMILES inválido para RDKit: {smi!r}"]
            return entry

        formula = rdMolDescriptors.CalcMolFormula(mol)
        n_c = sum(1 for a in mol.GetAtoms() if a.GetSymbol() == "C")
        groups = detect_groups(mol)
        hybs = carbon_hybridizations(mol)
        chain = longest_carbon_chain(mol)
        entry.update(formula=formula, n_carbonos=n_c, cadena_mas_larga=chain,
                     grupos_detectados=groups, hibridacion_carbonos=sorted(hybs))

        prompt = self.text(ex.get("prompt_key"))
        explain = self.text(ex.get("explanation_key"))
        name = correct_name(ex, tr)
        opt = correct_option(ex)
        opt_text = tr.get(opt["key"]) if opt else None
        self.claims["nombre_correcto"] = name
        self.claims["enunciado"] = prompt
        self.claims["explicacion"] = explain or None

        # --- (a) nombre de alcano: fórmula y estructura ---------------------
        name_sources: list[tuple[str, str]] = []
        if name:
            for nm in alkane_names_in(name):
                name_sources.append((nm, "respuesta correcta"))
            # "Metano (CH₄)": la palabra sola también.
        for nm in alkane_names_in(prompt):
            if (nm, "respuesta correcta") not in name_sources:
                name_sources.append((nm, "enunciado"))
        # En la explicación solo se toma el nombre completo si coincide con la respuesta
        # (los demás nombres suelen ser distractores comentados o la cadena principal).
        seen_names: set[str] = set()
        for nm, src in name_sources:
            if nm in seen_names:
                continue
            seen_names.add(nm)
            parsed = parse_alkane(nm)
            f = alkane_formula(parsed)
            self.add("formula_nombre", f"{nm} → {f}", formula, f == formula, src)
            built = alkane_smiles(parsed)
            same = built is not None and built == canon(smi)
            self.add("estructura_nombre", f"{nm} → {built}", canon(smi), same, src)
            for issue in alkane_name_issues(parsed, mol):
                self.add("nombre_iupac", nm, issue, False, src)
        self.claims["nombres_alcano"] = [nm for nm, _ in name_sources]

        # --- (b) carbonos y fórmulas afirmadas -----------------------------
        carb_claims = []
        for src, txt in (("enunciado", prompt), ("respuesta correcta", opt_text or ""), ("explicación", explain)):
            if not txt:
                continue
            for tok, f in condensed_formulas_in(txt):
                carb_claims.append(("formula_texto", tok, f, src))
                self.add("formula_texto", f"{tok} → {f}", formula, f == formula, src)
            chain_spans = []
            for m in CHAIN_RE.finditer(txt):
                n = num(m.group(1))
                chain_spans.append(m.span())
                carb_claims.append(("cadena", m.group(0), n, src))
                self.add("cadena_carbonos", m.group(0), f"cadena más larga = {chain}", n == chain, src)
            for m in LINEAR_RE.finditer(txt):
                n = num(m.group(1))
                carb_claims.append(("carbonos", m.group(0), n, src))
                self.add("n_carbonos", m.group(0), f"C = {n_c}, cadena = {chain}", n == n_c == chain, src)
            for m in COLON_RE.finditer(txt):
                n = num(m.group(1))
                carb_claims.append(("carbonos", m.group(0).strip(), n, src))
                self.add("n_carbonos", m.group(0).strip(), f"C = {n_c}", n == n_c, src)
            for m in TOTAL_RE.finditer(txt):
                # "Cadena principal de 4 carbonos" ya se comparó con la cadena más larga.
                if any(a <= m.start() < b for a, b in chain_spans):
                    continue
                n = num(m.group(1))
                carb_claims.append(("carbonos", m.group(0), n, src))
                self.add("n_carbonos", m.group(0), f"C = {n_c}", n == n_c, src)
            if SOLO_RE.search(txt):
                carb_claims.append(("carbonos", "un solo carbono", 1, src))
                self.add("n_carbonos", "un solo carbono", f"C = {n_c}", n_c == 1, src)
            for m in BONDED_RE.finditer(txt):
                n = num(m.group(1))
                types = carbon_types(mol)
                carb_claims.append(("carbono_unido_a", m.group(0), n, src))
                self.add("carbono_unido_a", m.group(0), f"carbonos con N vecinos C: {types}", n in types, src)
        # "¿cuántos carbonos?" con respuesta numérica.
        if re.search(r"cu[aá]ntos carbonos", prompt, re.I) and opt_text and opt_text.strip().isdigit():
            n = int(opt_text.strip())
            carb_claims.append(("carbonos", f"respuesta {n}", n, "respuesta correcta"))
            self.add("n_carbonos", f"respuesta correcta = {n}", f"C = {n_c}", n == n_c, "respuesta correcta")
        self.claims["carbonos_afirmados"] = [{"tipo": t, "texto": s, "valor": v, "fuente": src} for t, s, v, src in carb_claims]

        # --- (c) familia / grupo funcional ---------------------------------
        fam_claims: list[tuple[str, str]] = []
        if opt_text:
            fam = family_of_option(opt_text)
            if fam:
                fam_claims.append((fam, "respuesta correcta"))
        for fam in families_in(prompt):
            fam_claims.append((fam, "enunciado"))
        if explain:
            for fam in families_in(explain):
                fam_claims.append((fam, "explicación"))
        done: set[str] = set()
        for fam, src in fam_claims:
            if fam in done:
                continue
            done.add(fam)
            if fam == "hidrocarburo":
                ok = all(a.GetSymbol() in ("C", "H") for a in mol.GetAtoms())
                self.add("familia", "hidrocarburo", "solo C e H" if ok else "hay heteroátomos", ok, src)
                continue
            self.add("familia", FAMILY_LABEL.get(fam, fam), ", ".join(FAMILY_LABEL.get(g, g) for g in groups) or "ninguno", fam in groups, src)
        # Una familia afirmada como respuesta debería ser la única "principal" detectada
        # (que no haya un grupo de mayor prioridad que el afirmado).
        if opt_text and family_of_option(opt_text) and family_of_option(opt_text) in groups:
            extra = [g for g in groups if g != family_of_option(opt_text) and g not in ("alqueno", "alquino")]
            if extra:
                self.add("familia_unica", FAMILY_LABEL[family_of_option(opt_text)],
                         "otros grupos presentes: " + ", ".join(FAMILY_LABEL.get(g, g) for g in extra), False, "respuesta correcta")
        self.claims["familias_afirmadas"] = [{"familia": FAMILY_LABEL.get(f, f), "fuente": s} for f, s in fam_claims]

        # --- tipo de carbono (primario…cuaternario) -------------------------
        if opt_text and strip_accents(opt_text.lower().strip()) in CARBON_TYPE:
            n = CARBON_TYPE[strip_accents(opt_text.lower().strip())]
            types = carbon_types(mol)
            central = "central" in prompt.lower()
            ok = n in types
            self.add("tipo_carbono", opt_text, f"carbonos por nº de vecinos C: {types}", ok,
                     "respuesta correcta" + (" (carbono central)" if central else ""))
            self.claims["tipo_carbono"] = opt_text

        # --- hibridación, geometría, sigma/pi (solo del enunciado) ----------
        hyb_claims = {{"³": "sp3", "3": "sp3", "²": "sp2", "2": "sp2", None: "sp", "": "sp"}[m.group(1)] for m in HYB_RE.finditer(prompt)}
        for h in sorted(hyb_claims):
            self.add("hibridacion", h, ", ".join(sorted(hybs)), h in hybs, "enunciado")
        if opt_text and ex.get("correct", {}).get("value") in GEOMETRY_BY_HYB:
            want = GEOMETRY_BY_HYB[ex["correct"]["value"]]
            self.add("geometria", opt_text, f"hibridación de los C: {', '.join(sorted(hybs))}", hybs == {want}, "respuesta correcta")
        if hyb_claims:
            self.claims["hibridacion"] = sorted(hyb_claims)
        sm = SIGMA_RE.search(prompt)
        pm = PI_RE.search(prompt)
        if sm or pm:
            s = int(sm.group(1)) if sm and sm.group(1).isdigit() else (0 if sm else None)
            p = int(pm.group(1)) if pm and pm.group(1).isdigit() else (0 if pm else None)
            per_c = sigma_pi_per_carbon(mol)
            truth = ex.get("correct", {}).get("value")
            holds = any((s is None or sg == s) and (p is None or pi == p) for sg, pi in per_c)
            ok = holds if truth in (None, "true") else not holds
            self.add("sigma_pi", f"{s} sigma / {p} pi (respuesta: {truth})", f"por carbono (sigma, pi) = {sorted(per_c)}", ok, "enunciado")
            self.claims["sigma_pi"] = {"sigma": s, "pi": p}

        # --- (d) paquete web: coherencia con el ejercicio de origen ---------
        src_id = ex.get("payload", {}).get("source_exercise_id")
        if self.pack == "web":
            self.claims["origen"] = src_id
            self.check_web(ex, src_id, smi, name)

        ok_all = all(c["ok"] for c in self.checks)
        entry["afirmado"] = {k: v for k, v in self.claims.items() if v not in (None, [], {}, "")}
        entry["comprobaciones"] = self.checks
        entry["resultado"] = "sin referencia" if not self.checks else ("coincide" if ok_all else "discrepancia")
        entry["detalle"] = [
            f"[{'OK' if c['ok'] else 'X'}] {c['tipo']} ({c['fuente']}): texto «{c['afirma']}» vs RDKit «{c['rdkit']}»"
            for c in self.checks
        ]
        return entry

    def check_web(self, ex: dict, src_id: str | None, smi: str | None, name: str | None):
        tr = self.tr
        src = self.seed_by_id.get(src_id or "")
        if src is None:
            self.add("web_origen", src_id, "no existe en el seed", False, "payload.source_exercise_id")
            return
        src_smi = src.get("payload", {}).get("structure_smiles") or src.get("smiles")
        self.add("web_smiles_origen", smi, src_smi, smi == src_smi, f"origen {src_id}")
        if ex["type"] == "draw_structure":
            self.add("web_draw_correct", ex["correct"].get("smiles"), src_smi, ex["correct"].get("smiles") == src_smi, f"origen {src_id}")
        src_name = correct_name(src, tr)
        if name is not None:
            self.add("web_nombre_origen", name, src_name, name == src_name, f"origen {src_id}")
        prompt = self.text(ex.get("prompt_key"))
        if name and ex["type"] in ("draw_structure", "choose_structure"):
            self.add("web_nombre_en_enunciado", prompt, name, name in prompt, "enunciado derivado")
        if ex.get("explanation_key") != src.get("explanation_key"):
            self.add("web_explicacion", ex.get("explanation_key"), src.get("explanation_key"), False, f"origen {src_id}")
        if ex["type"] == "choose_structure":
            opts = ex["payload"].get("options", [])
            smis = [o.get("smiles") for o in opts]
            self.add("web_opciones_distintas", smis, "SMILES canónicos distintos",
                     len({canon(s) for s in smis if s}) == len(smis), "opciones")
            corr = next((o for o in opts if o.get("value") == ex["correct"].get("value")), None)
            self.add("web_opcion_correcta", corr.get("smiles") if corr else None, src_smi, bool(corr) and corr.get("smiles") == src_smi, "opción correcta")
            # Cada opción (también los distractores) es un par nombre-estructura del seed
            # y su nombre, si es alcano legible, reproduce su estructura.
            for o in opts:
                oname = tr.get(o.get("key"), "")
                seed_pair = next((e for e in self.seed_by_id.values()
                                  if e.get("payload", {}).get("structure_smiles") == o.get("smiles")
                                  and correct_name(e, tr) == oname), None)
                self.add("web_distractor_par_seed", f"{oname} = {o.get('smiles')}",
                         seed_pair["id"] if seed_pair else "sin par en el seed", seed_pair is not None, "opciones")
                parsed = parse_alkane(oname)
                if parsed:
                    built = alkane_smiles(parsed)
                    self.add("web_distractor_nombre_estructura", f"{oname} → {built}", canon(o.get("smiles") or ""),
                             built == canon(o.get("smiles") or ""), "opciones")
        if ex["type"] == "view_3d":
            same_opts = [(o["key"], o["value"]) for o in ex["payload"].get("options", [])] == \
                        [(o["key"], o["value"]) for o in src.get("payload", {}).get("options", [])]
            self.add("web_v3d_opciones", "mismas opciones que el origen", "iguales" if same_opts else "distintas", same_opts, f"origen {src_id}")
            self.add("web_v3d_correct", ex.get("correct"), src.get("correct"), ex.get("correct") == src.get("correct"), f"origen {src_id}")
            self.add("web_v3d_prompt", ex.get("prompt_key"), src.get("prompt_key"), ex.get("prompt_key") == src.get("prompt_key"), f"origen {src_id}")


# ------------------------------------------------------------------ main
def main() -> int:
    items, tr = load_all()
    seed_by_id = {e["id"]: e for p, e in items if p == "seed"}
    entries: list[dict] = []
    for pack, ex in items:
        if not ex.get("is_active", True):
            continue
        if not smiles_of(ex):
            continue
        entries.append(Audit(pack, ex, tr, seed_by_id).run())

    OUT.parent.mkdir(exist_ok=True)
    summary = {
        "auditados": len(entries),
        "por_pack": {p: sum(1 for e in entries if e["pack"] == p) for p in ("seed", "web")},
        "coincide": sum(1 for e in entries if e["resultado"] == "coincide"),
        "discrepancia": sum(1 for e in entries if e["resultado"] == "discrepancia"),
        "sin_referencia": sum(1 for e in entries if e["resultado"] == "sin referencia"),
        "comprobaciones": sum(len(e.get("comprobaciones", [])) for e in entries),
    }
    OUT.write_text(json.dumps({"resumen": summary, "ejercicios": entries}, ensure_ascii=False, indent=2) + "\n", "utf8")

    print("Auditoría química (RDKit)")
    print(f"  Ejercicios con SMILES auditados: {summary['auditados']} "
          f"(seed {summary['por_pack']['seed']}, web {summary['por_pack']['web']})")
    print(f"  Comprobaciones realizadas: {summary['comprobaciones']}")
    print(f"  coincide: {summary['coincide']}   discrepancia: {summary['discrepancia']}   sin referencia: {summary['sin_referencia']}")
    print()
    print(f"{'id':40} {'pack':5} {'SMILES':15} {'fórmula':9} {'C':>2}  {'grupos':28} resultado")
    for e in entries:
        print(f"{e['id']:40} {e['pack']:5} {str(e['smiles']):15} {str(e['formula']):9} {str(e['n_carbonos']):>2}  "
              f"{', '.join(e['grupos_detectados'])[:28]:28} {e['resultado']}")
    bad = [e for e in entries if e["resultado"] == "discrepancia"]
    print()
    if bad:
        print("Discrepancias:")
        for e in bad:
            print(f"- {e['id']} ({e['pack']}, {e['smiles']})")
            for d in e["detalle"]:
                if d.startswith("[X]"):
                    print(f"    {d}")
    else:
        print("Sin discrepancias.")
    noref = [e["id"] for e in entries if e["resultado"] == "sin referencia"]
    if noref:
        print("Sin referencia (el texto no afirma nada comparable):", ", ".join(noref))
    print(f"\nInforme: {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
