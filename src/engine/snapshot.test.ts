// A seeded snapshot of the engine's output, so a change that only reorganises code can prove it changed no result.
// Each case reseeds Math.random from its name and hashes everything the engine produces for it. If a case fails and the change was
// meant to alter results, bump ENGINE_VERSION (see version.ts) and paste the new hashes the failure prints.
//
// Results depend on the order random numbers are drawn, including the draws behind cached data such as the
// classifier's random decks, so the cases run in a fixed order. Vitest gives each test file fresh modules, so the
// caches start empty here.
import { afterAll, expect, test } from 'vitest'
import { METRIC_TEXT } from '../pages/Simulator/metricText.ts'
import { calibrate, getBase } from './calibrate.ts'
import { DECK_KINDS, sortedDeck } from './decks.ts'
import { METRICS } from './metrics.ts'
import { OPS } from './moves.ts'
import { parseRoutine } from './routines.ts'
import { fmtLevel, level, noiseLevel, withinNoise } from './scoring.ts'
import { canonicalJson, hash, seed } from './seeded.ts'
import { computeResult, scoreResult } from './simulate.ts'

const realRandom = Math.random
afterAll(() => {
  Math.random = realRandom
})

/**
 * Hash of a value's JSON, with keys sorted so only values count. Numbers print to full precision, so any change in any
 * digit changes the hash.
 */
const hashOf = (value: unknown) => hash(canonicalJson(value))

/** The cases, in the order they run. Each returns the output to hash. */
const CASES: [string, () => unknown][] = [
  // Every move, five times each from a sorted deck.
  ...Object.keys(OPS).map((op): [string, () => unknown] => [`move ${op}`, () => Array.from({ length: 5 }, () => OPS[op as keyof typeof OPS](sortedDeck(99)))]),
  ['calibrate 52 cards, 20 batches', () => calibrate(52, 20)],
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
  // What the pages read: each metric's metadata, and its level, noise check and formatting across a range of values.
  // The description and write-up link live with the simulator page, so they're read from there.
  [
    'metric metadata',
    () => METRICS.map(({ key, category, title, trials, calibration }) => ({ key, category, title, trials, kind: calibration.kind, ...METRIC_TEXT[key] })),
  ],
  [
    'levels, noise and formatting',
    () => {
      const base = getBase(99)
      return METRICS.map((metric) => {
        const baseline = base[metric.key]
        const values = Array.from({ length: 21 }, (_, step) => baseline.mean + ((step - 4) / 16) * (baseline.sorted - baseline.mean))
        return { noise: noiseLevel(metric, base), values: values.map((value) => [level(metric, value, base), withinNoise(metric, value, base), fmtLevel(level(metric, value, base))]) }
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
  'calibrate 52 cards, 20 batches': '0477a21f',
  'M×8 from sorted': '3bfc9d46',
  'M×8 from played': '1acdf5b6',
  'M×4·P·M×4 from sorted': '6b32b078',
  'M×4·P·M×4 from played': '58f3787a',
  'M×3·OHt·M from sorted': '6b8fef2d',
  'M×3·OHt·M from played': '36ecc124',
  'OH×2·OHb·M×2 from sorted': '24922661',
  'OH×2·OHb·M×2 from played': 'a6e0cc8c',
  'metric metadata': 'd5ecfe74',
  'levels, noise and formatting': '89cea2a9',
  'M×3·OHt·M from played, every step': '3fea6ab6',
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
