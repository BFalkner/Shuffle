import { useEffect, useRef, useState } from 'react'
import type { DeckKind } from '../../engine/decks'
import type { Experiment } from '../../engine/experiments'
import { computeResult, scoreResult } from '../../engine/simulate'
import type { ScoredResult } from './types'

// Results survive for the whole visit; the key includes everything they depend on.
const CACHE = new Map<string, ScoredResult>()
const keyFor = (experiment: Experiment, kind: DeckKind, deckSize: number) => `${kind}|${deckSize}|${experiment.seq.join(',')}`

/** How long to compute before yielding back to the browser, so the page stays responsive. */
const SLICE_MS = 120

/**
 * Simulate and score every method under the current deck condition.
 * Heavy (1200 trials each), so it runs in slices in the background; methods in
 * `priority` go first. Returns results by experiment id as they become ready.
 */
export function useMethodResults(experiments: Experiment[], kind: DeckKind, deckSize: number, priority: string[]) {
  const [, setVersion] = useState(0)
  const priorityRef = useRef(priority)
  useEffect(() => {
    priorityRef.current = priority
  })

  const results = new Map<string, ScoredResult>()
  for (const experiment of experiments) {
    const result = CACHE.get(keyFor(experiment, kind, deckSize))
    if (result) results.set(experiment.id, result)
  }
  const pending = experiments.length - results.size

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      if (cancelled) return
      const todo = experiments.filter((experiment) => !CACHE.has(keyFor(experiment, kind, deckSize)))
      if (!todo.length) return
      const priorities = priorityRef.current
      todo.sort((left, right) => Number(priorities.includes(right.id)) - Number(priorities.includes(left.id)))
      const startTime = Date.now()
      for (const experiment of todo) {
        const result = computeResult(kind, deckSize, experiment.seq)
        CACHE.set(keyFor(experiment, kind, deckSize), { ...result, ...scoreResult(result) })
        if (Date.now() - startTime > SLICE_MS) break
      }
      setVersion((previous) => previous + 1)
      timer = setTimeout(tick, 0)
    }
    timer = setTimeout(tick, 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [experiments, kind, deckSize])

  return { results, pending, total: experiments.length }
}
