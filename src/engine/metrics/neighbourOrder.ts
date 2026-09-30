import { posOf } from '../decks.ts'
import type { Deck } from '../moves.ts'
import { RUN_DECKS, powerMean, type Metric } from './types.ts'

/**
 * How many old neighbours (card c and card c + 1) are still in their old order, as a signed share: +1 when all of them
 * are, −1 when all of them are reversed, and 0 when half are.
 */
export function orderBalance(deck: Deck): number {
  const positions = posOf(deck)
  let inOrder = 0
  for (let card = 0; card < deck.length - 1; card++) if (positions[card + 1] > positions[card]) inOrder++
  return (2 * inOrder) / (deck.length - 1) - 1
}

/**
 * Sequence: whether old neighbours still come in their old order. The mash keeps each half's cards in order, so after a few
 * passes most neighbours still do. The overhand reverses its packets, so most come out reversed. For each pair of old
 * neighbours, the batch reads its balance over every deck without the sign, so reliably reversed reads as high as
 * reliably kept. It combines the pairs with a power mean. Reading each pair on its own matters when a routine keeps
 * some pairs and reverses others, as a half overhand between mashes does: one balance over all pairs would let the two
 * cancel out.
 */
export const sequence: Metric = {
  key: 'sequence',
  category: 'sequence',
  title: 'Sequence',
  trials: RUN_DECKS,
  batch: (deckSize) => {
    // inOrder[card]: decks in which card + 1 still comes after card
    const inOrder = new Int32Array(deckSize - 1)
    let count = 0
    return {
      add: (deck) => {
        const positions = posOf(deck)
        for (let card = 0; card < deckSize - 1; card++) if (positions[card + 1] > positions[card]) inOrder[card]++
        count++
      },
      value: () => powerMean(Array.from(inOrder, (kept) => Math.abs((2 * kept) / count - 1))),
    }
  },
  calibration: { kind: 'batches' },
}
