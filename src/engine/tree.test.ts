import { describe, expect, test } from 'vitest'
import { sortedDeck, startDeck } from './decks.ts'
import { OPS, type Deck, type OpKey } from './moves.ts'
import { OP_COST, compressSeq } from './routines.ts'
import { T_TOTAL, computeResult, scoreDecks, scoreResult } from './simulate.ts'
import { walkRoutines } from './tree.ts'

/** Every routine of `moves` costing at most maxCost, listed one by one. */
function listRoutines(moves: OpKey[], maxCost: number, seq: OpKey[] = [], cost = 0): OpKey[][] {
  return moves
    .filter((op) => cost + OP_COST[op] <= maxCost)
    .flatMap((op) => [[...seq, op], ...listRoutines(moves, maxCost, [...seq, op], cost + OP_COST[op])])
}

describe('walkRoutines', () => {
  test('visits the prefix and every routine that extends it within the cost, once each', () => {
    const moves: OpKey[] = ['mash', 'pile', 'ohr']
    const visited: string[] = []
    walkRoutines([sortedDeck(20)], [], moves, 6, true, (seq) => visited.push(compressSeq(seq)))
    const expected = [[], ...listRoutines(moves, 6)].map(compressSeq)
    expect(visited.toSorted()).toEqual(expected.toSorted())
    expect(new Set(visited).size).toBe(visited.length)
  })

  test('without descend, visits only the prefix', () => {
    const visited: OpKey[][] = []
    walkRoutines([sortedDeck(20)], ['mash', 'pile'], ['mash'], 7, false, (seq) => visited.push(seq))
    expect(visited).toEqual([['mash', 'pile']])
  })

  test('each routine gets the decks it would get dealt on its own', () => {
    // The pile draws no random numbers, so dealing it through the tree and on its own must agree card for card.
    const starts = Array.from({ length: 5 }, () => startDeck('played', 99))
    walkRoutines(starts, ['pile'], ['pile'], 12, true, (seq, decks) => {
      const dealt = starts.map((start) => seq.reduce((deck: Deck, op) => OPS[op](deck), start))
      expect(decks, compressSeq(seq)).toEqual(dealt)
    })
  })
})

describe('scoreDecks', () => {
  test('scores dealt decks as computeResult scores the same routine', () => {
    const starts = Array.from({ length: T_TOTAL }, () => sortedDeck(99))
    walkRoutines(starts, ['pile'], [], 4, false, (_seq, decks) => {
      const direct = scoreResult(computeResult('sorted', 99, ['pile'], 'ends'))
      const dealt = scoreDecks(decks, starts)
      expect(dealt.total).toBeCloseTo(direct.total, 6)
      expect(dealt.clearCount).toBe(direct.clearCount)
    })
  })
})
