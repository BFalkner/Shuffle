// Regression suite for the shuffle engine. These checks are statistical where
// the engine is random, with tolerances wide enough to be stable run to run.
import { describe, expect, test } from 'vitest'
import { getBase } from './calibrate.ts'
import { fisher, posOf, sortedDeck } from './decks.ts'
import { METRICS } from './metrics.ts'
import { kendallTau } from './metrics/pairOrder.ts'
import { orderBalance } from './metrics/neighbourOrder.ts'
import { OPS, type OpKey } from './moves.ts'
import { OP_COST } from './routines.ts'
import { level, noiseLevel } from './scoring.ts'
import { computeResult, scoreResult } from './simulate.ts'

function runSeq(seq: OpKey[], deckSize: number) {
  let deck = sortedDeck(deckSize)
  for (const op of seq) deck = OPS[op](deck)
  return deck
}

describe('engine identity & conservation', () => {
  test('every move is a permutation (no card duplicated or lost)', () => {
    const deckSize = 99
    for (const key of Object.keys(OPS) as OpKey[]) {
      const deck = OPS[key](sortedDeck(deckSize))
      expect(deck, key).toHaveLength(deckSize)
      expect(new Set(deck).size, key).toBe(deckSize)
    }
  })

  test('ohTop (ohr) never touches the bottom half', () => {
    // Regression: ohr once looked like it included a mash. Some suffix of the
    // output must be an exact, untouched copy of the input's tail.
    const deckSize = 99
    for (let trial = 0; trial < 30; trial++) {
      const before = sortedDeck(deckSize)
      const after = OPS.ohr(before)
      let matched = false
      for (let cut = 1; cut < deckSize; cut++) {
        const bTail = before.slice(cut)
        if (JSON.stringify(bTail) === JSON.stringify(after.slice(deckSize - bTail.length))) {
          matched = true
          break
        }
      }
      expect(matched).toBe(true)
    }
  })

  test('ohBottom (ohb) never touches the top half', () => {
    const deckSize = 99
    for (let trial = 0; trial < 30; trial++) {
      const before = sortedDeck(deckSize)
      const after = OPS.ohb(before)
      let matched = false
      for (let cut = 1; cut < deckSize; cut++) {
        if (JSON.stringify(before.slice(0, cut)) === JSON.stringify(after.slice(0, cut))) {
          matched = true
          break
        }
      }
      expect(matched).toBe(true)
    }
  })

  test('pile is deterministic (no Math.random dependence)', () => {
    expect(OPS.pile(sortedDeck(99))).toEqual(OPS.pile(sortedDeck(99)))
  })
})

describe('riffle model anchors', () => {
  // Guards the "fitted to a real hand" packet model against silent drift.
  test('mash stays a valid permutation over repeated passes', () => {
    let deck = sortedDeck(99)
    for (let pass = 0; pass < 12; pass++) deck = OPS.mash(deck)
    expect(new Set(deck).size).toBe(99)
  })

  const mixedDecks = (count: number) =>
    Array.from({ length: count }, () => runSeq(Array(8).fill('mash'), 99))

  test("Kendall's tau matches a direct count of pairs in their old order", () => {
    const decks = [sortedDeck(9), sortedDeck(9).toReversed(), [3, 5, 2, 1, 7, 4, 0, 8, 6], ...mixedDecks(5)]
    const direct = (deck: number[]) => {
      const pairs = deck.flatMap((card, place) => deck.slice(place + 1).map((later) => (later > card ? 1 : -1)))
      return pairs.reduce((total: number, sign) => total + sign, 0) / pairs.length
    }
    decks.forEach((deck) => expect(kendallTau(deck)).toBeCloseTo(direct(deck), 12))
  })

  test('eight mashes leave old neighbours in order about half the time, as a random deck does', () => {
    const balances = mixedDecks(800).map(orderBalance)
    const mean = balances.reduce((total, value) => total + value, 0) / balances.length
    expect(Math.abs(mean)).toBeLessThanOrEqual(0.02)
  })
})

describe('metric & calibration structure', () => {
  test('every metric has the required fields', () => {
    for (const metric of METRICS) {
      expect(metric.title, metric.key).toBeTruthy()
      expect(typeof metric.batch, metric.key).toBe('function')
      expect(metric.trials, metric.key).toBeGreaterThan(0)
      expect(['batches', 'fixed']).toContain(metric.calibration.kind)
    }
  })

  test('every baseline puts random decks at level 0, a sorted deck at level 1, and the noise well below 1', () => {
    const base = getBase(99)
    for (const metric of METRICS) {
      const baseline = base[metric.key]
      expect(level(metric, baseline.mean, base), metric.key).toBeCloseTo(0, 10)
      expect(level(metric, baseline.sorted, base), metric.key).toBeCloseTo(1, 10)
      expect(noiseLevel(metric, base), metric.key).toBeLessThan(0.2)
    }
  })
})

describe('proximity reads both ways', () => {
  // An early version only failed decks whose old neighbours stayed too close. A mash model fitted to real mashing then
  // spread old neighbours more evenly than random decks do, and proximity passed those decks while the classifier caught
  // them. Too even is as far from random as too close, so both must read above the noise line.
  const deckSize = 99
  const proximity = METRICS.find((metric) => metric.key === 'proximity')!
  const base = getBase(deckSize)

  /** Proximity's level over 1,200 decks from makeDeck. */
  function proximityLevel(makeDeck: () => number[]) {
    const batch = proximity.batch(deckSize)
    Array.from({ length: 1200 }, makeDeck).forEach((deck) => batch.add(deck, deck))
    return level(proximity, batch.value(), base)
  }

  /** The first card whose old neighbour (the next card) sits right beside it, or -1. */
  function adjacentNeighbour(deck: number[]) {
    const positions = posOf(deck)
    return positions.findIndex((position, card) => card < deckSize - 1 && Math.abs(position - positions[card + 1]) === 1)
  }

  /** A random deck with each old neighbour that landed beside its card swapped somewhere at random, until none are. */
  function tooEven() {
    const deck = fisher(deckSize)
    for (let card = adjacentNeighbour(deck); card >= 0; card = adjacentNeighbour(deck)) {
      const from = deck.indexOf(card + 1)
      const to = Math.floor(Math.random() * deckSize)
      ;[deck[from], deck[to]] = [deck[to], deck[from]]
    }
    return deck
  }

  /** A random deck with about 2% of old neighbours moved beside their card. */
  function tooClose() {
    return Array.from({ length: deckSize - 1 }, (_, card) => card)
      .filter(() => Math.random() < 0.02)
      .reduce((deck, card) => {
        const at = deck.indexOf(card)
        const target = at + 1 < deckSize ? at + 1 : at - 1
        const from = deck.indexOf(card + 1)
        ;[deck[from], deck[target]] = [deck[target], deck[from]]
        return deck
      }, fisher(deckSize))
  }

  test('decks with no old neighbours side by side read above the noise line', () => {
    expect(proximityLevel(tooEven)).toBeGreaterThan(2 * noiseLevel(proximity, base))
  })

  test('decks with 2% of old neighbours pulled together read above the noise line', () => {
    expect(proximityLevel(tooClose)).toBeGreaterThan(2 * noiseLevel(proximity, base))
  })
})

describe('cost accounting', () => {
  test('move costs match the ratified units (M/T/B = 1, O = 2, P = 4, C = 0.5)', () => {
    expect(OP_COST).toEqual({ mash: 1, ohr: 1, ohb: 1, overhand: 2, pile: 4, cut: 0.5 })
  })
})

describe('plain mashing', () => {
  test('each pair of extra mashes brings a sorted deck closer to random', () => {
    const totals = [2, 4, 8].map((mashes) => scoreResult(computeResult('sorted', 99, Array(mashes).fill('mash'), 'ends')).total)
    expect(totals[0]).toBeGreaterThan(totals[1])
    expect(totals[1]).toBeGreaterThan(totals[2])
    expect(totals[2]).toBeLessThan(0.1)
  })
})

test('posOf inverts a deck', () => {
  const deck = [2, 0, 1]
  expect(posOf(deck)).toEqual([1, 2, 0])
})
