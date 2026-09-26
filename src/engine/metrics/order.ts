import { posOf } from '../decks.ts'
import type { Deck } from '../moves.ts'
import { RUN_DECKS, type Metric } from './types.ts'

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
 * Order: whether old neighbours still come in their old order. The mash keeps each half's cards in order, so after a few
 * passes most neighbours still do. The overhand reverses its packets, so most come out reversed. The batch averages the
 * balance with its sign, then drops the sign, so reliably reversed reads as high as reliably kept.
 */
export const order: Metric = {
  key: 'order',
  category: 'order',
  title: 'Order',
  trials: RUN_DECKS,
  batch: () => {
    let sum = 0
    let count = 0
    return {
      add: (deck) => {
        sum += orderBalance(deck)
        count++
      },
      value: () => Math.abs(sum / count),
    }
  },
  calibration: { kind: 'batches' },
}
