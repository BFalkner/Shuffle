// Recommendation search: score every routine up to a cost limit, then rerun the leaders from every starting deck.
// This reproduces the numbers behind the home page recommendations and footnote.
//
// Usage: npm run search -- [--max-cost 7] [--from played] [--size 99] [--leaders 32] [--leader-runs 5] [--finalists 6] [--final-runs 20]
import { parseArgs } from 'node:util'
import { DECK_KINDS, type DeckKind } from '../src/engine/decks.ts'
import { OPS, OP_COST, compressSeq, type OpKey } from '../src/engine/moves.ts'
import { computeResult, scoreResult } from '../src/engine/simulate.ts'

const { values } = parseArgs({
  options: {
    'max-cost': { type: 'string', default: '7' },
    from: { type: 'string', default: 'played' },
    size: { type: 'string', default: '99' },
    leaders: { type: 'string', default: '32' },
    'leader-runs': { type: 'string', default: '5' },
    finalists: { type: 'string', default: '6' },
    'final-runs': { type: 'string', default: '20' },
  },
})
const maxCost = Number(values['max-cost'])
const from = values.from as DeckKind
const deckSize = Number(values.size)
const leaderCount = Number(values.leaders)
const leaderRuns = Number(values['leader-runs'])
const finalistCount = Number(values.finalists)
const finalRuns = Number(values['final-runs'])
const kinds = DECK_KINDS.map((deckKind) => deckKind.value)
if (!kinds.includes(from)) throw new Error(`--from must be one of: ${kinds.join(', ')}`)

const moves = Object.keys(OPS) as OpKey[]
const costOf = (seq: OpKey[]) => seq.reduce((total, op) => total + OP_COST[op], 0)
const label = (seq: OpKey[]) => `${compressSeq(seq)} (${costOf(seq)}u)`

/** Every sequence of moves whose total cost is at most maxCost. */
function allRoutines(): OpKey[][] {
  const routines: OpKey[][] = []
  const extend = (seq: OpKey[], cost: number) => {
    for (const op of moves) {
      if (cost + OP_COST[op] > maxCost) continue
      const next = [...seq, op]
      routines.push(next)
      extend(next, cost + OP_COST[op])
    }
  }
  extend([], 0)
  return routines
}

/** How many of `runs` runs from `kind` clear every test. */
function cleanRuns(seq: OpKey[], kind: DeckKind, runs: number): number {
  let clean = 0
  for (let run = 0; run < runs; run++) if (scoreResult(computeResult(kind, deckSize, seq, 'ends')).fails.length === 0) clean++
  return clean
}

const started = Date.now()
const elapsed = () => `${Math.round((Date.now() - started) / 1000)}s`

// Stage 1: one run of every routine from the chosen deck.
const routines = allRoutines()
console.log(`Stage 1: ${routines.length} routines costing up to ${maxCost} units, one run each from the ${from} deck (${deckSize} cards).`)
const scored = routines.map((seq, index) => {
  if (index % 500 === 0) process.stdout.write(`  ${index}/${routines.length} ${elapsed()}\r`)
  const result = scoreResult(computeResult(from, deckSize, seq, 'ends'))
  return { seq, passCount: result.passCount, score: result.score }
})
scored.sort((a, b) => b.passCount - a.passCount || b.score - a.score || costOf(a.seq) - costOf(b.seq))
process.stdout.write('\r' + ' '.repeat(40) + '\r')
console.log(`  done in ${elapsed()}. ${scored.filter((entry) => entry.passCount === 12).length} routines cleared every test in their one run.`)

// Stage 2: rerun the leaders from every starting deck.
const leaders = scored.slice(0, leaderCount)
console.log(`\nStage 2: the top ${leaders.length}, ${leaderRuns} runs from each starting deck.`)
const stage2 = leaders.map(({ seq }) => {
  const perDeck = kinds.map((kind) => cleanRuns(seq, kind, leaderRuns))
  return { seq, perDeck, total: perDeck.reduce((a, b) => a + b, 0) }
})
stage2.sort((a, b) => b.total - a.total || costOf(a.seq) - costOf(b.seq))
for (const { seq, perDeck } of stage2) console.log(`  ${label(seq).padEnd(28)} ${kinds.map((kind, i) => `${kind} ${perDeck[i]}/${leaderRuns}`).join('  ')}`)
console.log(`  done in ${elapsed()}.`)

// Stage 3: the finalists, many runs each.
const finalists = stage2.slice(0, finalistCount)
console.log(`\nStage 3: the top ${finalists.length}, ${finalRuns} runs from each starting deck. Counts are runs that cleared every test.`)
for (const { seq } of finalists) {
  const perDeck = kinds.map((kind) => cleanRuns(seq, kind, finalRuns))
  console.log(`  ${label(seq).padEnd(28)} ${kinds.map((kind, i) => `${kind} ${perDeck[i]}/${finalRuns}`).join('  ')}`)
}
console.log(`\nFinished in ${elapsed()}.`)
