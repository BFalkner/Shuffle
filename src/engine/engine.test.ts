// Regression suite for the shuffle engine. These checks are statistical where
// the engine is random, with tolerances wide enough to be stable run to run.
import { describe, expect, test } from 'vitest'
import { getBase } from './calibrate'
import { posOf, sortedDeck } from './decks'
import { EXAMPLES, SEED } from './experiments'
import { METRICS, metricByKey } from './metrics'
import { OPS, OP_COST, isOpKey, type OpKey } from './moves'
import { passWith } from './scoring'
import { TRACK_COLORS, emptySlots, toggleTracked } from './tracking'

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

  test('random-deck ordering matches its anchor (mean ≈ 50)', () => {
    const measure = metricByKey('ordering').measure!
    const vals = mixedDecks(800).map((deck) => measure(deck, 99, []))
    const mean = vals.reduce((total, value) => total + value, 0) / vals.length
    expect(Math.abs(mean - 50)).toBeLessThanOrEqual(2.5)
  })

  test('random-deck proximity matches its anchor (mean ≈ 5.8–5.9)', () => {
    const measure = metricByKey('proximity').measure!
    const vals = mixedDecks(800).map((deck) => measure(deck, 99, []))
    const mean = vals.reduce((total, value) => total + value, 0) / vals.length
    expect(Math.abs(mean - 5.85)).toBeLessThanOrEqual(0.6)
  })
})

describe('metric & calibration structure', () => {
  test('every metric has the required fields', () => {
    for (const metric of METRICS) {
      expect(metric.title, metric.key).toBeTruthy()
      expect(metric.desc, metric.key).toBeTruthy()
      // position and classifier are accumulated across a batch of trials, not per deck
      const fnOk = typeof metric.measure === 'function' || (metric.measure === null && (metric.key === 'position' || metric.key === 'classifier'))
      expect(fnOk, metric.key).toBe(true)
      expect(['high', 'low', 'two', 'band']).toContain(metric.side)
    }
  })

  test('metric descriptions stay near the ~30-word budget', () => {
    // Depth belongs on the write-up pages, not inline.
    for (const metric of METRICS) {
      const words = metric.desc.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length
      expect(words, metric.key).toBeLessThanOrEqual(45)
    }
  })

  test('band-side metrics (proximity, drift, clump) define hi/lo after calibration', () => {
    const base = getBase(99)
    for (const metric of METRICS.filter((candidate) => candidate.side === 'band')) {
      const baseline = base[metric.key]
      expect(Number.isFinite(baseline.high), metric.key).toBe(true)
      expect(Number.isFinite(baseline.low), metric.key).toBe(true)
      expect(baseline.low!, metric.key).toBeLessThan(baseline.high!)
    }
  })

  test('proximity band is asymmetric: rate-based low side tighter than per-deck high side', () => {
    const proximity = getBase(99).proximity
    expect(proximity.mean - proximity.low!).toBeLessThan(proximity.high! - proximity.mean)
  })

  test('end retention band is a rate (much tighter than one per-deck sd)', () => {
    const endRetention = getBase(99).endret
    expect(Number.isFinite(endRetention.threshold)).toBe(true)
    expect(endRetention.threshold).toBeLessThan(endRetention.standardDeviation)
  })
})

describe('cost accounting', () => {
  test('move costs match the ratified units (M/T/B = 1, O = 2, P = 4)', () => {
    expect(OP_COST).toEqual({ mash: 1, ohr: 1, ohb: 1, overhand: 2, pile: 4 })
  })
})

describe('tracking (fixed-slot semantics)', () => {
  test('removing a card does not renumber the others', () => {
    let list = emptySlots()
    list = toggleTracked(list, 1)
    list = toggleTracked(list, 2)
    list = toggleTracked(list, 3)
    expect([list.indexOf(1), list.indexOf(2), list.indexOf(3)]).toEqual([0, 1, 2])
    list = toggleTracked(list, 2)
    expect(list.indexOf(1)).toBe(0)
    expect(list.indexOf(3)).toBe(2)
    list = toggleTracked(list, 4)
    expect(list.indexOf(4)).toBe(1) // fills the freed slot
  })

  test('a 7th card evicts the oldest (slot 0), not the newest', () => {
    let list = emptySlots()
    for (let card = 1; card <= TRACK_COLORS.length; card++) list = toggleTracked(list, card)
    list = toggleTracked(list, 7)
    expect(list.indexOf(1)).toBe(-1)
    expect(list.indexOf(7)).toBe(0)
    expect(list.indexOf(6)).toBe(5)
  })
})

describe('seeded methods', () => {
  const all = SEED.concat(EXAMPLES)

  test('every seeded method has a non-empty sequence of known moves', () => {
    for (const exp of all) {
      expect(exp.seq.length, exp.title).toBeGreaterThan(0)
      for (const op of exp.seq) expect(isOpKey(op), `${exp.title}: ${op}`).toBe(true)
    }
  })

  test('every method title is unique', () => {
    const titles = all.map((experiment) => experiment.title)
    expect(new Set(titles).size).toBe(titles.length)
  })

  test('the recommended any-start method (8 mashes) clears the core battery from sorted', () => {
    // Judged on trial averages, the same way the simulator judges pass/fail.
    const deckSize = 99
    const seq: OpKey[] = Array(8).fill('mash')
    const base = getBase(deckSize)
    const core = METRICS.filter((metric) => metric.core && metric.measure)
    const sums: Record<string, number> = {}
    const trials = 300
    for (let trial = 0; trial < trials; trial++) {
      const deck = runSeq(seq, deckSize)
      for (const metric of core) sums[metric.key] = (sums[metric.key] ?? 0) + metric.measure!(deck, deckSize, [])
    }
    for (const metric of core) {
      const avg = sums[metric.key] / trials
      expect(passWith(metric, avg, base), `8 mashes fail ${metric.title} (avg ${avg.toFixed(3)})`).toBe(true)
    }
  })
})

test('posOf inverts a deck', () => {
  const deck = [2, 0, 1]
  expect(posOf(deck)).toEqual([1, 2, 0])
})
