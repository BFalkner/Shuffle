// Measurement: run a routine many times and read every metric at every step. Dealing the decks lives in runs.ts.
import { getBase, type Base } from './calibrate.ts'
import type { DeckKind } from './decks.ts'
import { METRICS } from './metrics.ts'
import type { Batch } from './metrics/types.ts'
import type { OpKey } from './moves.ts'
import { applyMove, dealRuns, type Apply } from './runs.ts'
import { categoryReadings, totalLevel, type Averages, type CategoryReading } from './scoring.ts'

/** Decks per run: as many as the metric that reads the most. Each metric reads the first `trials` of them. */
const T_TOTAL = Math.max(...METRICS.map((metric) => metric.trials))

export interface MethodResult {
  deckSize: number
  kind: DeckKind
  seq: OpKey[]
  /** number of moves */
  moveCount: number
  base: Base
  avg: Averages
}

/**
 * Run a routine T_TOTAL times and read every metric at every step. With steps = 'ends', only the start and the
 * last step are measured (the others read NaN): enough to score a routine, and much faster for searches. `apply` performs
 * each move; the search replaces it with a perfect shuffle to measure a truly random deck for reference.
 */
export function computeResult(
  kind: DeckKind,
  deckSize: number,
  seq: OpKey[],
  steps: 'all' | 'ends' = 'all',
  apply: Apply = applyMove,
): MethodResult {
  const moveCount = seq.length
  const measured = (step: number) => steps === 'all' || step === 0 || step === moveCount
  const base = getBase(deckSize)
  // batches[metric][step]: each metric's batch for each measured step.
  const batches: (Batch | null)[][] = METRICS.map((metric) =>
    Array.from({ length: moveCount + 1 }, (_, step) => (measured(step) ? metric.batch(deckSize) : null)),
  )

  dealRuns(
    kind,
    deckSize,
    seq,
    T_TOTAL,
    (trial, step, deck, start) => {
      METRICS.forEach((metric, index) => {
        if (trial < metric.trials) batches[index][step]!.add(deck, start)
      })
    },
    measured,
    apply,
  )

  // Values in metric order, then step order. Only the classifier draws random numbers here, and it keeps the order it
  // always had: its random decks first, then one train/test split per step.
  const avg = {} as Averages
  METRICS.forEach((metric, index) => {
    avg[metric.key] = batches[index].map((batch) => (batch ? batch.value() : NaN))
  })

  return { deckSize, kind, seq, moveCount, base, avg }
}

export interface Scored {
  /** each category's reading at the final step */
  categories: CategoryReading[]
  /** the sum of the categories' levels: 0 is random, and an unshuffled sorted deck reads about 3 */
  total: number
  /** categories within the noise of random */
  clearCount: number
}

export function scoreResult(result: MethodResult): Scored {
  const categories = categoryReadings(result.avg, result.base, result.moveCount)
  return { categories, total: totalLevel(categories), clearCount: categories.filter((reading) => reading.clear).length }
}
