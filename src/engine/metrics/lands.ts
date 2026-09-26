import { LAND, catSizes } from '../decks.ts'
import { RUN_DECKS, mismatch, type Metric } from './types.ts'

const GAP_SHARES = new Map<number, Float64Array>()

/**
 * The share of a random deck's land gaps of each size, from 0 up to every non-land. A land gap is the number of non-lands
 * between one land and the next, or before the first land, or after the last. With N non-lands and L lands, a gap is g
 * with probability C(N − g + L − 1, L − 1) / C(N + L, L).
 */
export function landGapShares(deckSize: number): Float64Array {
  let shares = GAP_SHARES.get(deckSize)
  if (!shares) {
    const landCount = catSizes(deckSize)[LAND]
    const nonLands = deckSize - landCount
    shares = new Float64Array(nonLands + 1)
    shares[0] = landCount / deckSize
    for (let gap = 0; gap < nonLands; gap++) shares[gap + 1] = (shares[gap] * (nonLands - gap)) / (nonLands - gap + landCount - 1)
    GAP_SHARES.set(deckSize, shares)
  }
  return shares
}

/**
 * Lands: how far the spacing of the lands is from random, in either direction. It reads the share of land gaps at sizes
 * a random deck wouldn't produce. Mana weaving puts every gap at one or two cards, and clumped lands leave many gaps of 0
 * and a few long ones, so both read high.
 */
export const lands: Metric = {
  key: 'lands',
  category: 'lands',
  title: 'Lands',
  trials: RUN_DECKS,
  batch: (deckSize) => {
    const counts = new Int32Array(landGapShares(deckSize).length)
    return {
      add: (deck, types) => {
        let gap = 0
        for (const card of deck) {
          if (types[card] === LAND) {
            counts[gap]++
            gap = 0
          } else gap++
        }
        counts[gap]++
      },
      value: () => mismatch(counts, landGapShares(deckSize)),
    }
  },
  calibration: { kind: 'batches' },
}
