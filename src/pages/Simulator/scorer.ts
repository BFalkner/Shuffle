// Scoring runs in a small pool of web workers (scoring.worker.ts). Results are cached for the visit by everything they
// depend on: the starting deck, its size and the moves. The page says which routines it wants, most important first, and
// each idle worker takes the first one not yet scored or in progress.
import { useEffect, useSyncExternalStore } from 'react'
import type { DeckKind } from '../../engine/decks'
import type { OpKey } from '../../engine/moves'
import { scoreResult, type MethodResult } from '../../engine/simulate'
import type { ScoredResult } from './types'

export interface ScoreJob {
  /** what the result depends on: the starting deck, its size and the moves */
  key: string
  /**
   * What the result is shown for, such as one method from one starting deck. While a slot's new moves are scored, it
   * shows the last result that arrived for it, marked stale.
   */
  slot: string
  kind: DeckKind
  deckSize: number
  seq: OpKey[]
}

export function scoreJob(slot: string, kind: DeckKind, deckSize: number, seq: OpKey[]): ScoreJob {
  return { key: `${kind}|${deckSize}|${seq.join(',')}`, slot: `${slot}|${kind}|${deckSize}`, kind, deckSize, seq }
}

export interface Scored {
  result: ScoredResult
  /** the result is for earlier moves than the slot has now */
  stale: boolean
}

interface Slot {
  worker: Worker
  /** the key it is scoring, or null when idle */
  busyWith: string | null
}

const cache = new Map<string, ScoredResult>()
/** the key of the last result that arrived for each slot */
const latestForSlot = new Map<string, string>()
/** every slot that has asked for each key, so a result that arrives after its slot moved on still counts as its latest */
const slotsAsking = new Map<string, Set<string>>()
let wanted: ScoreJob[] = []
let pool: Slot[] | null = null
let version = 0
const listeners = new Set<() => void>()

/** One worker per spare core, up to four: enough to keep up with editing without starving the page. */
function startPool(): Slot[] {
  const size = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1))
  return Array.from({ length: size }, () => {
    const slot: Slot = { worker: new Worker(new URL('./scoring.worker.ts', import.meta.url), { type: 'module' }), busyWith: null }
    slot.worker.addEventListener('message', (event: MessageEvent<{ key: string; result: MethodResult }>) => {
      const { key, result } = event.data
      cache.set(key, { ...result, ...scoreResult(result) })
      slotsAsking.get(key)?.forEach((slotName) => latestForSlot.set(slotName, key))
      slot.busyWith = null
      version++
      listeners.forEach((listener) => listener())
      dispatch()
    })
    return slot
  })
}

/** Give each idle worker the most important routine that is neither scored nor already being scored. */
function dispatch(): void {
  pool ??= startPool()
  const inProgress = new Set(pool.map((slot) => slot.busyWith))
  pool
    .filter((slot) => slot.busyWith === null)
    .forEach((slot) => {
      const job = wanted.find((candidate) => !cache.has(candidate.key) && !inProgress.has(candidate.key))
      if (!job) return
      inProgress.add(job.key)
      slot.busyWith = job.key
      slot.worker.postMessage(job)
    })
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Ask for these routines to be scored, most important first, replacing any earlier request, and re-render as each
 * result arrives. Returns a lookup that gives a job's result once it is ready, or until then the slot's last result.
 */
export function useScores(jobs: ScoreJob[]): (job: ScoreJob) => Scored | undefined {
  useSyncExternalStore(subscribe, () => version)
  // The signature stands in for the jobs: a new array with the same routines asks for nothing new.
  const signature = jobs.map((job) => `${job.slot}=${job.key}`).join(';')
  useEffect(() => {
    wanted = jobs
    jobs.forEach((job) => slotsAsking.set(job.key, (slotsAsking.get(job.key) ?? new Set()).add(job.slot)))
    // Results already cached count as the latest for the slots now asking for them.
    jobs.filter((job) => cache.has(job.key)).forEach((job) => latestForSlot.set(job.slot, job.key))
    dispatch()
  }, [signature]) // eslint-disable-line react-hooks/exhaustive-deps
  return (job) => {
    const fresh = cache.get(job.key)
    if (fresh) return { result: fresh, stale: false }
    const last = cache.get(latestForSlot.get(job.slot) ?? '')
    return last && { result: last, stale: true }
  }
}
