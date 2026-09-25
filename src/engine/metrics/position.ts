import { FULL, type Metric } from './types.ts'

export const position: Metric = {
  key: 'position', group: 'structure', core: true, raw: false, unit: '%', side: 'low', title: 'Position', measure: null,
  // Every deck of the run: the card × slot table needs as many as possible.
  trials: 1200,
  batch: (deckSize) => {
    const slotCounts = new Int32Array(deckSize * deckSize)
    return {
      add: (deck) => {
        for (let position = 0; position < deckSize; position++) slotCounts[deck[position] * deckSize + position]++
      },
      // Chi-square of the card × slot table against uniform.
      value: () => {
        const expected = 1200 / deckSize
        let chi = 0
        for (let cell = 0; cell < deckSize * deckSize; cell++) {
          const difference = slotCounts[cell] - expected
          chi += (difference * difference) / expected
        }
        return chi
      },
    }
  },
  calibration: {
    kind: 'fixed',
    // Chi-square with (deckSize - 1)² degrees of freedom.
    baseline: (deckSize) => {
      const degreesOfFreedom = (deckSize - 1) * (deckSize - 1)
      return { mean: degreesOfFreedom, standardDeviation: Math.sqrt(2 * degreesOfFreedom), threshold: degreesOfFreedom * 1.45 }
    },
  },
  format: (value) => (value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `${Math.round(value / 1e3)}k` : `${Math.round(value)}`),
  desc: 'Whether cards keep landing in the same places across many shuffles, using a chi-square over every card and position. Built for the pile deal, which puts every card in a fixed place.',
  writeup: { to: '/global-tests', label: FULL },
}
