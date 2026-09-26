// Per-deck measures from the old test battery, before the tests were merged into four categories. The forest reads
// them as features. Each is measured against the sorted starting order: card c started at position c.
import { LAND, catSizes, posOf, type CardTypes } from '../src/engine/decks.ts'
import type { Deck } from '../src/engine/moves.ts'

export function mOrdering(deck: Deck): number {
  const positions = posOf(deck)
  let runs = 1
  for (let card = 1; card < deck.length; card++) if (positions[card] < positions[card - 1]) runs++
  return runs
}

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

export function mProximity(deck: Deck): number {
  const positions = posOf(deck)
  let closePairs = 0
  for (let card = 0; card < deck.length - 1; card++) if (Math.abs(positions[card] - positions[card + 1]) <= 3) closePairs++
  return closePairs
}

export function mGradient(deck: Deck): number {
  const deckSize = deck.length
  let triples = 0
  for (let position = 0; position + 2 < deckSize; position++) if (deck[position + 1] === deck[position] + 1 && deck[position + 2] === deck[position + 1] + 1) triples++
  return triples / deckSize
}

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

export function mClump(deck: Deck, deckSize: number, types: CardTypes): number {
  const sizes = catSizes(deckSize)
  const windowSize = 10
  const expected = sizes.map((size) => (windowSize * size) / deckSize)
  let total = 0
  let windows = 0
  for (let start = 0; start + windowSize <= deckSize; start += 1) {
    const counts = [0, 0, 0, 0]
    for (let offset = 0; offset < windowSize; offset++) counts[types[deck[start + offset]]]++
    let deviation = 0
    for (let category = 0; category < 4; category++) deviation += (counts[category] - expected[category]) * (counts[category] - expected[category])
    total += deviation
    windows++
  }
  return windows ? total / windows : 0
}
