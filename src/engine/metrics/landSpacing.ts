import { LAND, type CardTypes } from '../decks.ts'
import type { Deck } from '../moves.ts'
import { FULL, PER_DECK_TRIALS, averageBatch, type Metric } from './types.ts'

export function mSpacing(deck: Deck, deckSize: number, types: CardTypes): number {
  const landPositions: number[] = []
  for (let position = 0; position < deckSize; position++) if (types[deck[position]] === LAND) landPositions.push(position)
  if (landPositions.length < 3) return 0
  const gaps: number[] = []
  for (let land = 1; land < landPositions.length; land++) gaps.push(landPositions[land] - landPositions[land - 1])
  const meanGap = gaps.reduce((total, gap) => total + gap, 0) / gaps.length
  let variance = 0
  gaps.forEach((gap) => (variance += (gap - meanGap) * (gap - meanGap)))
  return Math.sqrt(variance / gaps.length)
}

export const landSpacing: Metric = {
  key: 'spacing', group: 'structure', core: false, raw: false, unit: '%', side: 'two', title: 'Land spacing', measure: mSpacing,
  trials: PER_DECK_TRIALS,
  batch: averageBatch(mSpacing, PER_DECK_TRIALS),
  calibration: { kind: 'perDeck' },
  desc: 'How much the gaps between lands vary. Built for mana weaving: lands spaced <i>too</i> evenly read low, and clumped lands read high. It clears within a mash or two.',
  writeup: { to: '/mana-tests', label: FULL },
}
