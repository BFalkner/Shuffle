// Recommendation search: score every routine up to a cost limit, then rerun the leaders from every starting deck.
// This reproduces the numbers behind the home page recommendations and footnote.
//
// Usage: npm run search -- [--max-cost 7] [--from played] [--size 99] [--leaders 32] [--leader-runs 5] [--finalists 6] [--final-runs 200] [--json file]
import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { DECK_KINDS, type DeckKind } from '../src/engine/decks.ts'
import { METRICS, type Metric } from '../src/engine/metrics.ts'
import { OPS, OP_COST, compressSeq, type OpKey } from '../src/engine/moves.ts'
import { marginScale } from '../src/engine/scoring.ts'
import { computeResult, scoreResult, type MethodResult } from '../src/engine/simulate.ts'

const { values } = parseArgs({
  options: {
    'max-cost': { type: 'string', default: '7' },
    from: { type: 'string', default: 'played' },
    size: { type: 'string', default: '99' },
    leaders: { type: 'string', default: '32' },
    'leader-runs': { type: 'string', default: '5' },
    finalists: { type: 'string', default: '6' },
    'final-runs': { type: 'string', default: '200' },
    json: { type: 'string' },
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

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const sd = (xs: number[]) => {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1))
}

/** 95% Wilson interval for `clean` passes out of `runs`, as percentages. */
function wilson(clean: number, runs: number): [number, number] {
  const z = 1.96
  const p = clean / runs
  const centre = (p + (z * z) / (2 * runs)) / (1 + (z * z) / runs)
  const half = (z * Math.sqrt((p * (1 - p)) / runs + (z * z) / (4 * runs * runs))) / (1 + (z * z) / runs)
  return [Math.max(0, centre - half) * 100, Math.min(1, centre + half) * 100]
}

/**
 * How far a test's final value sits inside its pass line: 1 at the random-deck average, 0 on the line, negative when it
 * fails. Uses the same scale as the composite score.
 */
function headroom(metric: Metric, result: MethodResult): number {
  const value = result.avg[metric.key][result.moveCount]
  const baseline = result.base[metric.key]
  const scale = marginScale(metric, baseline) || 1
  if (metric.side === 'band') return Math.min(value - baseline.low!, baseline.high! - value) / scale
  if (metric.side === 'low') return (baseline.threshold - value) / scale
  if (metric.side === 'high') return (value - baseline.threshold) / scale
  return (baseline.threshold - Math.abs(value - baseline.mean)) / scale
}

interface DeckStats {
  clean: number
  runs: number
  /** runs that failed each test, by test title */
  fails: Record<string, number>
  scores: number[]
  /** headroom of each test in each run, by test title */
  headroom: Record<string, number[]>
}

/** Run a routine `runs` times from `kind` and collect pass counts, failing tests, scores and headroom. */
function deckStats(seq: OpKey[], kind: DeckKind, runs: number): DeckStats {
  const stats: DeckStats = { clean: 0, runs, fails: {}, scores: [], headroom: {} }
  METRICS.forEach((metric) => (stats.headroom[metric.title] = []))
  for (let run = 0; run < runs; run++) {
    const result = computeResult(kind, deckSize, seq, 'ends')
    const scored = scoreResult(result)
    if (scored.fails.length === 0) stats.clean++
    scored.fails.forEach((title) => (stats.fails[title] = (stats.fails[title] ?? 0) + 1))
    stats.scores.push(scored.score)
    METRICS.forEach((metric) => stats.headroom[metric.title].push(headroom(metric, result)))
  }
  return stats
}

/** A routine's results from every starting deck, with its weakest deck and total for ranking. */
function routineStats(seq: OpKey[], runs: number) {
  const perDeck = kinds.map((kind) => deckStats(seq, kind, runs))
  const cleans = perDeck.map((stats) => stats.clean)
  return { seq, perDeck, worst: Math.min(...cleans), total: cleans.reduce((a, b) => a + b, 0) }
}

// A recommendation has to work from every starting deck, so rank by the weakest deck first.
type Ranked = ReturnType<typeof routineStats>
const byWorstDeck = (a: Ranked, b: Ranked) => b.worst - a.worst || b.total - a.total || costOf(a.seq) - costOf(b.seq)

const pct = (x: number) => `${Math.round(x * 100)}%`

/** The detail lines for one starting deck: pass rate with its interval, score, the tightest test and any failures. */
function deckLine(kind: DeckKind, stats: DeckStats): string {
  const [low, high] = wilson(stats.clean, stats.runs)
  const tightest = Object.entries(stats.headroom)
    .map(([title, xs]) => ({ title, avg: mean(xs) }))
    .sort((a, b) => a.avg - b.avg)[0]
  const fails = Object.entries(stats.fails)
    .sort((a, b) => b[1] - a[1])
    .map(([title, count]) => `${title} ${count}`)
    .join(', ')
  return [
    `    ${kind.padEnd(7)} ${`${stats.clean}/${stats.runs}`.padStart(5)}  (${Math.round(low)}–${Math.round(high)}%)`.padEnd(30),
    `score ${mean(stats.scores).toFixed(2)} ± ${sd(stats.scores).toFixed(2)}`,
    `  tightest ${tightest.title} ${pct(tightest.avg)}`.padEnd(38),
    fails ? `  fails: ${fails}` : '',
  ].join('')
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
console.log(`  done in ${elapsed()}. ${scored.filter((entry) => entry.passCount === METRICS.length).length} routines cleared every test in their one run.`)

// Stage 2: rerun the leaders from every starting deck.
const leaders = scored.slice(0, leaderCount)
console.log(`\nStage 2: the top ${leaders.length}, ${leaderRuns} runs from each starting deck, ranked by the weakest deck.`)
const stage2 = leaders.map(({ seq }, index) => {
  process.stdout.write(`  ${index}/${leaders.length} ${elapsed()}\r`)
  return routineStats(seq, leaderRuns)
})
stage2.sort(byWorstDeck)
process.stdout.write('\r' + ' '.repeat(40) + '\r')
const stage2Shown = stage2.slice(0, Math.max(finalistCount, 30))
for (const { seq, perDeck } of stage2Shown) console.log(`  ${label(seq).padEnd(30)} ${kinds.map((kind, i) => `${kind} ${perDeck[i].clean}/${leaderRuns}`).join('  ')}`)
if (stage2.length > stage2Shown.length) console.log(`  … and ${stage2.length - stage2Shown.length} more.`)
console.log(`  done in ${elapsed()}.`)

// Stage 3: the finalists, many runs each, ranked on their own results.
const finalists = stage2.slice(0, finalistCount)
console.log(`\nStage 3: the top ${finalists.length}, ${finalRuns} runs from each starting deck, ranked by the weakest deck.`)
const stage3 = finalists.map(({ seq }, index) => {
  process.stdout.write(`  ${index}/${finalists.length} ${elapsed()}\r`)
  return routineStats(seq, finalRuns)
})
stage3.sort(byWorstDeck)
process.stdout.write('\r' + ' '.repeat(40) + '\r')
console.log(`  Pass counts are runs that cleared every test, with a 95% interval. Score is the composite score, mean ± SD.`)
console.log(`  Tightest is the test with the least headroom on average: 100% is a random deck's average, 0% is the pass line.\n`)
for (const { seq, perDeck, worst, total } of stage3) {
  console.log(`  ${label(seq)}  weakest ${worst}/${finalRuns}, total ${total}/${finalRuns * kinds.length}`)
  kinds.forEach((kind, i) => console.log(deckLine(kind, perDeck[i])))
}
console.log(`\nFinished in ${elapsed()}.`)

if (values.json) {
  const summarise = ({ seq, perDeck, worst, total }: Ranked) => ({
    routine: compressSeq(seq),
    cost: costOf(seq),
    worst,
    total,
    decks: Object.fromEntries(
      kinds.map((kind, i) => {
        const stats = perDeck[i]
        return [
          kind,
          {
            clean: stats.clean,
            runs: stats.runs,
            interval: wilson(stats.clean, stats.runs),
            fails: stats.fails,
            score: { mean: mean(stats.scores), sd: sd(stats.scores) },
            headroom: Object.fromEntries(Object.entries(stats.headroom).map(([title, xs]) => [title, { mean: mean(xs), sd: sd(xs), min: Math.min(...xs) }])),
          },
        ]
      }),
    ),
  })
  const options = { maxCost, from, deckSize, leaderCount, leaderRuns, finalistCount, finalRuns }
  writeFileSync(values.json, JSON.stringify({ options, seconds: (Date.now() - started) / 1000, stage2: stage2.map(summarise), stage3: stage3.map(summarise) }, null, 2))
  console.log(`Wrote ${values.json}.`)
}
