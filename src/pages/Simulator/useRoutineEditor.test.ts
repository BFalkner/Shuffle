import { describe, expect, test } from 'vitest'
import type { OpKey } from '../../engine/moves'
import { caretAfterChange } from './useRoutineEditor'

const moves = (text: string): OpKey[] => [...text].map((letter) => ({ m: 'mash', p: 'pile', t: 'ohr' })[letter] as OpKey)

describe('caret after undo and redo', () => {
  test('undoing an insert puts the caret where the move was', () => {
    expect(caretAfterChange(moves('mtm'), moves('mm'))).toBe(1)
  })

  test('redoing an insert puts the caret after the move', () => {
    expect(caretAfterChange(moves('mm'), moves('mtm'))).toBe(2)
  })

  test('an insert into a run of the same move lands at the end of the run', () => {
    expect(caretAfterChange(moves('mm'), moves('mmm'))).toBe(3)
  })

  test('undoing a delete puts the caret after the restored move', () => {
    expect(caretAfterChange(moves('mm'), moves('mpm'))).toBe(2)
  })

  test('replacing everything puts the caret at the end', () => {
    expect(caretAfterChange(moves('mm'), moves('ppp'))).toBe(3)
  })
})
