import type { Deck } from '../moves.ts'
import type { Metric } from './types.ts'

/** Original end cards still within three of their end. */
export function mEndRetention(deck: Deck, deckSize: number): number {
  let count = 0
  for (let depth = 0; depth <= 3; depth++) {
    if (deck[depth] === 0) count++
    if (deck[deckSize - 1 - depth] === deckSize - 1) count++
  }
  return count
}

export const endRetention: Metric = {
  key: 'endret', group: 'structure', core: false, raw: true, unit: 'cards', side: 'two', title: 'End retention', measure: mEndRetention,
  desc: 'Whether the original top card and bottom card are still within three places of their end: 0.08 when random. Built for the mash, which barely moves the ends. Two-sided, and judged on the average over many shuffles.',
  writeup: { to: '/sticky-ends', label: 'The sticky-ends write-up' },
}
