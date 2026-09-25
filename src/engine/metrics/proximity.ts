import { posOf } from '../decks.ts'
import type { Deck } from '../moves.ts'
import { FULL, type Metric } from './types.ts'

export function mProximity(deck: Deck): number {
  const positions = posOf(deck)
  let closePairs = 0
  for (let card = 0; card < deck.length - 1; card++) if (Math.abs(positions[card] - positions[card + 1]) <= 3) closePairs++
  return closePairs
}

export const proximity: Metric = {
  key: 'proximity', group: 'order', core: true, raw: false, unit: '%', side: 'band', title: 'Proximity', measure: mProximity,
  desc: 'Counts pairs of cards that started side by side and are still within three places. Built for the overhand, which keeps neighbours together. Too few also fails: a pile deal or an early mash spreads neighbours <i>too</i> evenly.',
  writeup: { to: '/order-tests', label: FULL },
}
