import type { Deck } from '../moves.ts'
import { RUN_DECKS, type Metric } from './types.ts'

/**
 * Kendall's tau against the old order: +1 when every pair of cards is still in its old order, −1 when every pair is
 * reversed, and 0 for a random deck on average. It counts the inversions (pairs out of their old order) with a Fenwick
 * tree over card numbers, reading the deck from the bottom up.
 */
export function kendallTau(deck: Deck): number {
  const deckSize = deck.length
  const tree = new Int32Array(deckSize + 1)

  // Cards already read (so lower in the deck) with a smaller number than `card`.
  const countBelow = (card: number): number => 
    (card > 0 ? tree[card] + countBelow(card - (card & -card)) : 0)
  const insert = (index: number): void => {
    if (index > deckSize) return
    tree[index]++
    insert(index + (index & -index))
  }

  const inversions = deck
    .toReversed()
    .reduce((total, card) => {
      const smallerBelow = countBelow(card)
      insert(card + 1)
      return total + smallerBelow
    }, 0)
    
  return 1 - (4 * inversions) / (deckSize * (deckSize - 1))
}

/**
 * Pair order: of every pair of cards, whether they are still in their old order, at every spacing, not just old
 * neighbours. Neighbour order reads each pair of old neighbours on its own, so it misses a small order bias spread across the
 * whole deck, the kind slower routines leave near the clean line: cards a few places apart in the old order stay in
 * order a little more often than chance. The batch averages Kendall's tau with its sign, then drops the sign, so
 * reliably reversed reads as high as reliably kept.
 */
export const pairOrder: Metric = {
  key: 'pairOrder',
  category: 'order',
  title: 'Pair order',
  trials: RUN_DECKS,
  batch: () => {
    const taus: number[] = []
    return {
      add: (deck) => void taus.push(kendallTau(deck)),
      value: () => Math.abs(taus.reduce((total, tau) => total + tau, 0) / taus.length),
    }
  },
  calibration: { kind: 'batches' },
}
