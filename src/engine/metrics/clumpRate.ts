import { catSizes, type CardTypes } from '../decks.ts'
import type { Deck } from '../moves.ts'
import { PER_DECK_TRIALS, averageBatch, type Metric } from './types.ts'

export function mClump(deck: Deck, deckSize: number, types: CardTypes): number {
  const sizes = catSizes(deckSize)
  const windowSize = 10
  const expected = sizes.map((size) => (windowSize * size) / deckSize)
  let total = 0
  let windows = 0
  for (let start = 0; start + windowSize <= deckSize; start += 1) {
    const counts = [0, 0, 0, 0]
    for (let offset = 0; offset < windowSize; offset++) counts[types[deck[start + offset]]]++
    let deviation = 0
    for (let category = 0; category < 4; category++) deviation += (counts[category] - expected[category]) * (counts[category] - expected[category])
    total += deviation
    windows++
  }
  return windows ? total / windows : 0
}

export const clumpRate: Metric = {
  key: 'clump', group: 'composition', core: false, noCap: true, raw: true, unit: 'dev', side: 'band', title: 'Clump rate', measure: mClump,
  trials: PER_DECK_TRIALS,
  batch: averageBatch(mClump, PER_DECK_TRIALS),
  calibration: {
    kind: 'perDeck',
    // A rate-based band on the trial average.
    rule: (mean, standardDeviation) => ({
      mean,
      standardDeviation,
      threshold: mean + (3.5 * standardDeviation) / Math.sqrt(200),
      high: mean + (3.5 * standardDeviation) / Math.sqrt(200),
      low: mean - (3.5 * standardDeviation) / Math.sqrt(200),
    }),
  },
  format: (value) => value.toFixed(2),
}
