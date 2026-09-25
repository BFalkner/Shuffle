// Recommendation search: score every routine up to a cost limit, then rerun the leaders from every starting deck.
// This reproduces the numbers behind the home page recommendations and footnote. Routines are judged by area (order,
// proximity, position, grouping), and on failures a player would notice before the rest; see readRun.
//
// Usage: npm run search -- [--max-cost 7] [--from played] [--size 99] [--leaders 32] [--leader-runs 5] [--finalists 6] [--final-runs 200] [--decks played] [--json file]
//        npm run search -- --routine "M×4·P·M×4" [--routine M×8 ...] [--final-runs 200]   (skip the search, test these)
//
// --decks limits which starting decks are run and ranked (comma-separated). A routine is ranked by its weakest listed
// deck, so with all four the sorted deck usually decides. For a between-games routine, use --from played --decks played.
import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { DECK_KINDS, fisher, type DeckKind } from '../src/engine/decks.ts'
import { AREAS } from '../src/engine/metrics.ts'
import { OPS, OP_COST, compressSeq, type OpKey } from '../src/engine/moves.ts'
import { areaReadings } from '../src/engine/scoring.ts'
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

type Readings = ReturnType<typeof areaReadings>

/**
 * One run's reading. Routines are judged by area, so failing several tests in one area counts once. `worst` is the
 * largest excess over a perfect shuffle among the four areas (0 is as random as a perfect shuffle, and the pass line
 * is about 1 above that); `worstNoticed` is the same for failures a player would notice. Distinguishability is the
 * catch-all and is reported alongside, not ranked.
 */
function readRun(result: MethodResult) {
  const readings: Readings = areaReadings(result.avg, result.base, result.moveCount, deckSize)
  const scoredAreas = AREAS.map(([area]) => area)
  return {
    readings,
    worst: Math.max(...scoredAreas.map((area) => readings[area].excess)),
    worstNoticed: Math.max(...scoredAreas.map((area) => readings[area].noticedExcess)),
    failed: AREAS.filter(([area]) => readings[area].degree > 1).map(([, label]) => label),
    noticedFailed: AREAS.filter(([area]) => readings[area].noticed > 1).map(([, label]) => label),
    catchAllFailed: readings.holistic.degree > 1,
  }
}

interface DeckStats {
  runs: number
  /** runs where all four areas cleared */
  clean: number
  /** runs with no noticeable failure in any area */
  noticedClean: number
  /** runs where distinguishability, the catch-all, failed */
  catchAllFails: number
  /** runs where each area failed, and failed noticeably, by area label */
  areaFails: Record<string, number>
  noticedAreaFails: Record<string, number>
  /** runs where each test failed, by test title */
  testFails: Record<string, number>
  /** the worst area excess in each run, overall and noticeable */
  worst: number[]
  worstNoticed: number[]
  /** each area's excess in each run, by area label */
  areaExcess: Record<string, number[]>
}

type Apply = Parameters<typeof computeResult>[4]

const count = (counts: Record<string, number>, key: string) => (counts[key] = (counts[key] ?? 0) + 1)

/** Run a routine `runs` times from `kind` and collect area pass counts, failures and excess readings. */
function deckStats(seq: OpKey[], kind: DeckKind, runs: number, apply?: Apply): DeckStats {
  const stats: DeckStats = {
    runs,
    clean: 0,
    noticedClean: 0,
    catchAllFails: 0,
    areaFails: {},
    noticedAreaFails: {},
    testFails: {},
    worst: [],
    worstNoticed: [],
    areaExcess: Object.fromEntries(AREAS.map(([, label]) => [label, [] as number[]])),
  }
  for (let run = 0; run < runs; run++) {
    const result = computeResult(kind, deckSize, seq, 'ends', apply)
    const { readings, worst, worstNoticed, failed, noticedFailed, catchAllFailed } = readRun(result)
    if (!failed.length) stats.clean++
    if (!noticedFailed.length) stats.noticedClean++
    if (catchAllFailed) stats.catchAllFails++
    failed.forEach((label) => count(stats.areaFails, label))
    noticedFailed.forEach((label) => count(stats.noticedAreaFails, label))
    scoreResult(result).fails.forEach((title) => count(stats.testFails, title))
    stats.worst.push(worst)
    stats.worstNoticed.push(worstNoticed)
    AREAS.forEach(([area, label]) => stats.areaExcess[label].push(readings[area].excess))
  }
  return stats
}

/**
 * A routine's results from every starting deck, judged by its weakest deck: noticeable failures first (the deck whose
 * worst noticeable excess is highest on average), then all areas, then pass counts.
 */
function routineStats(seq: OpKey[], runs: number, apply?: Apply) {
  const perDeck = kinds.map((kind) => deckStats(seq, kind, runs, apply))
  return {
    seq,
    perDeck,
    weakestNoticed: Math.max(...perDeck.map((stats) => mean(stats.worstNoticed))),
    weakest: Math.max(...perDeck.map((stats) => mean(stats.worst))),
    noticedTotal: perDeck.reduce((sum, stats) => sum + stats.noticedClean, 0),
    total: perDeck.reduce((sum, stats) => sum + stats.clean, 0),
  }
}

type Ranked = ReturnType<typeof routineStats>
const byWeakestDeck = (a: Ranked, b: Ranked) =>
  a.weakestNoticed - b.weakestNoticed || a.weakest - b.weakest || b.total - a.total || costOf(a.seq) - costOf(b.seq)

const tally = (counts: Record<string, number>) =>
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([title, n]) => `${title} ${n}`)
    .join(', ')

const signed = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(2)}`

/**
 * The detail lines for one starting deck: the noticeable tier, all four areas, then each area's average excess with
 * the tests behind any failures.
 */
function deckLine(kind: DeckKind, stats: DeckStats): string {
  const passed = (clean: number) => {
    const [low, high] = wilson(clean, stats.runs)
    return `${`${clean}/${stats.runs}`.padStart(7)}  (${Math.round(low)}–${Math.round(high)}%)`
  }
  const spread = (xs: number[]) => `excess ${signed(mean(xs))} ± ${sd(xs).toFixed(2)}`
  const noticedFails = tally(stats.noticedAreaFails)
  const areaFails = tally(stats.areaFails)
  const byArea = AREAS.map(([, label]) => `${label} ${signed(mean(stats.areaExcess[label]))}`).join('  ')
  const tests = tally(stats.testFails)
  return [
    `    ${kind.padEnd(7)} noticeable  ${passed(stats.noticedClean)}`.padEnd(45) + spread(stats.worstNoticed).padEnd(24) + (noticedFails ? `area fails: ${noticedFails}` : ''),
    `            all areas   ${passed(stats.clean)}`.padEnd(45) + spread(stats.worst).padEnd(24) + (areaFails ? `area fails: ${areaFails}` : ''),
    `            by area     ${byArea}   catch-all fails ${stats.catchAllFails}` + (tests ? `   tests failed: ${tests}` : ''),
  ].join('\n')
}

const started = Date.now()
const elapsed = () => `${Math.round((Date.now() - started) / 1000)}s`
const progress = (done: number, of: number) => process.stdout.write(`  ${done}/${of} ${elapsed()}\r`)
const clearProgress = () => process.stdout.write('\r' + ' '.repeat(40) + '\r')

/** Stages 1 and 2: score every routine from one deck, then rerun the leaders from every deck. Returns stage 2, ranked. */
function search(): Ranked[] {
  // Stage 1: one run of every routine from the chosen deck, ranked by its worst noticeable excess, then its worst excess.
  const routines = allRoutines()
  console.log(`Stage 1: ${routines.length} routines costing up to ${maxCost} units, one run each from the ${from} deck (${deckSize} cards).`)
  const scored = routines.map((seq, index) => {
    if (index % 500 === 0) progress(index, routines.length)
    const { worst, worstNoticed, failed, noticedFailed } = readRun(computeResult(from, deckSize, seq, 'ends'))
    return { seq, worst, noticed: worstNoticed, clean: !failed.length, noticedClean: !noticedFailed.length }
  })
  scored.sort((a, b) => a.noticed - b.noticed || a.worst - b.worst || costOf(a.seq) - costOf(b.seq))
  clearProgress()
  const noticedClean = scored.filter((entry) => entry.noticedClean).length
  const allClean = scored.filter((entry) => entry.clean).length
  console.log(`  done in ${elapsed()}. In their one run, ${noticedClean} routines had no noticeable failure and ${allClean} cleared all four areas.`)

  // Stage 2: rerun the leaders from every starting deck.
  const leaders = scored.slice(0, leaderCount)
  console.log(`\nStage 2: the top ${leaders.length}, ${leaderRuns} runs ${fromDecks}, ranked by the weakest deck.`)
  console.log(`  Each deck shows the worst noticeable excess and the worst area excess (means), then runs with all four areas clear.`)
  const stage2 = leaders.map(({ seq }, index) => {
    progress(index, leaders.length)
    return routineStats(seq, leaderRuns)
  })
  stage2.sort(byWeakestDeck)
  clearProgress()
  const deckBrief = (stats: DeckStats) => `${signed(mean(stats.worstNoticed))} / ${signed(mean(stats.worst))} ${stats.clean}/${stats.runs}`
  const shown = stage2.slice(0, Math.max(finalistCount, 30))
  for (const { seq, perDeck } of shown) console.log(`  ${label(seq).padEnd(30)} ${kinds.map((kind, i) => `${kind} ${deckBrief(perDeck[i])}`.padEnd(30)).join('')}`)
  if (stage2.length > shown.length) console.log(`  … and ${stage2.length - shown.length} more.`)
  console.log(`  done in ${elapsed()}.`)
  return stage2
}

// With --routine, skip the search and run stage 3 on the named routines.
const stage2 = named ? [] : search()
const finalists = named ?? stage2.slice(0, finalistCount).map(({ seq }) => seq)
console.log(`${named ? '' : '\n'}Stage 3: ${named ? 'the named routines' : `the top ${finalists.length}`}, ${finalRuns} runs ${fromDecks}, ranked by the weakest deck.`)
const stage3 = finalists.map((seq, index) => {
  progress(index, finalists.length)
  return routineStats(seq, finalRuns)
})
stage3.sort(byWeakestDeck)
// Reference: a perfect shuffle, measured the same way. Its excess is about 0 by construction; its pass counts show how
// often a truly random deck trips a test by chance.
const reference = routineStats(['mash'], finalRuns, (deck) => fisher(deck.length))
clearProgress()
console.log(`  Routines are judged on four areas: order, proximity, position and grouping. An area fails when any of its tests`)
console.log(`  fails, so several failures in one area count once. "excess" is how far the worst area reads above a perfect`)
console.log(`  shuffle, on the degree scale where the pass line is 1: about 0 is as random as a perfect shuffle. "noticeable"`)
console.log(`  counts only failures a player would see at the table. Distinguishability, the catch-all, is reported alongside.`)
console.log(`  A high mean with a small SD is reliably a little off; a lower mean with a large SD is usually fine but sometimes`)
console.log(`  far off. Pass counts have a 95% interval.\n`)
const heading = ({ weakestNoticed, weakest, noticedTotal, total }: Ranked) =>
  `weakest deck excess: noticeable ${signed(weakestNoticed)}, all areas ${signed(weakest)}; ${noticedTotal} and ${total} of ${finalRuns * kinds.length} runs clear`
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
            runs: stats.runs,
            clean: stats.clean,
            noticedClean: stats.noticedClean,
            interval: wilson(stats.clean, stats.runs),
            noticedInterval: wilson(stats.noticedClean, stats.runs),
            catchAllFails: stats.catchAllFails,
            areaFails: stats.areaFails,
            noticedAreaFails: stats.noticedAreaFails,
            testFails: stats.testFails,
            worst: spread(stats.worst),
            worstNoticed: spread(stats.worstNoticed),
            areaExcess: Object.fromEntries(Object.entries(stats.areaExcess).map(([area, xs]) => [area, spread(xs)])),
          },
        ]
      }),
    ),
  })
  const options = { maxCost, from, decks: kinds, deckSize, leaderCount, leaderRuns, finalistCount, finalRuns }
  writeFileSync(values.json, JSON.stringify({ options, seconds: (Date.now() - started) / 1000, reference: summarise(reference), stage2: stage2.map(summarise), stage3: stage3.map(summarise) }, null, 2))
  console.log(`Wrote ${values.json}.`)
}
