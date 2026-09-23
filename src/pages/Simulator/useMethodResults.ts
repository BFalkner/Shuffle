import { useEffect, useRef, useState } from 'react'
import type { DeckKind } from '../../engine/decks'
import type { Experiment } from '../../engine/experiments'
import { computeResult, scoreResult } from '../../engine/simulate'
import type { ScoredResult } from './types'

// Results survive for the whole visit; the key includes everything they depend on.
const CACHE = new Map<string, ScoredResult>()
const keyFor = (e: Experiment, kind: DeckKind, n: number) => `${kind}|${n}|${e.seq.join(',')}`

/** How long to compute before yielding back to the browser, so the page stays responsive. */
const SLICE_MS = 120

/**
 * Simulate and score every method under the current deck condition.
 * Heavy (1200 trials each), so it runs in slices in the background; methods in
 * `priority` go first. Returns results by experiment id as they become ready.
 */
export function useMethodResults(experiments: Experiment[], kind: DeckKind, n: number, priority: string[]) {
  const [, setVersion] = useState(0)
  const priorityRef = useRef(priority)
  useEffect(() => {
    priorityRef.current = priority
  })

  const results = new Map<string, ScoredResult>()
  for (const e of experiments) {
    const r = CACHE.get(keyFor(e, kind, n))
    if (r) results.set(e.id, r)
  }
  const pending = experiments.length - results.size

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      if (cancelled) return
      const todo = experiments.filter((e) => !CACHE.has(keyFor(e, kind, n)))
      if (!todo.length) return
      const pr = priorityRef.current
      todo.sort((a, b) => Number(pr.includes(b.id)) - Number(pr.includes(a.id)))
      const t0 = Date.now()
      for (const e of todo) {
        const r = computeResult(kind, n, e.seq)
        CACHE.set(keyFor(e, kind, n), { ...r, ...scoreResult(r) })
        if (Date.now() - t0 > SLICE_MS) break
      }
      setVersion((v) => v + 1)
      timer = setTimeout(tick, 0)
    }
    timer = setTimeout(tick, 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [experiments, kind, n])

  return { results, pending, total: experiments.length }
}
