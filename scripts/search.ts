// Recommendation search: score every routine up to a cost limit, then rerun the leaders from every starting deck.
// This reproduces the numbers behind the home page recommendations and footnote.
//
// Usage: npm run search -- [--max-cost 7] [--from played] [--size 99] [--leaders 32] [--leader-runs 5] [--finalists 6] [--final-runs 200] [--decks played] [--json file] [--workers n] [--seed text] [--race-decks 300] [--race-keep 0.05] [--forest] [--python python]
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
//
// --forest runs scripts/forest.py on the finalists after stage 3: a random forest trained on 50,000 decks of each
// finalist from each starting deck against truly random ones, one comparison at a time on every processor. It takes
// about 48 s per comparison and doesn't change the ranking. It needs Python with scikit-learn (--python names the
// interpreter), and writes its files to logs/forest-search.
import { execSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { availableParallelism, cpus } from 'node:os'
import { parseArgs } from 'node:util'
import { Worker } from 'node:worker_threads'
import { DECK_KINDS, type DeckKind } from '../src/engine/decks.ts'
import { getBase } from '../src/engine/calibrate.ts'
import { CATEGORIES, METRICS } from '../src/engine/metrics.ts'
import { OPS, type OpKey } from '../src/engine/moves.ts'
import { OP_COST, compressSeq, parseRoutine } from '../src/engine/routines.ts'
import { byTotal, costOf } from '../src/engine/tree.ts'
import { noiseLevel } from '../src/engine/scoring.ts'
import { hash } from '../src/engine/seeded.ts'
import { ENGINE_FINGERPRINT, ENGINE_VERSION } from '../src/engine/version.ts'
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
    forest: { type: 'boolean', default: false },
    python: { type: 'string', default: 'python' },
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
const label = (seq: OpKey[]) => `${compressSeq(seq)} (${costOf(seq)}u)`

const named = values.routine?.map(parseRoutine)

/** How many routines a task scores: its prefix, and with `descend` every routine that extends it. */
const taskSize = ({ seq, descend }: TreeTask) => (descend ? 1 + routineCount(maxCost - costOf(seq)) : 1)

/**
 * Stage 1's tasks, which together cover every routine within the cost limit once. A prefix with at most `target`
 * routines under it is one task. A bigger one is scored on its own, and each prefix one move longer is split the same
 * way, so no task holds much more than its share and every worker stays busy. The biggest tasks go first, so the pool
 * ends on small ones.
 */
function stageOneTasks(keep: number): TreeTask[] {
  const target = Math.ceil(routineCount(maxCost) / (workerCount * 8))
  const split = (seq: OpKey[]): TreeTask[] =>
    taskSize({ seq, descend: true, keep }) <= target
      ? [{ seq, descend: true, keep }]
      : [{ seq, descend: false, keep }, ...extensions(seq).flatMap(split)]
  const extensions = (seq: OpKey[]) => moves.filter((op) => costOf(seq) + OP_COST[op] <= maxCost).map((op) => [...seq, op])
  return extensions([]).flatMap(split).toSorted((a, b) => taskSize(b) - taskSize(a))
}

/** How many routines cost at most `budget`: each move that fits, alone or followed by any routine of what's left. */
const counted = new Map<number, number>()
function routineCount(budget: number): number {
  if (!counted.has(budget)) {
    counted.set(budget, moves.filter((op) => OP_COST[op] <= budget).reduce((total, op) => total + 1 + routineCount(budget - OP_COST[op]), 0))
  }
  return counted.get(budget)!
}

const settings: Settings = { seed: values.seed, from, deckSize, maxCost, moves, raceDecks }
const workers = Array.from({ length: workerCount }, () => new Worker(new URL('./search-worker.ts', import.meta.url), { workerData: settings }))
workers.forEach((worker) =>
  worker.on('error', (error) => {
    console.error(error)
    process.exit(1)
  }),
)

/**
 * Run tasks on the workers, each worker taking the next task when it finishes one, and call `onResult` with each result
 * as it arrives, with the index of its task.
 */
function runTasks<Result>(job: Message['job'], tasks: Message['task'][], onResult: (result: Result, index: number) => void): Promise<void> {
  let next = 0
  let done = 0
  return new Promise((resolve) => {
    if (tasks.length === 0) return resolve()
    const feed = (worker: Worker) => {
      if (next >= tasks.length) return
      const index = next++
      worker.once('message', (result: Result) => {
        onResult(result, index)
        done++
        progress(done, tasks.length)
        if (done === tasks.length) resolve()
        else feed(worker)
      })
      worker.postMessage({ job, task: tasks[index] } as Message)
    }
    workers.forEach(feed)
  })
}

/** Run tasks on the workers and collect the results in task order. */
async function runOnPool<Result>(job: Message['job'], tasks: Message['task'][]): Promise<Result[]> {
  const results: Result[] = new Array(tasks.length)
  await runTasks<Result>(job, tasks, (result, index) => (results[index] = result))
  return results
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
  /** every run's full result */
  results: RunResult[]
}

/** Collect a routine's runs from one deck: its totals, category levels and clean runs. */
function deckStats(runs: RunResult[]): DeckStats {
  return {
    clean: runs.filter((run) => run.clearCount === CATEGORIES.length).length,
    runs: runs.length,
    total: runs.map((run) => run.total),
    level: Object.fromEntries(CATEGORIES.map(({ title }) => [title, runs.map((run) => run.level[title])])),
    results: runs,
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
/** Seconds from the start to the end of each part of the search, for the JSON. */
const finished: Record<string, number> = {}
const mark = (part: string) => (finished[part] = (Date.now() - started) / 1000)
const progress = (done: number, of: number) => process.stdout.write(`  ${done}/${of} ${elapsed()}\r`)
const clearProgress = () => process.stdout.write('\r' + ' '.repeat(40) + '\r')

/** Stages 1 and 2: score every routine from one deck, then rerun the leaders from every deck. Returns both, ranked. */
async function search() {
  // Stage 1: one run of every routine from the chosen deck, ranked by its total. It races: every routine is read on the
  // first few starting decks, and only the best go on to a full run. A reading on fewer decks isn't a true level (even a
  // random deck reads above 0), so the first round only ranks, and its numbers aren't printed.
  console.log(`Stage 1: every routine costing up to ${maxCost} units, one run each from the ${from} deck (${deckSize} cards), on ${workerCount} workers.`)
  const routines = routineCount(maxCost)
  const keep = Math.min(routines, Math.max(Math.ceil(routines * raceKeep), 4 * leaderCount))
  // Each task sends back its best `keep`, and they join the best so far as they arrive, so the main thread never holds
  // more than twice `keep`, however many routines there are.
  let raced: TreeResult = []
  await runTasks<TreeResult>('tree', stageOneTasks(keep), (best) => (raced = [...raced, ...best].toSorted(byTotal).slice(0, keep)))
  clearProgress()
  mark('stage 1, first round')
  console.log(`  ${routines} routines read on ${raceDecks} decks in ${elapsed()}. The best ${keep} go on to a full run.`)
  // Sorted by their moves, survivors next to each other share prefixes, so each chunk deals its shared prefixes once.
  const survivors = raced.map(({ seq }) => seq).toSorted((a, b) => (a.join(' ') < b.join(' ') ? -1 : 1))
  const chunk = Math.max(16, Math.ceil(survivors.length / (workerCount * 8)))
  const fullTasks = Array.from({ length: Math.ceil(survivors.length / chunk) }, (_, index) => ({ seqs: survivors.slice(index * chunk, (index + 1) * chunk) }))
  const scored = (await runOnPool<TreeResult>('full', fullTasks)).flat().toSorted(byTotal)
  clearProgress()
  mark('stage 1')
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
  mark('stage 2')
  // The first round's totals read only raceDecks decks, so they rank but aren't levels.
  const firstRound = new Map(raced.map(({ seq, total }) => [compressSeq(seq), total]))
  const survivorsScored = scored.map(({ seq, total }) => ({ routine: compressSeq(seq), cost: costOf(seq), total, firstRound: firstRound.get(compressSeq(seq)) }))
  return { stage1: { routines, raceDecks, kept: keep, survivors: survivorsScored }, stage2 }
}

// With --routines, skip the search and run stage 3 on the named routines.
const searched = named ? undefined : await search()
const stage2 = searched?.stage2 ?? []
const finalists = named ?? stage2.slice(0, finalistCount).map(({ seq }) => seq)
console.log(`${named ? '' : '\n'}Stage 3: ${named ? 'the named routines' : `the top ${finalists.length}`}, ${finalRuns} runs ${fromDecks}, ranked by the weakest deck.`)
const stage3 = await routineStats(finalists, finalRuns)
stage3.sort(byWeakestDeck)
mark('stage 3')
// Reference: one perfect shuffle, measured the same way. A random deck's total averages 0 and varies a little either
// side, so this shows how close to 0 a finalist can be expected to get.
const [reference] = await routineStats([['mash']], finalRuns, true)
await Promise.all(workers.map((worker) => worker.terminate()))
mark('reference')
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

// The forest check: one comparison at a time, each on every processor. Two forests training at once took about 2.6 times
// as long as the same two in turn. Its seed comes from --seed, so the same options give the same accuracies.
const forestFolder = 'logs/forest-search'
let forest: unknown = null
if (values.forest) {
  console.log(`\nRandom forest: each finalist ${fromDecks} against truly random decks, about 48 s per comparison.`)
  const forestSeed = parseInt(hash(values.seed), 16) % 1_000_000
  const routineFlags = stage3.flatMap(({ seq }) => ['--routine', compressSeq(seq)])
  const forestArgs = ['scripts/forest.py', ...routineFlags, '--from', kinds.join(','), '--jobs', String(workerCount), '--seed', String(forestSeed), '--out', forestFolder]
  const ran = spawnSync(values.python, forestArgs, { stdio: 'inherit' })
  if (ran.status !== 0) throw new Error(`scripts/forest.py failed${ran.error ? `: ${ran.error.message}` : ''}`)
  forest = JSON.parse(readFileSync(`${forestFolder}/results.json`, 'utf8'))
  mark('forest')
}
console.log(`\nFinished in ${elapsed()}.`)

if (values.json) {
  const spread = (xs: number[]) => ({ mean: mean(xs), sd: sd(xs), max: Math.max(...xs) })
  const tally = (flags: boolean[]) => flags.filter(Boolean).length
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
            cleanByCategory: Object.fromEntries(CATEGORIES.map(({ title }) => [title, tally(stats.results.map((run) => run.clear[title]))])),
            value: Object.fromEntries(METRICS.map(({ key }) => [key, spread(stats.results.map((run) => run.value[key]))])),
            metricLevel: Object.fromEntries(METRICS.map(({ key }) => [key, spread(stats.results.map((run) => run.metricLevel[key]))])),
            runResults: stats.results,
          },
        ]
      }),
    ),
  })
  const git = (command: string) => {
    try {
      return execSync(`git ${command}`, { encoding: 'utf8' }).trim()
    } catch {
      return null
    }
  }
  const status = git('status --porcelain')
  const base = getBase(deckSize)
  const output = {
    engineVersion: ENGINE_VERSION,
    engineFingerprint: ENGINE_FINGERPRINT,
    commit: git('rev-parse HEAD'),
    uncommittedChanges: status === null ? null : status.length > 0,
    startedAt: new Date(started).toISOString(),
    node: process.version,
    cpu: cpus()[0]?.model ?? null,
    options: {
      maxCost,
      from,
      decks: kinds,
      deckSize,
      moves,
      raceDecks,
      raceKeep,
      leaderCount,
      leaderRuns,
      finalistCount,
      finalRuns,
      workerCount,
      seed: values.seed,
      routines: named?.map(compressSeq) ?? null,
      forest: values.forest,
    },
    // A metric is within the noise of random at or below its noise line, on the level scale.
    noiseLine: Object.fromEntries(METRICS.map((metric) => [metric.key, noiseLevel(metric, base)])),
    seconds: { ...finished, total: (Date.now() - started) / 1000 },
    stage1: searched?.stage1 ?? null,
    reference: summarise(reference),
    stage2: stage2.map(summarise),
    stage3: stage3.map(summarise),
    // From scripts/forest.py with --forest: its options, and for each comparison the forest's and the logistic model's
    // cross-validated accuracies with 95% intervals. null without --forest.
    forest,
  }
  writeFileSync(values.json, JSON.stringify(output, null, 2))
  console.log(`Wrote ${values.json}.`)
}
