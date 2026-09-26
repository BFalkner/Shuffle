import { RUN_DECKS, type Metric } from './types.ts'

/** How close to its end a card counts as still there: the end place and the three next to it. */
const DEPTH = 4

/**
 * Position, ends: how often the cards that started on top and on the bottom are still within three places of their end.
 * A random deck leaves each there 4 times in 99. The mash barely moves the ends, so they stay far more often. The spread
 * reading misses this, because two cards out of 99 barely move its average.
 */
export const ends: Metric = {
  key: 'ends',
  category: 'position',
  title: 'Ends',
  trials: RUN_DECKS,
  batch: (deckSize) => {
    let stayed = 0
    let checked = 0
    return {
      add: (deck, _types, start) => {
        const top = start[0]
        const bottom = start[deckSize - 1]
        for (let depth = 0; depth < DEPTH; depth++) {
          if (deck[depth] === top) stayed++
          if (deck[deckSize - 1 - depth] === bottom) stayed++
        }
        checked += 2
      },
      value: () => stayed / checked,
    }
  },
  calibration: { kind: 'batches' },
}
