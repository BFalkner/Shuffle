import { classifierAccuracy, deckFeatures, randomFeatures } from '../classifier.ts'
import { FULL, type Metric } from './types.ts'

export const distinguishability: Metric = {
  key: 'classifier', group: 'holistic', core: false, raw: true, unit: '% detect', side: 'low', title: 'Distinguishability', measure: null,
  trials: 1000,
  batch: (deckSize) => {
    const features: number[][] = []
    return {
      add: (deck) => void features.push(deckFeatures(deck, deckSize)),
      value: () => classifierAccuracy(features, randomFeatures(deckSize)),
    }
  },
  calibration: { kind: 'fixed', baseline: () => ({ mean: 0.5, standardDeviation: 0.02, threshold: 0.56 }) },
  format: (value) => `${Math.round(value * 100)}%`,
  desc: 'A classifier trained during each run to tell these decks from truly random ones. 50% is a coin flip. The catch-all for patterns no named test looks for. Readings under about 54% are luck.',
  writeup: { to: '/global-tests', label: FULL },
}
