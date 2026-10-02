// Measurement: run a routine many times and read every metric at every step. Dealing the decks lives in runs.ts.
import { getBase, type Base } from './calibrate.ts'
import type { DeckKind } from './decks.ts'
import { METRICS } from './metrics.ts'
import type { Batch } from './metrics/types.ts'
import type { Deck, OpKey } from './moves.ts'
import { applyMove, dealRuns, type Apply } from './runs.ts'
import { categoryReadings, totalLevel, type Averages, type CategoryReading } from './scoring.ts'

/** Decks per run: as many as the metric that reads the most. Each metric reads the first `trials` of them. */
export const T_TOTAL = Math.max(...METRICS.map((metric) => metric.trials))

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
  return scoreAt(result.avg, result.base, result.moveCount)
}

/**
 * Score decks dealt elsewhere, such as by walkRoutines, as one step: each metric reads the first `trials` of them, and
 * each deck's starting deck is the one at the same place in `starts`. Distinguishability belongs to no category, so it
 * adds nothing to the score: it reads NaN and costs nothing. The other metrics draw no random numbers.
 */
export function scoreDecks(decks: Deck[], starts: Deck[]): Scored {
  const deckSize = decks[0].length
  const avg = Object.fromEntries(
    METRICS.map((metric) => {
      if (!metric.category) return [metric.key, [NaN]]
      const batch = metric.batch(deckSize)
      decks.slice(0, metric.trials).forEach((deck, trial) => batch.add(deck, starts[trial]))
      return [metric.key, [batch.value()]]
    }),
  ) as Averages
  return scoreAt(avg, getBase(deckSize), 0)
}

function scoreAt(avg: Averages, base: Base, step: number): Scored {
  const categories = categoryReadings(avg, base, step)
  return { categories, total: totalLevel(categories), clearCount: categories.filter((reading) => reading.clear).length }
}
