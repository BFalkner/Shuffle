import type { Deck } from '../moves.ts'
import { FULL, PER_DECK_TRIALS, averageBatch, type Metric } from './types.ts'

export function mGradient(deck: Deck): number {
  const deckSize = deck.length
  let triples = 0
  for (let position = 0; position + 2 < deckSize; position++) if (deck[position + 1] === deck[position] + 1 && deck[position + 2] === deck[position + 1] + 1) triples++
  return triples / deckSize
}

export const localOrder: Metric = {
  key: 'gradient', group: 'order', core: false, raw: true, unit: 'density', side: 'low', title: 'Local order', measure: mGradient,
  trials: PER_DECK_TRIALS,
  batch: averageBatch(mGradient, PER_DECK_TRIALS),
  calibration: { kind: 'perDeck' },
  format: (value) => value.toFixed(3),
  desc: 'How often three or more consecutive cards still sit together in order. Near zero when random. Built for the overhand, which keeps short runs intact inside its packets.',
  writeup: { to: '/order-tests', label: FULL },
}
