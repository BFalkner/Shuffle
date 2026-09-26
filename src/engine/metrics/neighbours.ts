import { posOf } from '../decks.ts'
import type { Deck } from '../moves.ts'
import { RUN_DECKS, mismatch, type Metric } from './types.ts'

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

/**
 * Neighbours: how far apart old neighbours (card c and card c + 1) now sit, compared with how far apart a random deck
 * puts them. It reads the share of pairs at distances a random deck wouldn't produce. That catches neighbours left too
 * close, as the overhand leaves them, and neighbours spread too evenly, as a pile deal or an early mash spreads them.
 */
export const neighbours: Metric = {
  key: 'neighbours',
  category: 'neighbours',
  title: 'Neighbours',
  trials: RUN_DECKS,
  batch: (deckSize) => {
    const counts = new Int32Array(gapBins(deckSize).expected.length)
    return { add: (deck) => addGaps(counts, deck), value: () => mismatch(counts, gapBins(deckSize).expected) }
  },
  calibration: { kind: 'batches' },
}
