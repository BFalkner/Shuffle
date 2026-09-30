import { describe, expect, test } from 'vitest'
import type { OpKey } from '../../engine/moves'
import { caretAfterChange, moveWithin } from './useRoutineEditor'

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

describe('moving a move within the routine', () => {
  test('dragging a move earlier lands it before the target', () => {
    expect(moveWithin(moves('mmtp'), 3, 1, 'before')).toEqual({ seq: moves('mpmt'), at: 1 })
  })

  test('dragging a move later lands it after the target', () => {
    expect(moveWithin(moves('pmmt'), 0, 2, 'after')).toEqual({ seq: moves('mmpt'), at: 2 })
  })

  test('dropping a move beside itself changes nothing', () => {
    expect(moveWithin(moves('mpt'), 1, 1, 'after').seq).toEqual(moves('mpt'))
    expect(moveWithin(moves('mpt'), 1, 2, 'before').seq).toEqual(moves('mpt'))
  })
})
