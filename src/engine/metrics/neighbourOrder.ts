import { posOf } from '../decks.ts'
import type { Deck } from '../moves.ts'
import { RUN_DECKS, powerMean, type Metric } from './types.ts'

/** For each pair of old neighbours (card c and card c + 1), whether card c + 1 still comes after card c. */
function keptInOrder(deck: Deck): boolean[] {
  const positions = posOf(deck)
  return Array.from({ length: deck.length - 1 }, (_, card) => positions[card + 1] > positions[card])
}

/**
 * How many old neighbours (card c and card c + 1) are still in their old order, as a signed share: +1 when all of them
 * are, −1 when all of them are reversed, and 0 when half are.
 */
export function orderBalance(deck: Deck): number {
  const kept = keptInOrder(deck).filter(Boolean).length
  return (2 * kept) / (deck.length - 1) - 1
}

/**
 * Neighbour order: whether the card that followed each card still lands on the same side of it, run after run. The mash
 * keeps each half's cards in order, so after a few passes most neighbours still do. The overhand reverses its packets,
 * so most come out reversed. For each pair of old neighbours, the batch reads its balance over every deck without the
 * sign, so reliably reversed reads as high as reliably kept. It combines the pairs with a power mean. Reading each pair
 * on its own matters when a routine keeps some pairs and reverses others, as a half overhand between mashes does: one
 * balance over all pairs would let the two cancel out.
 */
export const neighbourOrder: Metric = {
  key: 'neighbourOrder',
  category: 'order',
  title: 'Neighbour order',
  trials: RUN_DECKS,
  batch: (deckSize) => {
    // inOrder[card]: decks in which card + 1 still comes after card
    let inOrder: number[] = Array(deckSize - 1).fill(0)
    let count = 0
    return {
      add: (deck) => {
        const kept = keptInOrder(deck)
        inOrder = inOrder.map((decks, card) => decks + (kept[card] ? 1 : 0))
        count++
      },
      value: () => powerMean(inOrder.map((kept) => Math.abs((2 * kept) / count - 1))),
    }
  },
  calibration: { kind: 'batches' },
}
