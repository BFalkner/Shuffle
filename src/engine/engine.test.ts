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

function runSeq(seq: OpKey[], n: number) {
  let d = sortedDeck(n)
  for (const op of seq) d = OPS[op](d)
  return d
}

describe('engine identity & conservation', () => {
  test('every move is a permutation (no card duplicated or lost)', () => {
    const n = 99
    for (const key of Object.keys(OPS) as OpKey[]) {
      const d = OPS[key](sortedDeck(n))
      expect(d, key).toHaveLength(n)
      expect(new Set(d).size, key).toBe(n)
    }
  })

  test('ohTop (ohr) never touches the bottom half', () => {
    // Regression: ohr once looked like it included a mash. Some suffix of the
    // output must be an exact, untouched copy of the input's tail.
    const n = 99
    for (let trial = 0; trial < 30; trial++) {
      const before = sortedDeck(n)
      const after = OPS.ohr(before)
      let matched = false
      for (let cut = 1; cut < n; cut++) {
        const bTail = before.slice(cut)
        if (JSON.stringify(bTail) === JSON.stringify(after.slice(n - bTail.length))) {
          matched = true
          break
        }
      }
      expect(matched).toBe(true)
    }
  })

  test('ohBottom (ohb) never touches the top half', () => {
    const n = 99
    for (let trial = 0; trial < 30; trial++) {
      const before = sortedDeck(n)
      const after = OPS.ohb(before)
      let matched = false
      for (let cut = 1; cut < n; cut++) {
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
    let d = sortedDeck(99)
    for (let i = 0; i < 12; i++) d = OPS.mash(d)
    expect(new Set(d).size).toBe(99)
  })

  const mixedDecks = (count: number) =>
    Array.from({ length: count }, () => runSeq(Array(8).fill('mash'), 99))

  test('random-deck ordering matches its anchor (mean ≈ 50)', () => {
    const fn = metricByKey('ordering').fn!
    const vals = mixedDecks(800).map((d) => fn(d, 99, []))
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length
    expect(Math.abs(mean - 50)).toBeLessThanOrEqual(2.5)
  })

  test('random-deck proximity matches its anchor (mean ≈ 5.8–5.9)', () => {
    const fn = metricByKey('proximity').fn!
    const vals = mixedDecks(800).map((d) => fn(d, 99, []))
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length
    expect(Math.abs(mean - 5.85)).toBeLessThanOrEqual(0.6)
  })
})

describe('metric & calibration structure', () => {
  test('every metric has the required fields', () => {
    for (const m of METRICS) {
      expect(m.title, m.k).toBeTruthy()
      expect(m.desc, m.k).toBeTruthy()
      // position and classifier are accumulated across a batch of trials, not per deck
      const fnOk = typeof m.fn === 'function' || (m.fn === null && (m.k === 'position' || m.k === 'classifier'))
      expect(fnOk, m.k).toBe(true)
      expect(['high', 'low', 'two', 'band']).toContain(m.side)
    }
  })

  test('metric descriptions stay near the ~30-word budget', () => {
    // Depth belongs on the write-up pages, not inline.
    for (const m of METRICS) {
      const words = m.desc.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length
      expect(words, m.k).toBeLessThanOrEqual(45)
    }
  })

  test('band-side metrics (proximity, drift, clump) define hi/lo after calibration', () => {
    const base = getBase(99)
    for (const m of METRICS.filter((x) => x.side === 'band')) {
      const b = base[m.k]
      expect(Number.isFinite(b.hi), m.k).toBe(true)
      expect(Number.isFinite(b.lo), m.k).toBe(true)
      expect(b.lo!, m.k).toBeLessThan(b.hi!)
    }
  })

  test('proximity band is asymmetric: rate-based low side tighter than per-deck high side', () => {
    const bp = getBase(99).proximity
    expect(bp.mean - bp.lo!).toBeLessThan(bp.hi! - bp.mean)
  })

  test('end retention band is a rate (much tighter than one per-deck sd)', () => {
    const be = getBase(99).endret
    expect(Number.isFinite(be.thr)).toBe(true)
    expect(be.thr).toBeLessThan(be.sd)
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
    for (let i = 1; i <= TRACK_COLORS.length; i++) list = toggleTracked(list, i)
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
    const titles = all.map((e) => e.title)
    expect(new Set(titles).size).toBe(titles.length)
  })

  test('the recommended any-start method (8 mashes) clears the core battery from sorted', () => {
    // Judged on trial averages, the same way the simulator judges pass/fail.
    const n = 99
    const seq: OpKey[] = Array(8).fill('mash')
    const base = getBase(n)
    const core = METRICS.filter((m) => m.core && m.fn)
    const sums: Record<string, number> = {}
    const T = 300
    for (let i = 0; i < T; i++) {
      const d = runSeq(seq, n)
      for (const m of core) sums[m.k] = (sums[m.k] ?? 0) + m.fn!(d, n, [])
    }
    for (const m of core) {
      const avg = sums[m.k] / T
      expect(passWith(m, avg, base), `8 mashes fail ${m.title} (avg ${avg.toFixed(3)})`).toBe(true)
    }
  })
})

test('posOf inverts a deck', () => {
  const d = [2, 0, 1]
  expect(posOf(d)).toEqual([1, 2, 0])
})
