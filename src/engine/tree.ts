// Dealing many routines at once. Routines that share a prefix share the decks dealt through it, so each move in the
// tree of routines is dealt once per deck, not once per routine that contains it. The search uses it for stage 1.
import { OPS, type Deck, type OpKey } from './moves.ts'
import { OP_COST, compressSeq } from './routines.ts'

export const costOf = (seq: readonly OpKey[]) => seq.reduce((total, op) => total + OP_COST[op], 0)

export interface ScoredRoutine {
  seq: OpKey[]
  total: number
}

/**
 * Ranks scored routines: the lowest total first, then the cheaper routine, then by name. No two routines tie, so the
 * ranking doesn't depend on the order the routines arrive in.
 */
export const byTotal = (a: ScoredRoutine, b: ScoredRoutine) =>
  a.total - b.total || costOf(a.seq) - costOf(b.seq) || byName(compressSeq(a.seq), compressSeq(b.seq))

const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/**
 * Deal `starts` through `prefix`, then call `visit` with the prefix and its decks. With `descend`, go on to every routine
 * that extends the prefix with `moves` and costs at most `maxCost`, depth first, in the order of `moves`. Each routine's
 * decks are its parent's decks after one more move, and only one set of decks is held per depth.
 */
export function walkRoutines(
  starts: Deck[],
  prefix: OpKey[],
  moves: readonly OpKey[],
  maxCost: number,
  descend: boolean,
  visit: (seq: OpKey[], decks: Deck[]) => void,
): void {
  const deal = (decks: Deck[], op: OpKey) => decks.map((deck) => OPS[op](deck))
  const walk = (seq: OpKey[], decks: Deck[], cost: number) => {
    visit(seq, decks)
    if (!descend) return
    moves.filter((op) => cost + OP_COST[op] <= maxCost).forEach((op) => walk([...seq, op], deal(decks, op), cost + OP_COST[op]))
  }
  walk(prefix, prefix.reduce(deal, starts), costOf(prefix))
}
