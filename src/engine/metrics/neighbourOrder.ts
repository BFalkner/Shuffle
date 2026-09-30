import type { Deck } from '../moves.ts'
import { RUN_DECKS, powerMean, type Metric } from './types.ts'

// Neighbour order runs on every deck at every step, so it is written for speed: plain loops, and one positions array
// per batch that each deck refills instead of allocating its own.

/** Fill `positions` so positions[card] is the card's place in the deck, top card first. */
function fillPositions(deck: Deck, positions: Int32Array): void {
  for (let place = 0; place < deck.length; place++) positions[deck[place]] = place
}

/** Add one deck to `inOrder`: inOrder[card] counts the decks in which card + 1 still comes after card. */
function countNeighboursInOrder(positions: Int32Array, inOrder: Int32Array): void {
  for (let card = 0; card < inOrder.length; card++) if (positions[card + 1] > positions[card]) inOrder[card]++
}

/**
 * How many old neighbours (card c and card c + 1) are still in their old order, as a signed share: +1 when all of them
 * are, −1 when all of them are reversed, and 0 when half are.
 */
export function orderBalance(deck: Deck): number {
  const positions = new Int32Array(deck.length)
  const inOrder = new Int32Array(deck.length - 1)
  fillPositions(deck, positions)
  countNeighboursInOrder(positions, inOrder)
  const kept = inOrder.reduce((total, count) => total + count, 0)
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
    const positions = new Int32Array(deckSize)
    const inOrder = new Int32Array(deckSize - 1)
    let count = 0
    return {
      add: (deck) => {
        fillPositions(deck, positions)
        countNeighboursInOrder(positions, inOrder)
        count++
      },
      value: () => powerMean(Array.from(inOrder, (kept) => Math.abs((2 * kept) / count - 1))),
    }
  },
  calibration: { kind: 'batches' },
}
