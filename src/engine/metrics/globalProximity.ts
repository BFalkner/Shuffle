import type { Deck } from '../moves.ts'
import { FULL, PER_DECK_TRIALS, averageBatch, type Metric } from './types.ts'

export function mDrift(deck: Deck): number {
  const deckSize = deck.length
  let total = 0
  for (let position = 0; position < deckSize - 1; position++) total += Math.abs(deck[position] - deck[position + 1]) - 1
  return total / (deckSize - 1)
}

export const globalProximity: Metric = {
  key: 'drift', group: 'order', core: false, raw: true, unit: 'avg', side: 'band', title: 'Global proximity', measure: mDrift,
  trials: PER_DECK_TRIALS,
  batch: averageBatch(mDrift, PER_DECK_TRIALS),
  calibration: {
    kind: 'perDeck',
    // A rate-based band on the trial average.
    rule: (mean, standardDeviation) => ({
      mean,
      standardDeviation,
      threshold: mean + (3 * standardDeviation) / Math.sqrt(200),
      high: mean + (3 * standardDeviation) / Math.sqrt(200),
      low: mean - (3 * standardDeviation) / Math.sqrt(200),
    }),
  },
  desc: 'For each pair of cards now side by side, how far apart they started. Proximity as a distance rather than a count. An overhand-only routine fails it low, because its packets never separate the pairs inside them.',
  writeup: { to: '/order-tests', label: FULL },
}
