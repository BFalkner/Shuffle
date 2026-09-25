// A seeded snapshot of the engine's output, so a change that only reorganises code can prove it changed no result.
// Each case reseeds Math.random from its name and hashes everything the engine produces for it. If a case fails and the change was
// meant to alter results, bump ENGINE_VERSION (see version.ts) and paste the new hashes the failure prints.
//
// Results depend on the order random numbers are drawn, including the draws behind cached data such as the
// classifier's random decks, so the cases run in a fixed order. Vitest gives each test file fresh modules, so the
// caches start empty here.
import { afterAll, expect, test } from 'vitest'
import { calibrate, getBase } from './calibrate.ts'
import { DECK_KINDS, sortedDeck } from './decks.ts'
import { METRICS } from './metrics.ts'
import { OPS, parseRoutine } from './moves.ts'
import { fmt, marginScale, passWith, testDegree } from './scoring.ts'
import { hash, seed } from './seeded.ts'
import { computeResult, scoreResult } from './simulate.ts'

const realRandom = Math.random
afterAll(() => {
  Math.random = realRandom
})

/** Hash of a value's JSON. Numbers print to full precision, so any change in any digit changes the hash. */
const hashOf = (value: unknown) => hash(JSON.stringify(value))

/** The cases, in the order they run. Each returns the output to hash. */
const CASES: [string, () => unknown][] = [
  // Every move, five times each from a sorted deck.
  ...Object.keys(OPS).map((op): [string, () => unknown] => [`move ${op}`, () => Array.from({ length: 5 }, () => OPS[op as keyof typeof OPS](sortedDeck(99)))]),
  ['calibrate 52 cards, 400 decks', () => calibrate(52, 400)],
  // Four routines that use every move, from every starting deck, measured at the start and the end.
  ...['M×8', 'M×4·P·M×4', 'M×3·OHt·M', 'OH×2·OHb·M×2'].flatMap((routine) =>
    DECK_KINDS.map(({ value: kind }): [string, () => unknown] => [
      `${routine} from ${kind}`,
      () => {
        const result = computeResult(kind, 99, parseRoutine(routine), 'ends')
        return { avg: result.avg, scored: scoreResult(result) }
      },
    ]),
  ),
  // What the pages read: each test's metadata, and its pass rule, degree and formatting across a range of values.
  ['test metadata', () => METRICS.map(({ measure, ...metadata }) => ({ ...metadata, perDeck: measure !== null }))],
  [
    'pass rules, degrees and formatting',
    () => {
      const base = getBase(99)
      return METRICS.map((metric) => {
        const baseline = base[metric.key]
        const spread = Math.max(baseline.standardDeviation, Math.abs(baseline.threshold), 1e-6)
        return Array.from({ length: 21 }, (_, step) => {
          const value = baseline.mean + ((step - 10) / 4) * spread
          return [passWith(metric, value, base), testDegree(metric, value, base), fmt(value, metric.key), marginScale(metric, baseline)]
        })
      })
    },
  ],
  // One routine measured at every step.
  [
    'M×3·OHt·M from played, every step',
    () => {
      const result = computeResult('played', 99, parseRoutine('M×3·OHt·M'), 'all')
      return { avg: result.avg, scored: scoreResult(result) }
    },
  ],
]

/** Expected hashes, one per case. Regenerate by clearing this and pasting what the failing test prints. */
const EXPECTED: Record<string, string> = {
  'move mash': 'fbeca4c3',
  'move overhand': '84a6ed35',
  'move pile': 'be2e6955',
  'move ohr': '488b7903',
  'move ohb': '9b6eeb47',
  'calibrate 52 cards, 400 decks': '9cafb038',
  'M×8 from sorted': '34603b10',
  'M×8 from weave': '20b0f0c2',
  'M×8 from lumpy': 'cc57e62d',
  'M×8 from played': 'cb47fa4c',
  'M×4·P·M×4 from sorted': 'ebfcc7a6',
  'M×4·P·M×4 from weave': '613f5958',
  'M×4·P·M×4 from lumpy': '74daf1d5',
  'M×4·P·M×4 from played': 'd8f9e543',
  'M×3·OHt·M from sorted': '16cdfaf6',
  'M×3·OHt·M from weave': '465cc4a1',
  'M×3·OHt·M from lumpy': '15c16fc0',
  'M×3·OHt·M from played': 'cfbda4ba',
  'OH×2·OHb·M×2 from sorted': '6a7992c4',
  'OH×2·OHb·M×2 from weave': 'b74a092d',
  'OH×2·OHb·M×2 from lumpy': '35f1d8a1',
  'OH×2·OHb·M×2 from played': 'ca2336e3',
  'test metadata': '9396135e',
  'pass rules, degrees and formatting': 'c9500e3d',
  'M×3·OHt·M from played, every step': 'cf59d190',
}

test('engine output matches the seeded snapshot', () => {
  const actual: Record<string, string> = {}
  CASES.forEach(([name, run]) => {
    // Seed from the case's name, so adding or reordering cases doesn't change the others' draws.
    seed(parseInt(hash(name), 16))
    actual[name] = hashOf(run())
  })
  expect(actual, `Engine output changed. If that was intended, paste this into EXPECTED in snapshot.test.ts:\n${JSON.stringify(actual, null, 2)}`).toEqual(EXPECTED)
}, 120000)
