import { afterEach, describe, expect, test } from 'vitest'
import { isOpKey } from '../../engine/moves'
import { SEED, loadExperiments, methodName } from './experiments'

describe('seeded methods', () => {
  const all = SEED.map((experiment) => ({ id: '', ...experiment }))

  test('every seeded method has a non-empty sequence of known moves', () => {
    for (const experiment of all) {
      expect(experiment.seq.length, methodName(experiment)).toBeGreaterThan(0)
      for (const op of experiment.seq) expect(isOpKey(op), `${methodName(experiment)}: ${op}`).toBe(true)
    }
  })

  test('every method name is unique', () => {
    const names = all.map(methodName)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('loading saved methods', () => {
  const storage = new Map<string, string>()
  const save = (entries: unknown, defaultsVersion?: number) => {
    storage.clear()
    storage.set('shuffleExperiments', JSON.stringify(entries))
    if (defaultsVersion !== undefined) storage.set('shuffleDefaultsVersion', String(defaultsVersion))
  }
  Object.assign(globalThis, { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) } })
  afterEach(() => storage.clear())

  test('an old title that only repeated the moves is dropped, so the name follows edits', () => {
    save([{ id: 'a', title: 'M×2·P', seq: ['mash', 'mash', 'pile'] }], 3)
    expect(loadExperiments()).toEqual([{ id: 'a', seq: ['mash', 'mash', 'pile'] }])
  })

  test('a typed title becomes the name, and old default titles become the short names', () => {
    save(
      [
        { id: 'a', title: 'My routine', seq: ['mash'] },
        { id: 'b', title: 'Between games — 3× Mash, Half overhand, 2× Mash', seq: ['mash'] },
      ],
      3,
    )
    expect(loadExperiments().map((experiment) => experiment.name)).toEqual(['My routine', 'Between games'])
  })

  test('a list saved before the current defaults gets the missing defaults added, and keeps everything it had', () => {
    save([{ id: 'a', name: 'Mine', seq: ['pile'] }, { id: 'b', seq: SEED[0].seq }])
    const loaded = loadExperiments()
    expect(loaded.slice(0, 2).map((experiment) => experiment.id)).toEqual(['a', 'b'])
    expect(loaded.slice(2).map((experiment) => experiment.seq)).toEqual(SEED.slice(1).map((experiment) => experiment.seq))
  })

  test('unknown moves become overhands', () => {
    save([{ id: 'a', seq: ['mash', 'riffle'] }], 3)
    expect(loadExperiments()[0].seq).toEqual(['mash', 'overhand'])
  })
})
