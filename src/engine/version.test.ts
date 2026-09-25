// Fails when simulation results change, so the engine version and the claims log stay honest. See version.ts.
import { afterAll, expect, test } from 'vitest'
import { BASELINES } from './baselines.ts'
import { calibrate } from './calibrate.ts'
import { DECK_KINDS } from './decks.ts'
import type { OpKey } from './moves.ts'
import { canonicalJson, hash, seed } from './seeded.ts'
import { computeResult } from './simulate.ts'
import { ENGINE_FINGERPRINT, ENGINE_VERSION } from './version.ts'

const realRandom = Math.random
afterAll(() => {
  Math.random = realRandom
})

test(`engine output matches version ${ENGINE_VERSION}`, () => {
  seed(20260924)
  // A 60-card deck: no other test uses this size, so the classifier cache starts empty here. The stored baselines are
  // part of the output, so regenerating them counts as an engine change.
  const routine: OpKey[] = ['mash', 'overhand', 'pile', 'ohr', 'ohb', 'mash']
  const output = {
    calibration: calibrate(60, 50),
    baselines: BASELINES,
    runs: DECK_KINDS.map(({ value }) => computeResult(value, 60, routine).avg),
  }
  const fingerprint = hash(canonicalJson(output))
  expect(
    fingerprint,
    `Engine output changed. If that was intended, set ENGINE_VERSION to ${ENGINE_VERSION + 1} and ENGINE_FINGERPRINT to '${fingerprint}' in version.ts, then recheck the claims in docs/claims.md.`,
  ).toBe(ENGINE_FINGERPRINT)
})
