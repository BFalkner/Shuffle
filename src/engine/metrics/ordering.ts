import { posOf } from '../decks.ts'
import type { Deck } from '../moves.ts'
import { FULL, type Metric } from './types.ts'

export function mOrdering(deck: Deck): number {
  const positions = posOf(deck)
  let runs = 1
  for (let card = 1; card < deck.length; card++) if (positions[card] < positions[card - 1]) runs++
  return runs
}

export const ordering: Metric = {
  key: 'ordering', group: 'order', core: true, raw: false, unit: '%', side: 'two', title: 'Ordering', measure: mOrdering,
  desc: 'Counts the rising runs the deck breaks into: one when sorted, about 50 when random. Built for the mash, which leaves long runs for several passes. Too many runs is leftover order too, so the test is two-sided.',
  writeup: { to: '/order-tests', label: FULL },
}
