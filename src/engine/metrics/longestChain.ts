import { posOf } from '../decks.ts'
import type { Deck } from '../moves.ts'
import { PER_DECK_TRIALS, averageBatch, type Metric } from './types.ts'

export function mChain(deck: Deck): number {
  const positions = posOf(deck)
  let best = 1
  let run = 1
  for (let card = 1; card < deck.length; card++) {
    run = positions[card] > positions[card - 1] ? run + 1 : 1
    best = Math.max(best, run)
  }
  return best
}

export const longestChain: Metric = {
  key: 'chain', group: 'order', core: false, raw: true, unit: 'cards', side: 'low', title: 'Longest chain', measure: mChain,
  trials: PER_DECK_TRIALS,
  batch: averageBatch(mChain, PER_DECK_TRIALS),
  calibration: { kind: 'perDeck' },
}
