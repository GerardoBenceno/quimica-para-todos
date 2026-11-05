import { Fragment, type ReactNode } from 'react'

const SUB: Record<string, string> = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' }
const SUP: Record<string, string> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' }

type Piece = { kind: 'text' | 'sub' | 'sup'; text: string }

/** Parte un texto en tramos normales, de subíndice y de superíndice. */
export function splitChem(text: string): Piece[] {
  const out: Piece[] = []
  for (const ch of text) {
    const kind = ch in SUB ? 'sub' : ch in SUP ? 'sup' : 'text'
    const val = kind === 'sub' ? SUB[ch] : kind === 'sup' ? SUP[ch] : ch
    const last = out[out.length - 1]
    if (last && last.kind === kind) last.text += val
    else out.push({ kind, text: val })
  }
  return out
}

/**
 * Muestra texto de contenido convirtiendo los dígitos Unicode de subíndice y
 * superíndice en <sub> y <sup>, porque la fuente web no trae esos caracteres.
 * El contenido del seed no se modifica.
 */
export function ChemText({ text }: { text: string | null | undefined }): ReactNode {
  if (!text) return null
  const pieces = splitChem(text)
  if (pieces.length === 1 && pieces[0].kind === 'text') return text
  return pieces.map((p, i) =>
    p.kind === 'sub' ? <sub key={i}>{p.text}</sub> : p.kind === 'sup' ? <sup key={i}>{p.text}</sup> : <Fragment key={i}>{p.text}</Fragment>,
  )
}
