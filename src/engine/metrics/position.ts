import { posOf } from '../decks.ts'
import { RUN_DECKS, mismatch, powerMean, type Metric } from './types.ts'

const SLICES = 10

/** The tenth of the deck each position falls in, and the share of positions in each tenth. */
function tenths(deckSize: number) {
  const sliceOf = Array.from({ length: deckSize }, (_, position) => Math.floor((position * SLICES) / deckSize))
  const expected = new Float64Array(SLICES)
  sliceOf.forEach((slice) => (expected[slice] += 1 / deckSize))
  return { sliceOf, expected }
}

/**
 * Position: how much a card's starting place tells you about where it ends up. For the card that started in each place,
 * it counts which tenth of the deck it ends in, and reads the share of those that differ from an even spread. The
 * metric combines the starting places with a power mean, so a few cards that stay put still count: the mash leaves its
 * top and bottom cards near their ends, and one overhand leaves its middle cards in the middle. An average over 99
 * places would dilute either, and the single worst place would let one stuck card outweigh the rest of the deck. A
 * pile deal sends every card to a fixed place, so it reads as high as an unshuffled deck.
 * Tenths rather than single places keep the reading steady over 1,200 decks.
 */
export const position: Metric = {
  key: 'position',
  category: 'position',
  title: 'Position',
  trials: RUN_DECKS,
  batch: (deckSize) => {
    const { sliceOf, expected } = tenths(deckSize)
    // counts[startingPlace * SLICES + tenth]
    const counts = new Int32Array(deckSize * SLICES)
    return {
      add: (deck, start) => {
        const startingPlace = posOf(start)
        for (let place = 0; place < deckSize; place++) counts[startingPlace[deck[place]] * SLICES + sliceOf[place]]++
      },
      value: () => powerMean(Array.from({ length: deckSize }, (_, place) => mismatch(counts, expected, place * SLICES))),
    }
  },
  calibration: { kind: 'batches' },
}
