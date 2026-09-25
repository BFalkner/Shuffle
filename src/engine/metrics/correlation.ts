import type { Deck } from '../moves.ts'
import { PER_DECK_TRIALS, averageBatch, type Metric } from './types.ts'

export function mCorr(deck: Deck, deckSize: number): number {
  let sumCurrent = 0
  let sumNext = 0
  let sumProduct = 0
  let sumCurrentSquared = 0
  let sumNextSquared = 0
  const pairCount = deckSize - 1
  for (let position = 0; position < deckSize - 1; position++) {
    const current = deck[position]
    const next = deck[position + 1]
    sumCurrent += current
    sumNext += next
    sumProduct += current * next
    sumCurrentSquared += current * current
    sumNextSquared += next * next
  }
  const covariance = sumProduct / pairCount - (sumCurrent / pairCount) * (sumNext / pairCount)
  const varianceCurrent = sumCurrentSquared / pairCount - (sumCurrent / pairCount) * (sumCurrent / pairCount)
  const varianceNext = sumNextSquared / pairCount - (sumNext / pairCount) * (sumNext / pairCount)
  return varianceCurrent > 0 && varianceNext > 0 ? covariance / Math.sqrt(varianceCurrent * varianceNext) : 0
}

export const correlation: Metric = {
  key: 'corr', group: 'order', core: true, raw: true, unit: 'r', side: 'two', title: 'Neighbour correlation', measure: mCorr,
  trials: PER_DECK_TRIALS,
  batch: averageBatch(mCorr, PER_DECK_TRIALS),
  calibration: { kind: 'perDeck' },
  format: (value) => value.toFixed(2),
  floor: -1,
}
