import { posOf } from '../decks.ts'
import type { Deck } from '../moves.ts'
import { FULL, PER_DECK_TRIALS, type Metric } from './types.ts'

export interface GapBins {
  /** bin index for each distance 1 to deckSize - 1 */
  binOf: Int32Array
  /** share of old-neighbour pairs a random deck puts in each bin */
  expected: Float64Array
}

const GAP_BINS = new Map<number, GapBins>()

/**
 * Bins for neighbour gaps: one per distance up to 40% of the deck, then three shared bins for the long tail. In a random
 * deck two given cards sit d places apart with probability 2(n − d) / (n(n − 1)).
 */
export function gapBins(deckSize: number): GapBins {
  let bins = GAP_BINS.get(deckSize)
  if (!bins) {
    const cut = Math.floor(deckSize * 0.4)
    const tail = deckSize - 1 - cut
    const binOf = new Int32Array(deckSize)
    const expected = new Float64Array(cut + 3)
    for (let distance = 1; distance < deckSize; distance++) {
      const bin = distance <= cut ? distance - 1 : cut + Math.min(2, Math.floor(((distance - cut - 1) * 3) / tail))
      binOf[distance] = bin
      expected[bin] += (2 * (deckSize - distance)) / (deckSize * (deckSize - 1))
    }
    bins = { binOf, expected }
    GAP_BINS.set(deckSize, bins)
  }
  return bins
}

/** Add one deck's old-neighbour gaps (card c to card c + 1) to a batch's bin counts. */
export function addGaps(counts: Int32Array, deck: Deck): void {
  const { binOf } = gapBins(deck.length)
  const positions = posOf(deck)
  for (let card = 0; card < deck.length - 1; card++) counts[binOf[Math.abs(positions[card] - positions[card + 1])]]++
}

/** Chi-square of a batch's pooled gap counts against a random deck's spread. */
export function gapChiSquare(counts: Int32Array, deckCount: number, deckSize: number): number {
  const { expected } = gapBins(deckSize)
  const pairs = deckCount * (deckSize - 1)
  let chi = 0
  for (let bin = 0; bin < expected.length; bin++) {
    const expectedCount = expected[bin] * pairs
    chi += (counts[bin] - expectedCount) ** 2 / expectedCount
  }
  return chi
}

export const neighbourGaps: Metric = {
  key: 'gaps', group: 'order', core: false, raw: true, unit: 'χ²', side: 'low', title: 'Neighbour gaps', measure: null,
  trials: PER_DECK_TRIALS,
  batch: (deckSize) => {
    const counts = new Int32Array(gapBins(deckSize).expected.length)
    return { add: (deck) => addGaps(counts, deck), value: () => gapChiSquare(counts, PER_DECK_TRIALS, deckSize) }
  },
  calibration: {
    kind: 'batches',
    size: PER_DECK_TRIALS,
    // The batch chi-square's own spread. With fewer than two batches, fall back to the chi-square distribution's mean
    // and spread for the bin count.
    finish: (chis, deckSize) => {
      const freedom = gapBins(deckSize).expected.length - 1
      const mean = chis.length >= 2 ? chis.reduce((a, b) => a + b, 0) / chis.length : freedom
      const spread = chis.length >= 2 ? Math.sqrt(chis.reduce((a, x) => a + (x - mean) ** 2, 0) / (chis.length - 1)) : Math.sqrt(2 * freedom)
      return { mean, standardDeviation: spread, threshold: mean + 3 * spread }
    },
  },
  desc: 'How far apart cards that started side by side now sit, at every distance, compared with a random deck. Seven mashes from a sorted deck leave too many pairs touching and too few two to eight apart.',
  writeup: { to: '/order-tests', label: FULL },
}
