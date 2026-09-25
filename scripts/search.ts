// Recommendation search: score every routine up to a cost limit, then rerun the leaders from every starting deck.
// This reproduces the numbers behind the home page recommendations and footnote.
//
// Usage: npm run search -- [--max-cost 7] [--from played] [--size 99] [--leaders 32] [--leader-runs 5] [--finalists 6] [--final-runs 200] [--decks played] [--json file]
//        npm run search -- --routine "M×4·P·M×4" [--routine M×8 ...] [--final-runs 200]   (skip the search, test these)
//
// --decks limits which starting decks are run and ranked (comma-separated). A routine is ranked by its weakest listed
// deck, so with all four the sorted deck usually decides. For a between-games routine, use --from played --decks played.
import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { DECK_KINDS, fisher, type DeckKind } from '../src/engine/decks.ts'
import { METRICS } from '../src/engine/metrics.ts'
import { OPS, OP_COST, compressSeq, parseRoutine, type OpKey } from '../src/engine/moves.ts'
import { testDegree } from '../src/engine/scoring.ts'
import { computeResult, scoreResult, type MethodResult } from '../src/engine/simulate.ts'

const { values } = parseArgs({
  options: {
    'max-cost': { type: 'string', default: '7' },
    decks: { type: 'string' },
    from: { type: 'string', default: 'played' },
    size: { type: 'string', default: '99' },
    leaders: { type: 'string', default: '32' },
    'leader-runs': { type: 'string', default: '5' },
    finalists: { type: 'string', default: '6' },
    'final-runs': { type: 'string', default: '200' },
    json: { type: 'string' },
    routine: { type: 'string', multiple: true },
  },
})
const maxCost = Number(values['max-cost'])
const from = values.from as DeckKind
const deckSize = Number(values.size)
const leaderCount = Number(values.leaders)
const leaderRuns = Number(values['leader-runs'])
const finalistCount = Number(values.finalists)
const finalRuns = Number(values['final-runs'])
const allKinds = DECK_KINDS.map((deckKind) => deckKind.value)
if (!allKinds.includes(from)) throw new Error(`--from must be one of: ${allKinds.join(', ')}`)
const kinds = values.decks ? (values.decks.split(',').map((kind) => kind.trim()) as DeckKind[]) : allKinds
for (const kind of kinds) if (!allKinds.includes(kind)) throw new Error(`--decks takes a comma-separated list of: ${allKinds.join(', ')}`)
const fromDecks = kinds.length === allKinds.length ? 'from each starting deck' : `from the ${kinds.join(' and ')} deck${kinds.length > 1 ? 's' : ''}`

const moves = Object.keys(OPS) as OpKey[]
const costOf = (seq: OpKey[]) => seq.reduce((total, op) => total + OP_COST[op], 0)
const label = (seq: OpKey[]) => `${compressSeq(seq)} (${costOf(seq)}u)`

const named = values.routine?.map(parseRoutine)

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

/** Each test's degree at the last step (0 random, 1 on the pass line, above 1 failing), and the worst of them. */
function degrees(result: MethodResult) {
  const perTest = METRICS.map((metric) => ({ title: metric.title, degree: testDegree(metric, result.avg[metric.key][result.moveCount], result.base) }))
  const worst = perTest.reduce((a, b) => (b.degree > a.degree ? b : a))
  return { perTest, worst }
}

interface DeckStats {
  clean: number
  runs: number
  /** runs that failed each test, by test title */
  fails: Record<string, number>
  /** the worst test's degree in each run */
  worst: number[]
  /** how often each test was the worst one, by test title */
  worstTest: Record<string, number>
  /** each test's degree in each run, by test title */
  degree: Record<string, number[]>
}

type Apply = Parameters<typeof computeResult>[4]

/** Run a routine `runs` times from `kind` and collect pass counts, failing tests and degrees. */
function deckStats(seq: OpKey[], kind: DeckKind, runs: number, apply?: Apply): DeckStats {
  const stats: DeckStats = { clean: 0, runs, fails: {}, worst: [], worstTest: {}, degree: {} }
  METRICS.forEach((metric) => (stats.degree[metric.title] = []))
  for (let run = 0; run < runs; run++) {
    const result = computeResult(kind, deckSize, seq, 'ends', apply)
    const scored = scoreResult(result)
    if (scored.fails.length === 0) stats.clean++
    scored.fails.forEach((title) => (stats.fails[title] = (stats.fails[title] ?? 0) + 1))
    const { perTest, worst } = degrees(result)
    perTest.forEach(({ title, degree }) => stats.degree[title].push(degree))
    stats.worst.push(worst.degree)
    stats.worstTest[worst.title] = (stats.worstTest[worst.title] ?? 0) + 1
  }
  return stats
}

/**
 * A routine's results from every starting deck. It is judged by its weakest deck: the one whose worst-test degree is
 * highest on average. The mean across decks and the pass counts break ties.
 */
function routineStats(seq: OpKey[], runs: number, apply?: Apply) {
  const perDeck = kinds.map((kind) => deckStats(seq, kind, runs, apply))
  const means = perDeck.map((stats) => mean(stats.worst))
  const total = perDeck.reduce((sum, stats) => sum + stats.clean, 0)
  return { seq, perDeck, weakest: Math.max(...means), overall: mean(means), total }
}

type Ranked = ReturnType<typeof routineStats>
const byWeakestDeck = (a: Ranked, b: Ranked) => a.weakest - b.weakest || a.overall - b.overall || b.total - a.total || costOf(a.seq) - costOf(b.seq)

const tally = (counts: Record<string, number>) =>
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([title, count]) => `${title} ${count}`)
    .join(', ')

/** The detail line for one starting deck: pass rate with its interval, worst-test degree, the tests closest to failing, and failures. */
function deckLine(kind: DeckKind, stats: DeckStats): string {
  const [low, high] = wilson(stats.clean, stats.runs)
  const closest = Object.entries(stats.degree)
    .map(([title, xs]) => ({ title, avg: mean(xs) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 2)
    .map(({ title, avg }) => `${title} ${avg.toFixed(2)}`)
    .join(', ')
  const fails = tally(stats.fails)
  return [
    `    ${kind.padEnd(7)} ${`${stats.clean}/${stats.runs}`.padStart(7)}  (${Math.round(low)}–${Math.round(high)}%)`.padEnd(32),
    `degree ${mean(stats.worst).toFixed(2)} ± ${sd(stats.worst).toFixed(2)}`.padEnd(22),
    `closest: ${closest}`.padEnd(52),
    fails ? `fails: ${fails}` : '',
  ].join('')
}

const started = Date.now()
const elapsed = () => `${Math.round((Date.now() - started) / 1000)}s`
const progress = (done: number, of: number) => process.stdout.write(`  ${done}/${of} ${elapsed()}\r`)
const clearProgress = () => process.stdout.write('\r' + ' '.repeat(40) + '\r')

/** Stages 1 and 2: score every routine from one deck, then rerun the leaders from every deck. Returns stage 2, ranked. */
function search(): Ranked[] {
  // Stage 1: one run of every routine from the chosen deck, ranked by its worst test's degree.
  const routines = allRoutines()
  console.log(`Stage 1: ${routines.length} routines costing up to ${maxCost} units, one run each from the ${from} deck (${deckSize} cards).`)
  const scored = routines.map((seq, index) => {
    if (index % 500 === 0) progress(index, routines.length)
    return { seq, worst: degrees(computeResult(from, deckSize, seq, 'ends')).worst.degree }
  })
  scored.sort((a, b) => a.worst - b.worst || costOf(a.seq) - costOf(b.seq))
  clearProgress()
  console.log(`  done in ${elapsed()}. ${scored.filter((entry) => entry.worst <= 1).length} routines cleared every test in their one run.`)

  // Stage 2: rerun the leaders from every starting deck.
  const leaders = scored.slice(0, leaderCount)
  console.log(`\nStage 2: the top ${leaders.length}, ${leaderRuns} runs ${fromDecks}, ranked by the weakest deck.`)
  console.log(`  Each deck shows the worst test's degree (mean ± SD), then the runs that cleared every test.`)
  const stage2 = leaders.map(({ seq }, index) => {
    progress(index, leaders.length)
    return routineStats(seq, leaderRuns)
  })
  stage2.sort(byWeakestDeck)
  clearProgress()
  const deckBrief = (stats: DeckStats) => `${mean(stats.worst).toFixed(2)}±${sd(stats.worst).toFixed(2)} ${stats.clean}/${stats.runs}`
  const shown = stage2.slice(0, Math.max(finalistCount, 30))
  for (const { seq, perDeck } of shown) console.log(`  ${label(seq).padEnd(30)} ${kinds.map((kind, i) => `${kind} ${deckBrief(perDeck[i])}`.padEnd(24)).join('')}`)
  if (stage2.length > shown.length) console.log(`  … and ${stage2.length - shown.length} more.`)
  console.log(`  done in ${elapsed()}.`)
  return stage2
}

// With --routines, skip the search and run stage 3 on the named routines.
const stage2 = named ? [] : search()
const finalists = named ?? stage2.slice(0, finalistCount).map(({ seq }) => seq)
console.log(`${named ? '' : '\n'}Stage 3: ${named ? 'the named routines' : `the top ${finalists.length}`}, ${finalRuns} runs ${fromDecks}, ranked by the weakest deck.`)
const stage3 = finalists.map((seq, index) => {
  progress(index, finalists.length)
  return routineStats(seq, finalRuns)
})
stage3.sort(byWeakestDeck)
// Reference: one perfect shuffle, measured the same way. A random deck's worst test isn't 0, because it's the largest
// of thirteen noisy readings, so this shows the floor the finalists are compared against.
const reference = routineStats(['mash'], finalRuns, (deck) => fisher(deck.length))
clearProgress()
console.log(`  A test's degree is how far it sits from a random deck's average, as a fraction of the way to its pass line:`)
console.log(`  0 is random, 1 is the pass line, and above 1 fails. "degree" is the worst test's degree in each run, mean ± SD.`)
console.log(`  A high mean with a small SD is reliably a little off. A lower mean with a large SD is usually fine but`)
console.log(`  sometimes far off. "closest" lists the two tests with the highest average degree. Pass counts have a 95% interval.\n`)
console.log(`  Perfect shuffle (reference: a truly random deck)  weakest deck degree ${reference.weakest.toFixed(2)}, passed ${reference.total}/${finalRuns * kinds.length}`)
kinds.forEach((kind, i) => console.log(deckLine(kind, reference.perDeck[i])))
for (const { seq, perDeck, weakest, total } of stage3) {
  console.log(`  ${label(seq)}  weakest deck degree ${weakest.toFixed(2)}, passed ${total}/${finalRuns * kinds.length}`)
  kinds.forEach((kind, i) => console.log(deckLine(kind, perDeck[i])))
}
console.log(`\nFinished in ${elapsed()}.`)

if (values.json) {
  const spread = (xs: number[]) => ({ mean: mean(xs), sd: sd(xs), max: Math.max(...xs) })
  const summarise = ({ seq, perDeck, weakest, overall, total }: Ranked) => ({
    routine: compressSeq(seq),
    cost: costOf(seq),
    weakest,
    overall,
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
            worst: spread(stats.worst),
            worstTest: stats.worstTest,
            degree: Object.fromEntries(Object.entries(stats.degree).map(([title, xs]) => [title, spread(xs)])),
          },
        ]
      }),
    ),
  })
  const options = { maxCost, from, decks: kinds, deckSize, leaderCount, leaderRuns, finalistCount, finalRuns }
  writeFileSync(values.json, JSON.stringify({ options, seconds: (Date.now() - started) / 1000, reference: summarise(reference), stage2: stage2.map(summarise), stage3: stage3.map(summarise) }, null, 2))
  console.log(`Wrote ${values.json}.`)
}
