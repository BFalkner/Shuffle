import type { Deck } from '../moves.ts'
import { averageBatch, type Metric } from './types.ts'

/** Original end cards still within three of their end. */
export function mEndRetention(deck: Deck, deckSize: number): number {
  let count = 0
  for (let depth = 0; depth <= 3; depth++) {
    if (deck[depth] === 0) count++
    if (deck[deckSize - 1 - depth] === deckSize - 1) count++
  }
  return count
}

export const endRetention: Metric = {
  key: 'endret', group: 'structure', core: false, raw: true, unit: 'cards', side: 'two', title: 'End retention', measure: mEndRetention,
  // Judged as a rate over 400 trials.
  trials: 400,
  batch: averageBatch(mEndRetention, 400),
  calibration: {
    kind: 'fixed',
    // Analytic: each end card is in its four end places with probability 4 / deckSize.
    baseline: (deckSize) => {
      const standardDeviation = Math.sqrt(2 * (4 / deckSize) * (1 - 4 / deckSize))
      return { mean: (2 * 4) / deckSize, standardDeviation, threshold: (3 * standardDeviation) / Math.sqrt(400) }
    },
  },
}
