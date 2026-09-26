import { classifierAccuracy, deckFeatures, randomFeatures } from '../classifier.ts'
import type { Metric } from './types.ts'

/**
 * Distinguishability: the held-out accuracy of a classifier trained to tell the run's decks from random ones. 50% is a
 * coin flip. It is the catch-all for patterns the four categories don't look for, so it belongs to none of them.
 */
export const distinguishability: Metric = {
  key: 'classifier',
  category: null,
  title: 'Distinguishability',
  trials: 1000,
  batch: (deckSize) => {
    const features: number[][] = []
    return {
      add: (deck) => void features.push(deckFeatures(deck, deckSize)),
      value: () => classifierAccuracy(features, randomFeatures(deckSize)),
    }
  },
  // A classifier that can't tell the decks apart scores 50%, and a sorted deck is told apart every time.
  calibration: { kind: 'fixed', baseline: () => ({ mean: 0.5, standardDeviation: 0.02, sorted: 1 }) },
}
