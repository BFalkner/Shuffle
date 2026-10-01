// Routines as people write and read them: move costs, names, short tokens, and the "M×4·P·M×4" notation.
import type { OpKey } from './moves.ts'

/** Time cost of each move, in units (a mash = 1). */
export const OP_COST: Record<OpKey, number> = { mash: 1, overhand: 2, pile: 4, ohr: 1, ohb: 1, cut: 0.5 }

export const OP_NAME: Record<OpKey, string> = {
  mash: 'Mash',
  overhand: 'Overhand',
  pile: 'Pile',
  ohr: 'Overhand top',
  ohb: 'Overhand bottom',
  cut: 'Cut',
}

/** Short token shown in sequence strips. */
export const OP_TOKEN: Record<OpKey, string> = { mash: 'M', overhand: 'OH', pile: 'P', ohr: 'OHt', ohb: 'OHb', cut: 'C' }

const TOKEN_OP: Record<string, OpKey> = { m: 'mash', oh: 'overhand', p: 'pile', oht: 'ohr', ohb: 'ohb', c: 'cut' }

/** Parse a routine written like compressSeq prints it: "M×4·P·M×4". Also accepts spaces or commas, and x or * for ×. */
export function parseRoutine(text: string): OpKey[] {
  return text
    .split(/[·\s,]+/)
    .filter(Boolean)
    .flatMap((token) => {
      const match = /^(oht|ohb|oh|m|p|c)(?:[×x*](\d+))?$/i.exec(token)
      if (!match) throw new Error(`Unknown move "${token}" in "${text}". Use M, OH, P, OHt, OHb or C, with ×n to repeat.`)
      return Array<OpKey>(Number(match[2] ?? 1)).fill(TOKEN_OP[match[1].toLowerCase()])
    })
}

/** "M×2·OHt·M×2·OHb" — a compact label for a sequence. */
export function compressSeq(seq: readonly OpKey[]): string {
  const out: string[] = []
  let start = 0
  while (start < seq.length) {
    let end = start
    while (end < seq.length && seq[end] === seq[start]) end++
    const count = end - start
    const label = OP_TOKEN[seq[start]]
    out.push(count > 1 ? `${label}×${count}` : label)
    start = end
  }
  return out.join('·')
}
