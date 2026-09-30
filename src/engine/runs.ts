// Dealing: put many starting decks through a routine, without measuring anything. Measurement lives in simulate.ts.
import { startDeck, type DeckKind } from './decks.ts'
import { OPS, type Deck, type OpKey } from './moves.ts'

/** Performs one move. The default is the move itself; the search swaps in a perfect shuffle to measure a random deck. */
export type Apply = (deck: Deck, op: OpKey) => Deck

export const applyMove: Apply = (deck, op) => OPS[op](deck)

/**
 * Deal `trials` starting decks of `kind`, put each through `seq`, and call `visit` with the deck at every step that
 * `measured` accepts (step 0 is the starting deck), along with the starting deck. Decks go through in trial order, and
 * each finishes its routine before the next is dealt, so the random numbers are drawn in the same order every time.
 */
export function dealRuns(
  kind: DeckKind,
  deckSize: number,
  seq: OpKey[],
  trials: number,
  visit: (trial: number, step: number, deck: Deck, start: Deck) => void,
  measured: (step: number) => boolean = () => true,
  apply: Apply = applyMove,
): void {
  for (let trial = 0; trial < trials; trial++) {
    const start = startDeck(kind, deckSize)
    let deck = start
    visit(trial, 0, deck, start)
    for (let step = 0; step < seq.length; step++) {
      deck = apply(deck, seq[step])
      if (measured(step + 1)) visit(trial, step + 1, deck, start)
    }
  }
}
