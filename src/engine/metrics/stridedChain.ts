import { posOf } from '../decks.ts'
import type { Deck } from '../moves.ts'
import { FULL, PER_DECK_TRIALS, averageBatch, type Metric } from './types.ts'

export function mStrided(deck: Deck): number {
  const positions = posOf(deck)
  let best = 2
  let run = 2
  let step = positions[1] - positions[0]
  for (let card = 2; card < deck.length; card++) {
    const nextStep = positions[card] - positions[card - 1]
    if (nextStep === step) run++
    else run = 2
    step = nextStep
    best = Math.max(best, run)
  }
  return best
}

export const stridedChain: Metric = {
  key: 'strided', group: 'structure', core: false, raw: true, unit: 'cards', side: 'low', title: 'Strided chain', measure: mStrided,
  trials: PER_DECK_TRIALS,
  batch: averageBatch(mStrided, PER_DECK_TRIALS),
  calibration: { kind: 'perDeck' },
  desc: 'The longest run of cards evenly spaced in the old order and still in sequence. Built for the pile deal’s every-sixth-card pattern, but ordering and proximity already catch that pile, so it confirms rather than catches.',
  writeup: { to: '/order-tests', label: FULL },
}
