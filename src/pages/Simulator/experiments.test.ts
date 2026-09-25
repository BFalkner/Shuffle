import { describe, expect, test } from 'vitest'
import { isOpKey } from '../../engine/moves'
import { EXAMPLES, SEED } from './experiments'

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
})
