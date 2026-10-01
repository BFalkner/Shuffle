// Recommendation search: score every routine up to a cost limit, then rerun the leaders from every starting deck.
// This reproduces the numbers behind the home page recommendations and footnote.
//
// Usage: npm run search -- [--max-cost 7] [--from played] [--size 99] [--leaders 32] [--leader-runs 5] [--finalists 6] [--final-runs 200] [--decks played] [--json file]
//        npm run search -- --routine "M×4·P·M×4" [--routine M×8 ...] [--final-runs 200]   (skip the search, test these)
//
// --decks limits which starting decks are run and ranked (comma-separated). A routine is ranked by its weakest listed
// deck, so with both the sorted deck usually decides. For a between-games routine, use --from played --decks played.
//
// Each run's total is the sum of its three categories' levels: 0 is random, and an unshuffled sorted deck reads about 3.
import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { DECK_KINDS, fisher, type DeckKind } from '../src/engine/decks.ts'
import { CATEGORIES } from '../src/engine/metrics.ts'
import { OPS, type OpKey } from '../src/engine/moves.ts'
import { OP_COST, compressSeq, parseRoutine } from '../src/engine/routines.ts'
import { computeResult, scoreResult } from '../src/engine/simulate.ts'

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

// The cut isn't searched yet. At half a unit it multiplies the routines to score: up to 7 units, 169,175 instead of
// 5,793, about 29 times as long. Name routines with C in them with --routine to test them.
const moves = (Object.keys(OPS) as OpKey[]).filter((op) => op !== 'cut')
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

/** 95% Wilson interval for `clean` runs out of `runs`, as percentages. */
function wilson(clean: number, runs: number): [number, number] {
  const z = 1.96
  const p = clean / runs
  const centre = (p + (z * z) / (2 * runs)) / (1 + (z * z) / runs)
  const half = (z * Math.sqrt((p * (1 - p)) / runs + (z * z) / (4 * runs * runs))) / (1 + (z * z) / runs)
  return [Math.max(0, centre - half) * 100, Math.min(1, centre + half) * 100]
}

interface DeckStats {
  /** runs with every category within the noise of random */
  clean: number
  runs: number
  /** the total in each run */
  total: number[]
  /** each category's level in each run, by category title */
  level: Record<string, number[]>
}

type Apply = Parameters<typeof computeResult>[4]

/** Run a routine `runs` times from `kind` and collect its totals, category levels and clean runs. */
function deckStats(seq: OpKey[], kind: DeckKind, runs: number, apply?: Apply): DeckStats {
  const stats: DeckStats = { clean: 0, runs, total: [], level: {} }
  CATEGORIES.forEach(({ title }) => (stats.level[title] = []))
  for (let run = 0; run < runs; run++) {
    const scored = scoreResult(computeResult(kind, deckSize, seq, 'ends', apply))
    if (scored.clearCount === CATEGORIES.length) stats.clean++
    stats.total.push(scored.total)
    scored.categories.forEach(({ title, level }) => stats.level[title].push(level))
  }
  return stats
}

/**
 * A routine's results from every starting deck. It is judged by its weakest deck: the one with the highest average
 * total. The mean across decks and the clean runs break ties.
 */
function routineStats(seq: OpKey[], runs: number, apply?: Apply) {
  const perDeck = kinds.map((kind) => deckStats(seq, kind, runs, apply))
  const means = perDeck.map((stats) => mean(stats.total))
  const clean = perDeck.reduce((sum, stats) => sum + stats.clean, 0)
  return { seq, perDeck, weakest: Math.max(...means), overall: mean(means), clean }
}

type Ranked = ReturnType<typeof routineStats>
const byWeakestDeck = (a: Ranked, b: Ranked) => a.weakest - b.weakest || a.overall - b.overall || b.clean - a.clean || costOf(a.seq) - costOf(b.seq)

/** The detail line for one starting deck: the total, each category's average level, and the clean runs with their interval. */
function deckLine(kind: DeckKind, stats: DeckStats): string {
  const [low, high] = wilson(stats.clean, stats.runs)
  const levels = CATEGORIES.map(({ title }) => `${title} ${mean(stats.level[title]).toFixed(3)}`.padEnd(18)).join('')
  return [
    `    ${kind.padEnd(7)} total ${mean(stats.total).toFixed(3)} ± ${sd(stats.total).toFixed(3)}`.padEnd(36),
    levels,
    `clean ${stats.clean}/${stats.runs} (${Math.round(low)}–${Math.round(high)}%)`,
  ].join('')
}

const started = Date.now()
const elapsed = () => `${Math.round((Date.now() - started) / 1000)}s`
const progress = (done: number, of: number) => process.stdout.write(`  ${done}/${of} ${elapsed()}\r`)
const clearProgress = () => process.stdout.write('\r' + ' '.repeat(40) + '\r')

/** Stages 1 and 2: score every routine from one deck, then rerun the leaders from every deck. Returns stage 2, ranked. */
function search(): Ranked[] {
  // Stage 1: one run of every routine from the chosen deck, ranked by its total.
  const routines = allRoutines()
  console.log(`Stage 1: ${routines.length} routines costing up to ${maxCost} units, one run each from the ${from} deck (${deckSize} cards).`)
  const scored = routines.map((seq, index) => {
    if (index % 500 === 0) progress(index, routines.length)
    return { seq, total: scoreResult(computeResult(from, deckSize, seq, 'ends')).total }
  })
  scored.sort((a, b) => a.total - b.total || costOf(a.seq) - costOf(b.seq))
  clearProgress()
  console.log(`  done in ${elapsed()}. The lowest total was ${scored[0].total.toFixed(3)}, from ${label(scored[0].seq)}.`)

  // Stage 2: rerun the leaders from every starting deck.
  const leaders = scored.slice(0, leaderCount)
  console.log(`\nStage 2: the top ${leaders.length}, ${leaderRuns} runs ${fromDecks}, ranked by the weakest deck.`)
  console.log(`  Each deck shows the total (mean ± SD), then the runs with every category within the noise of random.`)
  const stage2 = leaders.map(({ seq }, index) => {
    progress(index, leaders.length)
    return routineStats(seq, leaderRuns)
  })
  stage2.sort(byWeakestDeck)
  clearProgress()
  const deckBrief = (stats: DeckStats) => `${mean(stats.total).toFixed(3)}±${sd(stats.total).toFixed(3)} ${stats.clean}/${stats.runs}`
  const shown = stage2.slice(0, Math.max(finalistCount, 30))
  for (const { seq, perDeck } of shown) console.log(`  ${label(seq).padEnd(30)} ${kinds.map((kind, i) => `${kind} ${deckBrief(perDeck[i])}`.padEnd(28)).join('')}`)
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
// Reference: one perfect shuffle, measured the same way. A random deck's total averages 0 and varies a little either
// side, so this shows how close to 0 a finalist can be expected to get.
const reference = routineStats(['mash'], finalRuns, (deck) => fisher(deck.length))
clearProgress()
console.log(`  Each category's level is how far it sits from random: 0 is a random deck, and 1 is a sorted deck that was never`)
console.log(`  shuffled. The total adds up the three categories, mean ± SD over the runs. "clean" counts the runs with every`)
console.log(`  category within the noise of random, with a 95% interval.\n`)
console.log(`  Perfect shuffle (reference: a truly random deck)  weakest deck total ${reference.weakest.toFixed(3)}, clean ${reference.clean}/${finalRuns * kinds.length}`)
kinds.forEach((kind, i) => console.log(deckLine(kind, reference.perDeck[i])))
for (const { seq, perDeck, weakest, clean } of stage3) {
  console.log(`  ${label(seq)}  weakest deck total ${weakest.toFixed(3)}, clean ${clean}/${finalRuns * kinds.length}`)
  kinds.forEach((kind, i) => console.log(deckLine(kind, perDeck[i])))
}
console.log(`\nFinished in ${elapsed()}.`)

if (values.json) {
  const spread = (xs: number[]) => ({ mean: mean(xs), sd: sd(xs), max: Math.max(...xs) })
  const summarise = ({ seq, perDeck, weakest, overall, clean }: Ranked) => ({
    routine: compressSeq(seq),
    cost: costOf(seq),
    weakest,
    overall,
    clean,
    decks: Object.fromEntries(
      kinds.map((kind, i) => {
        const stats = perDeck[i]
        return [
          kind,
          {
            clean: stats.clean,
            runs: stats.runs,
            interval: wilson(stats.clean, stats.runs),
            total: spread(stats.total),
            level: Object.fromEntries(Object.entries(stats.level).map(([title, xs]) => [title, spread(xs)])),
          },
        ]
      }),
    ),
  })
  const options = { maxCost, from, decks: kinds, deckSize, leaderCount, leaderRuns, finalistCount, finalRuns }
  writeFileSync(values.json, JSON.stringify({ options, seconds: (Date.now() - started) / 1000, reference: summarise(reference), stage2: stage2.map(summarise), stage3: stage3.map(summarise) }, null, 2))
  console.log(`Wrote ${values.json}.`)
}
