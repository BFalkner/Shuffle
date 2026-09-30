import { posOf } from '../decks.ts'
import { RUN_DECKS, mismatch, type Metric } from './types.ts'

const SLICES = 10

/** The tenth of the deck each position falls in, and the share of positions in each tenth. */
function tenths(deckSize: number) {
  const sliceOf = Array.from({ length: deckSize }, (_, position) => Math.floor((position * SLICES) / deckSize))
  const expected = new Float64Array(SLICES)
  sliceOf.forEach((slice) => (expected[slice] += 1 / deckSize))
  return { sliceOf, expected }
}

/**
 * Position, spread: how much a card's starting place tells you about where it ends up. For the card that started in
 * each place, it counts which tenth of the deck it ends in, and reads the share of those that differ from an even
 * spread. The metric reads the worst starting place, not the average, so a few cards that stay put count in full: the
 * mash leaves its top and bottom cards near their ends, and one overhand leaves its middle cards in the middle. An
 * average over 99 places would dilute either. A pile deal sends every card to a fixed place, so it reads as high as an
 * unshuffled deck. Tenths rather than single places keep the reading steady over 1,200 decks.
 */
export const spread: Metric = {
  key: 'spread',
  category: 'position',
  title: 'Spread',
  trials: RUN_DECKS,
  batch: (deckSize) => {
    const { sliceOf, expected } = tenths(deckSize)
    // counts[startingPlace * SLICES + tenth]
    const counts = new Int32Array(deckSize * SLICES)
    return {
      add: (deck, _types, start) => {
        const startingPlace = posOf(start)
        for (let position = 0; position < deckSize; position++) counts[startingPlace[deck[position]] * SLICES + sliceOf[position]]++
      },
      value: () => {
        let worst = 0
        for (let place = 0; place < deckSize; place++) worst = Math.max(worst, mismatch(counts, expected, place * SLICES))
        return worst
      },
    }
  },
  calibration: { kind: 'batches' },
}
