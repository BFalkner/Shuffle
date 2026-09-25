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
import { METRICS, type MetricKey } from '../src/engine/metrics.ts'
import { OPS, OP_COST, compressSeq, type OpKey } from '../src/engine/moves.ts'
import { noticeableDegree, testDegree } from '../src/engine/scoring.ts'
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

const TOKEN_OP: Record<string, OpKey> = { m: 'mash', oh: 'overhand', p: 'pile', oht: 'ohr', ohb: 'ohb' }

/** Parse a routine written like the search prints it: "M×4·P·M×4". Also accepts spaces or commas, and x or * for ×. */
function parseRoutine(text: string): OpKey[] {
  return text
    .split(/[·\s,]+/)
    .filter(Boolean)
    .flatMap((token) => {
      const match = /^(oht|ohb|oh|m|p)(?:[×x*](\d+))?$/i.exec(token)
      if (!match) throw new Error(`Unknown move "${token}" in "${text}". Use M, OH, P, OHt or OHb, with ×n to repeat.`)
      return Array<OpKey>(Number(match[2] ?? 1)).fill(TOKEN_OP[match[1].toLowerCase()])
    })
}
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

/**
 * Each test's degree at the last step (0 random, 1 on the pass line, above 1 failing), the worst of them, and the worst
 * noticeable degree: only failures a player would see at the table (see Metric.noticeable).
 */
function degrees(result: MethodResult) {
  const valueOf = (key: MetricKey) => result.avg[key][result.moveCount]
  const perTest = METRICS.map((metric) => ({
    title: metric.title,
    degree: testDegree(metric, valueOf(metric.key), result.base),
    noticed: noticeableDegree(metric, valueOf(metric.key), result.base),
  }))
  const worst = perTest.reduce((a, b) => (b.degree > a.degree ? b : a))
  const worstNoticed = perTest.reduce((a, b) => (b.noticed > a.noticed ? b : a))
  return { perTest, worst, worstNoticed }
}

interface DeckStats {
  /** runs that cleared every test */
  clean: number
  /** runs with no noticeable failure */
  noticedClean: number
  runs: number
  /** runs that failed each test, by test title */
  fails: Record<string, number>
  /** runs with a noticeable failure on each test, by test title */
  noticedFails: Record<string, number>
  /** the worst test's degree in each run */
  worst: number[]
  /** the worst noticeable degree in each run */
  worstNoticed: number[]
  /** how often each test was the worst one, by test title */
  worstTest: Record<string, number>
  /** each test's degree in each run, by test title */
  degree: Record<string, number[]>
}

type Apply = Parameters<typeof computeResult>[4]

/** Run a routine `runs` times from `kind` and collect pass counts, failing tests and degrees. */
function deckStats(seq: OpKey[], kind: DeckKind, runs: number, apply?: Apply): DeckStats {
  const stats: DeckStats = { clean: 0, noticedClean: 0, runs, fails: {}, noticedFails: {}, worst: [], worstNoticed: [], worstTest: {}, degree: {} }
  METRICS.forEach((metric) => (stats.degree[metric.title] = []))
  for (let run = 0; run < runs; run++) {
    const result = computeResult(kind, deckSize, seq, 'ends', apply)
    const scored = scoreResult(result)
    if (scored.fails.length === 0) stats.clean++
    scored.fails.forEach((title) => (stats.fails[title] = (stats.fails[title] ?? 0) + 1))
    const { perTest, worst, worstNoticed } = degrees(result)
    perTest.forEach(({ title, degree, noticed }) => {
      stats.degree[title].push(degree)
      if (noticed > 1) stats.noticedFails[title] = (stats.noticedFails[title] ?? 0) + 1
    })
    if (worstNoticed.noticed <= 1) stats.noticedClean++
    stats.worst.push(worst.degree)
    stats.worstNoticed.push(worstNoticed.noticed)
    stats.worstTest[worst.title] = (stats.worstTest[worst.title] ?? 0) + 1
  }
  return stats
}

/**
 * A routine's results from every starting deck. It is judged by its weakest deck on noticeable failures first: the
 * deck whose worst noticeable degree is highest on average. The same on every test breaks ties, then pass counts.
 */
function routineStats(seq: OpKey[], runs: number, apply?: Apply) {
  const perDeck = kinds.map((kind) => deckStats(seq, kind, runs, apply))
  const total = perDeck.reduce((sum, stats) => sum + stats.clean, 0)
  const noticedTotal = perDeck.reduce((sum, stats) => sum + stats.noticedClean, 0)
  return {
    seq,
    perDeck,
    weakestNoticed: Math.max(...perDeck.map((stats) => mean(stats.worstNoticed))),
    weakest: Math.max(...perDeck.map((stats) => mean(stats.worst))),
    noticedTotal,
    total,
  }
}

type Ranked = ReturnType<typeof routineStats>
const byWeakestDeck = (a: Ranked, b: Ranked) =>
  a.weakestNoticed - b.weakestNoticed || a.weakest - b.weakest || b.total - a.total || costOf(a.seq) - costOf(b.seq)

const tally = (counts: Record<string, number>) =>
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([title, count]) => `${title} ${count}`)
    .join(', ')

/**
 * The detail lines for one starting deck. The first line is the noticeable tier: runs with no noticeable failure, the
 * worst noticeable degree, and which tests failed noticeably. The second is every test: the same, plus the two tests
 * closest to failing.
 */
function deckLine(kind: DeckKind, stats: DeckStats): string {
  const passed = (clean: number) => {
    const [low, high] = wilson(clean, stats.runs)
    return `${`${clean}/${stats.runs}`.padStart(7)}  (${Math.round(low)}–${Math.round(high)}%)`
  }
  const closest = Object.entries(stats.degree)
    .map(([title, xs]) => ({ title, avg: mean(xs) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 2)
    .map(({ title, avg }) => `${title} ${avg.toFixed(2)}`)
    .join(', ')
  const noticedFails = tally(stats.noticedFails)
  const fails = tally(stats.fails)
  return [
    [
      `    ${kind.padEnd(7)} noticeable ${passed(stats.noticedClean)}`.padEnd(44),
      `degree ${mean(stats.worstNoticed).toFixed(2)} ± ${sd(stats.worstNoticed).toFixed(2)}`.padEnd(22),
      noticedFails ? `fails: ${noticedFails}` : '',
    ].join(''),
    [
      `            all tests  ${passed(stats.clean)}`.padEnd(44),
      `degree ${mean(stats.worst).toFixed(2)} ± ${sd(stats.worst).toFixed(2)}`.padEnd(22),
      `closest: ${closest}`.padEnd(52),
      fails ? `fails: ${fails}` : '',
    ].join(''),
  ].join('\n')
}

const started = Date.now()
const elapsed = () => `${Math.round((Date.now() - started) / 1000)}s`
const progress = (done: number, of: number) => process.stdout.write(`  ${done}/${of} ${elapsed()}\r`)
const clearProgress = () => process.stdout.write('\r' + ' '.repeat(40) + '\r')

/** Stages 1 and 2: score every routine from one deck, then rerun the leaders from every deck. Returns stage 2, ranked. */
function search(): Ranked[] {
  // Stage 1: one run of every routine from the chosen deck, ranked by its worst noticeable degree, then its worst degree.
  const routines = allRoutines()
  console.log(`Stage 1: ${routines.length} routines costing up to ${maxCost} units, one run each from the ${from} deck (${deckSize} cards).`)
  const scored = routines.map((seq, index) => {
    if (index % 500 === 0) progress(index, routines.length)
    const { worst, worstNoticed } = degrees(computeResult(from, deckSize, seq, 'ends'))
    return { seq, worst: worst.degree, noticed: worstNoticed.noticed }
  })
  scored.sort((a, b) => a.noticed - b.noticed || a.worst - b.worst || costOf(a.seq) - costOf(b.seq))
  clearProgress()
  const noticedClean = scored.filter((entry) => entry.noticed <= 1).length
  const allClean = scored.filter((entry) => entry.worst <= 1).length
  console.log(`  done in ${elapsed()}. In their one run, ${noticedClean} routines had no noticeable failure and ${allClean} cleared every test.`)

  // Stage 2: rerun the leaders from every starting deck.
  const leaders = scored.slice(0, leaderCount)
  console.log(`\nStage 2: the top ${leaders.length}, ${leaderRuns} runs ${fromDecks}, ranked by the weakest deck.`)
  console.log(`  Each deck shows the worst noticeable degree (mean ± SD) and the worst degree over all tests.`)
  const stage2 = leaders.map(({ seq }, index) => {
    progress(index, leaders.length)
    return routineStats(seq, leaderRuns)
  })
  stage2.sort(byWeakestDeck)
  clearProgress()
  const deckBrief = (stats: DeckStats) =>
    `${mean(stats.worstNoticed).toFixed(2)}±${sd(stats.worstNoticed).toFixed(2)} / ${mean(stats.worst).toFixed(2)}±${sd(stats.worst).toFixed(2)}`
  const shown = stage2.slice(0, Math.max(finalistCount, 30))
  for (const { seq, perDeck } of shown) console.log(`  ${label(seq).padEnd(30)} ${kinds.map((kind, i) => `${kind} ${deckBrief(perDeck[i])}`.padEnd(30)).join('')}`)
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
// of many noisy readings, so this shows the floor the finalists are compared against.
const reference = routineStats(['mash'], finalRuns, (deck) => fisher(deck.length))
clearProgress()
console.log(`  A test's degree is how far it sits from a random deck's average, as a fraction of the way to its pass line:`)
console.log(`  0 is random, 1 is the pass line, and above 1 fails. "degree" is the worst degree in each run, mean ± SD.`)
console.log(`  "noticeable" counts only failures a player would see at the table; "all tests" counts every test.`)
console.log(`  A high mean with a small SD is reliably a little off. A lower mean with a large SD is usually fine but`)
console.log(`  sometimes far off. "closest" lists the two tests with the highest average degree. Pass counts have a 95% interval.\n`)
const heading = ({ weakestNoticed, weakest, noticedTotal, total }: Ranked) =>
  `weakest deck: noticeable ${weakestNoticed.toFixed(2)}, all tests ${weakest.toFixed(2)}; passed ${noticedTotal} and ${total} of ${finalRuns * kinds.length}`
console.log(`  Perfect shuffle (reference: a truly random deck)  ${heading(reference)}`)
kinds.forEach((kind, i) => console.log(deckLine(kind, reference.perDeck[i])))
for (const ranked of stage3) {
  console.log(`  ${label(ranked.seq)}  ${heading(ranked)}`)
  kinds.forEach((kind, i) => console.log(deckLine(kind, ranked.perDeck[i])))
}
console.log(`\nFinished in ${elapsed()}.`)

if (values.json) {
  const spread = (xs: number[]) => ({ mean: mean(xs), sd: sd(xs), max: Math.max(...xs) })
  const summarise = ({ seq, perDeck, weakestNoticed, weakest, noticedTotal, total }: Ranked) => ({
    routine: compressSeq(seq),
    cost: costOf(seq),
    weakestNoticed,
    weakest,
    noticedTotal,
    total,
    decks: Object.fromEntries(
      kinds.map((kind, i) => {
        const stats = perDeck[i]
        return [
          kind,
          {
            clean: stats.clean,
            noticedClean: stats.noticedClean,
            runs: stats.runs,
            interval: wilson(stats.clean, stats.runs),
            noticedInterval: wilson(stats.noticedClean, stats.runs),
            fails: stats.fails,
            noticedFails: stats.noticedFails,
            worst: spread(stats.worst),
            worstNoticed: spread(stats.worstNoticed),
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
