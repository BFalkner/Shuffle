import { posOf } from '../decks.ts'
import type { Deck } from '../moves.ts'
import { PER_DECK_TRIALS, averageBatch, type Metric } from './types.ts'

export function mOrdering(deck: Deck): number {
  const positions = posOf(deck)
  let runs = 1
  for (let card = 1; card < deck.length; card++) if (positions[card] < positions[card - 1]) runs++
  return runs
}

export const ordering: Metric = {
  key: 'ordering', group: 'order', core: true, raw: false, unit: '%', side: 'two', title: 'Ordering', measure: mOrdering,
  trials: PER_DECK_TRIALS,
  batch: averageBatch(mOrdering, PER_DECK_TRIALS),
  calibration: { kind: 'perDeck' },
}
