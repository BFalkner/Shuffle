import { describe, expect, test } from 'vitest'
import { TRACK_COLORS, emptySlots, toggleTracked } from './tracking'

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
