// Recommendation search: score every routine up to a cost limit, then rerun the leaders from every starting deck.
// This reproduces the numbers behind the home page recommendations and footnote.
//
// Usage: npm run search -- [--max-cost 7] [--from played] [--size 99] [--leaders 32] [--leader-runs 5] [--finalists 6] [--final-runs 200] [--decks played] [--json file] [--workers n] [--seed text] [--race-decks 300] [--race-keep 0.05]
//        npm run search -- --routine "M×4·P·M×4" [--routine M×8 ...] [--final-runs 200]   (skip the search, test these)
//
// --decks limits which starting decks are run and ranked (comma-separated). A routine is ranked by its weakest listed
// deck, so with both the sorted deck usually decides. For a between-games routine, use --from played --decks played.
//
// Each run's total is the sum of its three categories' levels: 0 is random, and an unshuffled sorted deck reads about 3.
//
// The work runs on a pool of worker threads (search-worker.ts), one per processor unless --workers says otherwise.
// Stage 1 deals every routine from the same starting decks, and routines that share a prefix share the decks dealt
// through it. Every task seeds its own random numbers from --seed and its description, so the same options give the
// same output, whatever the number of workers.
import { writeFileSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { parseArgs } from 'node:util'
import { Worker } from 'node:worker_threads'
import { DECK_KINDS, type DeckKind } from '../src/engine/decks.ts'
import { CATEGORIES } from '../src/engine/metrics.ts'
import { OPS, type OpKey } from '../src/engine/moves.ts'
import { OP_COST, compressSeq, parseRoutine } from '../src/engine/routines.ts'
import type { Message, RunResult, RunTask, Settings, TreeResult, TreeTask } from './search-worker.ts'

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
    workers: { type: 'string', default: String(availableParallelism()) },
    seed: { type: 'string', default: '1' },
    'race-decks': { type: 'string', default: '300' },
    'race-keep': { type: 'string', default: '0.05' },
  },
})
const maxCost = Number(values['max-cost'])
const from = values.from as DeckKind
const deckSize = Number(values.size)
const leaderCount = Number(values.leaders)
const leaderRuns = Number(values['leader-runs'])
const finalistCount = Number(values.finalists)
const finalRuns = Number(values['final-runs'])
const workerCount = Number(values.workers)
const raceDecks = Number(values['race-decks'])
const raceKeep = Number(values['race-keep'])
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

/**
 * Stage 1's tasks: each one-move routine on its own, and each two-move routine with every routine that extends it.
 * Together they cover every routine within the cost limit once. The cheapest prefixes have the most routines under
 * them, so they go first and the pool ends on small tasks.
 */
function stageOneTasks(): TreeTask[] {
  const single = moves.filter((op) => OP_COST[op] <= maxCost)
  const pairs = single.flatMap((first) => single.filter((op) => OP_COST[first] + OP_COST[op] <= maxCost).map((second) => [first, second]))
  return [...pairs.map((seq) => ({ seq, descend: true })), ...single.map((op) => ({ seq: [op], descend: false }))].toSorted(
    (a, b) => costOf(a.seq) - costOf(b.seq),
  )
}

const settings: Settings = { seed: values.seed, from, deckSize, maxCost, moves, raceDecks }
const workers = Array.from({ length: workerCount }, () => new Worker(new URL('./search-worker.ts', import.meta.url), { workerData: settings }))
workers.forEach((worker) =>
  worker.on('error', (error) => {
    console.error(error)
    process.exit(1)
  }),
)

/** Run tasks on the workers, each worker taking the next task when it finishes one. Results come back in task order. */
function runOnPool<Result>(job: Message['job'], tasks: Message['task'][]): Promise<Result[]> {
  const results: Result[] = new Array(tasks.length)
  let next = 0
  let done = 0
  return new Promise((resolve) => {
    if (tasks.length === 0) return resolve(results)
    const feed = (worker: Worker) => {
      if (next >= tasks.length) return
      const index = next++
      worker.once('message', (result: Result) => {
        results[index] = result
        done++
        progress(done, tasks.length)
        if (done === tasks.length) resolve(results)
        else feed(worker)
      })
      worker.postMessage({ job, task: tasks[index] } as Message)
    }
    workers.forEach(feed)
  })
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

/** Collect a routine's runs from one deck: its totals, category levels and clean runs. */
function deckStats(runs: RunResult[]): DeckStats {
  return {
    clean: runs.filter((run) => run.clearCount === CATEGORIES.length).length,
    runs: runs.length,
    total: runs.map((run) => run.total),
    level: Object.fromEntries(CATEGORIES.map(({ title }) => [title, runs.map((run) => run.level[title])])),
  }
}

/** A routine's results from every starting deck. */
interface Ranked {
  seq: OpKey[]
  perDeck: DeckStats[]
  /** the highest average total over the starting decks */
  weakest: number
  /** the average total over the starting decks */
  overall: number
  clean: number
}

/**
 * Run each routine `runs` times from every starting deck, all on the pool at once. A routine is judged by its weakest
 * deck: the one with the highest average total. The mean across decks and the clean runs break ties. With `perfect`,
 * every move is a perfect shuffle.
 */
async function routineStats(seqs: OpKey[][], runs: number, perfect = false): Promise<Ranked[]> {
  const tasks = seqs.flatMap((seq) => kinds.flatMap((kind) => Array.from({ length: runs }, (_, run): RunTask => ({ seq, kind, run, perfect }))))
  const results = await runOnPool<RunResult>('run', tasks)
  return seqs.map((seq, routine) => {
    const perDeck = kinds.map((_kind, deck) => {
      const first = (routine * kinds.length + deck) * runs
      return deckStats(results.slice(first, first + runs))
    })
    const means = perDeck.map((stats) => mean(stats.total))
    const clean = perDeck.reduce((sum, stats) => sum + stats.clean, 0)
    return { seq, perDeck, weakest: Math.max(...means), overall: mean(means), clean }
  })
}

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
async function search(): Promise<Ranked[]> {
  // Stage 1: one run of every routine from the chosen deck, ranked by its total. It races: every routine is read on the
  // first few starting decks, and only the best go on to a full run. A reading on fewer decks isn't a true level (even a
  // random deck reads above 0), so the first round only ranks, and its numbers aren't printed.
  console.log(`Stage 1: every routine costing up to ${maxCost} units, one run each from the ${from} deck (${deckSize} cards), on ${workerCount} workers.`)
  const byTotal = (a: { seq: OpKey[]; total: number }, b: { seq: OpKey[]; total: number }) => a.total - b.total || costOf(a.seq) - costOf(b.seq)
  const raced = (await runOnPool<TreeResult>('tree', stageOneTasks())).flat().toSorted(byTotal)
  const keep = Math.min(raced.length, Math.max(Math.ceil(raced.length * raceKeep), 4 * leaderCount))
  clearProgress()
  console.log(`  ${raced.length} routines read on ${raceDecks} decks in ${elapsed()}. The best ${keep} go on to a full run.`)
  const survivors = raced.slice(0, keep).map(({ seq }) => seq)
  const fullTasks = Array.from({ length: Math.ceil(survivors.length / 16) }, (_, index) => ({ seqs: survivors.slice(index * 16, index * 16 + 16) }))
  const scored = (await runOnPool<TreeResult>('full', fullTasks)).flat().toSorted(byTotal)
  clearProgress()
  console.log(`  done in ${elapsed()}. The lowest total was ${scored[0].total.toFixed(3)}, from ${label(scored[0].seq)}.`)

  // Stage 2: rerun the leaders from every starting deck.
  const leaders = scored.slice(0, leaderCount)
  console.log(`\nStage 2: the top ${leaders.length}, ${leaderRuns} runs ${fromDecks}, ranked by the weakest deck.`)
  console.log(`  Each deck shows the total (mean ± SD), then the runs with every category within the noise of random.`)
  const stage2 = await routineStats(
    leaders.map(({ seq }) => seq),
    leaderRuns,
  )
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
const stage2 = named ? [] : await search()
const finalists = named ?? stage2.slice(0, finalistCount).map(({ seq }) => seq)
console.log(`${named ? '' : '\n'}Stage 3: ${named ? 'the named routines' : `the top ${finalists.length}`}, ${finalRuns} runs ${fromDecks}, ranked by the weakest deck.`)
const stage3 = await routineStats(finalists, finalRuns)
stage3.sort(byWeakestDeck)
// Reference: one perfect shuffle, measured the same way. A random deck's total averages 0 and varies a little either
// side, so this shows how close to 0 a finalist can be expected to get.
const [reference] = await routineStats([['mash']], finalRuns, true)
await Promise.all(workers.map((worker) => worker.terminate()))
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
  const options = { maxCost, from, decks: kinds, deckSize, leaderCount, leaderRuns, finalistCount, finalRuns, workerCount, seed: values.seed }
  writeFileSync(values.json, JSON.stringify({ options, seconds: (Date.now() - started) / 1000, reference: summarise(reference), stage2: stage2.map(summarise), stage3: stage3.map(summarise) }, null, 2))
  console.log(`Wrote ${values.json}.`)
}
