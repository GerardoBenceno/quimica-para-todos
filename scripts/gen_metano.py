"""Genera arte/originales/asset_metano_tetraedrico.png con RDKit.

Diagrama de cuñas y líneas discontinuas del metano a partir de coordenadas 3D
(ETKDGv3 con semilla fija y optimización MMFF): C al centro, dos H en el plano
del papel, un H hacia el frente (cuña) y uno hacia atrás (líneas
discontinuas). Tinta #1E1E1E, fondo transparente, 512 px. El único texto es el
rótulo "109.5°" de un ángulo H-C-H, que ya está en la lección l_sp3.

Uso: python3 scripts/gen_metano.py  (requiere requirements.txt)
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from rdkit import Chem
from rdkit.Chem import AllChem
from rdkit.Chem.Draw import rdMolDraw2D
from rdkit.Geometry import Point2D

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "arte" / "originales" / "asset_metano_tetraedrico.png"
SIZE = 512
INK = (0x1E / 255, 0x1E / 255, 0x1E / 255)
SEED = 0x5EED
# Semiángulo entre la cuña y la línea discontinua (convención gráfica).
SPLAY_DEG = 27
# Fuente para "C", "H" y el rótulo del ángulo (incluye el signo de grado).
FONT = Path("/usr/share/fonts/opentype/inter/Inter-Medium.otf")


def conformer_3d() -> tuple[Chem.Mol, np.ndarray]:
    mol = Chem.AddHs(Chem.MolFromSmiles("C"))
    params = AllChem.ETKDGv3()
    params.randomSeed = SEED
    assert AllChem.EmbedMolecule(mol, params) == 0, "no se pudo generar el conformero"
    AllChem.MMFFOptimizeMolecule(mol)
    xyz = mol.GetConformer().GetPositions()
    return mol, xyz - xyz[0]  # C en el origen


def oriented_2d(xyz: np.ndarray) -> tuple[np.ndarray, int, int]:
    """Convención de libro: los dos H del plano del papel se proyectan tal cual
    (su ángulo H-C-H de 109.5° queda real sobre el papel) y los otros dos, que
    en una proyección exacta caerían en el mismo punto, se dibujan juntos del
    otro lado, separados de forma simétrica respecto a la bisectriz, uno con
    cuña (frente) y otro con línea discontinua (atrás). Devuelve la proyección,
    el índice del H del frente y el del H de atrás."""
    h = [1, 2, 3, 4]
    # Base ortonormal: e1 bisectriz de H1 y H2, e2 en el plano H1-C-H2, e3 normal al papel.
    u1, u2 = xyz[h[0]] / np.linalg.norm(xyz[h[0]]), xyz[h[1]] / np.linalg.norm(xyz[h[1]])
    e1 = (u1 + u2) / np.linalg.norm(u1 + u2)
    e2 = (u1 - u2) / np.linalg.norm(u1 - u2)
    e3 = np.cross(e1, e2)
    rot = np.vstack([e2, -e1, e3])  # x horizontal, y = -bisectriz (H1 y H2 abajo), z hacia el lector
    p = xyz @ rot.T
    front = max(h[2:], key=lambda i: p[i][2])
    back = min(h[2:], key=lambda i: p[i][2])
    # Cuña y línea discontinua: a ±SPLAY de la bisectriz (hacia arriba), algo
    # más cortas para sugerir profundidad. Es convención gráfica, no proyección.
    bond = float(np.linalg.norm(xyz[h[0]]))
    length = 0.88 * bond
    delta = np.radians(SPLAY_DEG)
    p[front, :2] = (length * np.sin(delta), length * np.cos(delta))
    p[back, :2] = (-length * np.sin(delta), length * np.cos(delta))
    return p[:, :2], front, back


def draw(mol: Chem.Mol, p2: np.ndarray, front: int, back: int) -> bytes:
    conf = Chem.Conformer(mol.GetNumAtoms())
    for i, (x, y) in enumerate(p2):
        conf.SetAtomPosition(i, (float(x), float(y), 0.0))
    conf.Set3D(False)
    mol.RemoveAllConformers()
    mol.AddConformer(conf, assignId=True)
    for bond in mol.GetBonds():
        other = bond.GetEndAtomIdx() if bond.GetBeginAtomIdx() == 0 else bond.GetBeginAtomIdx()
        if other == front:
            bond.SetBondDir(Chem.BondDir.BEGINWEDGE)
        elif other == back:
            bond.SetBondDir(Chem.BondDir.BEGINDASH)

    drawer = rdMolDraw2D.MolDraw2DCairo(SIZE, SIZE)
    opts = drawer.drawOptions()
    opts.useBWAtomPalette()
    opts.clearBackground = False
    opts.prepareMolsBeforeDrawing = False  # conserva las cuñas asignadas a mano
    opts.bondLineWidth = 3
    opts.fixedBondLength = 190
    opts.fontFile = str(FONT) if FONT.exists() else ""
    opts.padding = 0.16
    opts.baseFontSize = 1.0
    opts.additionalAtomLabelPadding = 0.06
    opts.setAtomPalette({-1: INK})
    opts.atomLabels[0] = "C"
    drawer.DrawMolecule(mol)

    # Arco y rótulo del ángulo H-C-H entre los dos H del plano del papel.
    c = drawer.GetDrawCoords(0)
    h1, h2 = drawer.GetDrawCoords(1), drawer.GetDrawCoords(2)
    v1 = np.array([h1.x - c.x, h1.y - c.y])
    v2 = np.array([h2.x - c.x, h2.y - c.y])
    r = 0.42 * min(np.linalg.norm(v1), np.linalg.norm(v2))
    a1, a2 = np.degrees(np.arctan2(v1[1], v1[0])), np.degrees(np.arctan2(v2[1], v2[0]))
    lo, hi = sorted([a1, a2])
    if hi - lo > 180:
        lo, hi = hi, lo + 360
    drawer.SetColour(INK)
    drawer.SetLineWidth(2)
    drawer.SetFillPolys(False)
    drawer.DrawArc(c, r, lo, hi, rawCoords=True)
    bis = (v1 / np.linalg.norm(v1) + v2 / np.linalg.norm(v2))
    bis = bis / np.linalg.norm(bis)
    label = Point2D(c.x + bis[0] * r * 1.55 + 22, c.y + bis[1] * r * 1.55)
    drawer.SetFontSize(30)
    # DrawString solo acepta ASCII: el signo de grado se dibuja como un círculo
    # pequeño a la derecha del número (el texto termina en `label`).
    drawer.DrawString("109.5", label, 2, True)
    drawer.SetLineWidth(2)
    drawer.DrawArc(Point2D(label.x + 7, label.y - 11), 3.2, 0, 360, rawCoords=True)
    drawer.FinishDrawing()
    return drawer.GetDrawingText()


def main() -> None:
    mol, xyz = conformer_3d()
    angles = []
    for i in range(1, 5):
        for j in range(i + 1, 5):
            cosang = np.dot(xyz[i], xyz[j]) / (np.linalg.norm(xyz[i]) * np.linalg.norm(xyz[j]))
            angles.append(np.degrees(np.arccos(cosang)))
    print("ángulos H-C-H (MMFF):", ", ".join(f"{a:.1f}°" for a in angles))
    p2, front, back = oriented_2d(xyz)
    png = draw(mol, p2, front, back)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(png)
    print(f"escrito {OUT.relative_to(ROOT)} ({len(png) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
