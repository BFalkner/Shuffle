// One worker thread for search.ts. For stage 1 it scores whole subtrees of routines on a few decks, then single routines
// on all the decks. For stages 2 and 3 it scores single runs.
// Every task seeds the random numbers from its own description, so results don't depend on which worker runs it or
// how many workers there are.
import { parentPort, workerData } from 'node:worker_threads'
import { randomFeatures } from '../src/engine/classifier.ts'
import { fisher, startDeck, type DeckKind } from '../src/engine/decks.ts'
import { OPS, type Deck, type OpKey } from '../src/engine/moves.ts'
import { compressSeq } from '../src/engine/routines.ts'
import { hash, seed } from '../src/engine/seeded.ts'
import { T_TOTAL, computeResult, scoreDecks, scoreResult } from '../src/engine/simulate.ts'
import { byTotal, walkRoutines, type ScoredRoutine } from '../src/engine/tree.ts'

export interface Settings {
  seed: string
  from: DeckKind
  deckSize: number
  maxCost: number
  moves: OpKey[]
  /** how many of stage 1's starting decks the first round reads */
  raceDecks: number
}

/**
 * Stage 1, first round: score `seq`, and with `descend` every routine that extends it within the cost limit. Only the
 * best `keep` come back. The best `keep` overall are always among the best `keep` of each task, so nothing is lost, and
 * the main thread never holds every routine.
 */
export interface TreeTask {
  seq: OpKey[]
  descend: boolean
  keep: number
}
export type TreeResult = ScoredRoutine[]

/** Stage 1, second round: score each routine on all of stage 1's starting decks. */
export interface FullTask {
  seqs: OpKey[][]
}

/** Stages 2 and 3: one run of `seq` from `kind`. With `perfect`, every move is a perfect shuffle, for the reference. */
export interface RunTask {
  seq: OpKey[]
  kind: DeckKind
  run: number
  perfect: boolean
}
export interface RunResult {
  total: number
  clearCount: number
  /** each category's level, by category title */
  level: Record<string, number>
}

export type Message = { job: 'tree'; task: TreeTask } | { job: 'full'; task: FullTask } | { job: 'run'; task: RunTask }

const settings = workerData as Settings
const seedFrom = (text: string) => seed(parseInt(hash(`${settings.seed} ${text}`), 16))

// The classifier deals its random decks once and keeps them, so deal them before any task, from a fixed seed.
seedFrom('random features')
randomFeatures(settings.deckSize)

// Stage 1's starting decks, the same in every worker, so every routine starts from the same decks.
let starts: Deck[] | undefined
function stageOneStarts(): Deck[] {
  if (!starts) {
    seedFrom('starting decks')
    starts = Array.from({ length: T_TOTAL }, () => startDeck(settings.from, settings.deckSize))
  }
  return starts
}

function scoreTree({ seq, descend, keep }: TreeTask): TreeResult {
  const from = stageOneStarts().slice(0, settings.raceDecks)
  const scored: TreeResult = []
  seedFrom(`tree ${compressSeq(seq)}`)
  walkRoutines(from, seq, settings.moves, settings.maxCost, descend, (routine, decks) => scored.push({ seq: routine, total: scoreDecks(decks, from).total }))
  return scored.toSorted(byTotal).slice(0, keep)
}

/** Deal each routine on its own from all of stage 1's starting decks, seeded by the routine, and score it. */
function scoreFull({ seqs }: FullTask): TreeResult {
  const from = stageOneStarts()
  return seqs.map((seq) => {
    seedFrom(`full ${compressSeq(seq)}`)
    const decks = seq.reduce((dealt, op) => dealt.map((deck) => OPS[op](deck)), from)
    return { seq, total: scoreDecks(decks, from).total }
  })
}

function scoreRun({ seq, kind, run, perfect }: RunTask): RunResult {
  seedFrom(`run ${compressSeq(seq)} ${kind} ${run}${perfect ? ' perfect' : ''}`)
  const scored = scoreResult(computeResult(kind, settings.deckSize, seq, 'ends', perfect ? (deck) => fisher(deck.length) : undefined))
  return {
    total: scored.total,
    clearCount: scored.clearCount,
    level: Object.fromEntries(scored.categories.map(({ title, level }) => [title, level])),
  }
}

parentPort!.on('message', (message: Message) => {
  if (message.job === 'tree') parentPort!.postMessage(scoreTree(message.task))
  else if (message.job === 'full') parentPort!.postMessage(scoreFull(message.task))
  else parentPort!.postMessage(scoreRun(message.task))
})
