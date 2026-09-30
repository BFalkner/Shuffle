// Per-deck measures from the old test battery, before the tests were merged into categories. The forest reads
// them as features. Each is measured against the sorted starting order: card c started at position c.
import { posOf } from '../src/engine/decks.ts'
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
