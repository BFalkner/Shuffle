// Fails when simulation results change, so the engine version and the claims log stay honest. See version.ts.
import { afterAll, expect, test } from 'vitest'
import { calibrate } from './calibrate.ts'
import { DECK_KINDS } from './decks.ts'
import type { OpKey } from './moves.ts'
import { computeResult } from './simulate.ts'
import { ENGINE_FINGERPRINT, ENGINE_VERSION } from './version.ts'

const realRandom = Math.random
afterAll(() => {
  Math.random = realRandom
})

/** A seeded stand-in for Math.random (mulberry32), so every run draws the same numbers. */
function seed(state: number) {
  Math.random = () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a: a short, stable hash of the output. */
function hash(text: string): string {
  let result = 0x811c9dc5
  for (let i = 0; i < text.length; i++) result = Math.imul(result ^ text.charCodeAt(i), 0x01000193)
  return (result >>> 0).toString(16).padStart(8, '0')
}

test(`engine output matches version ${ENGINE_VERSION}`, () => {
  seed(20260924)
  // A 60-card deck: no other test uses this size, so the calibration and classifier caches start empty here.
  const routine: OpKey[] = ['mash', 'overhand', 'pile', 'ohr', 'ohb', 'mash']
  const output = {
    calibration: calibrate(60, 50),
    runs: DECK_KINDS.map(({ value }) => computeResult(value, 60, routine).avg),
  }
  const fingerprint = hash(JSON.stringify(output))
  expect(
    fingerprint,
    `Engine output changed. If that was intended, set ENGINE_VERSION to ${ENGINE_VERSION + 1} and ENGINE_FINGERPRINT to '${fingerprint}' in version.ts, then recheck the claims in docs/claims.md.`,
  ).toBe(ENGINE_FINGERPRINT)
})
