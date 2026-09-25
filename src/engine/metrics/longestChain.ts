import { posOf } from '../decks.ts'
import type { Deck } from '../moves.ts'
import { FULL, type Metric } from './types.ts'

export function mChain(deck: Deck): number {
  const positions = posOf(deck)
  let best = 1
  let run = 1
  for (let card = 1; card < deck.length; card++) {
    run = positions[card] > positions[card - 1] ? run + 1 : 1
    best = Math.max(best, run)
  }
  return best
}

export const longestChain: Metric = {
  key: 'chain', group: 'order', core: false, raw: true, unit: 'cards', side: 'low', title: 'Longest chain', measure: mChain,
  desc: 'The longest run of consecutive cards still in order anywhere in the deck. Random decks show four or five. The mash leaves longer runs for its first few passes.',
  writeup: { to: '/order-tests', label: FULL },
}
