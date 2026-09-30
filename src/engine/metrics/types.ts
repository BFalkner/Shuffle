import type { Deck } from '../moves.ts'

export type MetricKey = 'neighbourOrder' | 'pairOrder' | 'proximity' | 'position' | 'classifier'

/**
 * The three kinds of leftover order a shuffle can leave behind. Each metric belongs to one, except distinguishability,
 * the catch-all, which is reported alongside them.
 */
export type Category = 'order' | 'proximity' | 'position'

/** A metric's reading of random decks, which is its level 0, and of an unshuffled sorted deck, which is its level 1. */
export interface Baseline {
  /** the average reading of a batch of random decks */
  mean: number
  /** how much that reading varies from one batch of random decks to the next */
  standardDeviation: number
  /** the reading of a batch of sorted decks that were never shuffled */
  sorted: number
}

/**
 * One step of one run: the metric reads each deck added, then gives its value for the step. `start` is the deck the
 * run started from, for metrics that follow where each card started.
 */
export interface Batch {
  add(deck: Deck, start: Deck): void
  value(): number
}

/**
 * How a metric gets its baseline:
 * - batches: from its reading of many batches of random decks, and of a batch of sorted decks
 * - fixed:   from a formula or constant, with no decks needed
 */
export type Calibration = { kind: 'batches' } | { kind: 'fixed'; baseline: (deckSize: number) => Baseline }

export interface Metric {
  key: MetricKey
  /** null for distinguishability, which is reported alongside the categories */
  category: Category | null
  title: string
  /** How many of a run's shuffled decks the metric reads, from the first. */
  trials: number
  /** A fresh batch for one step of a run. */
  batch: (deckSize: number) => Batch
  calibration: Calibration
}

/** Decks in one run. Every metric except distinguishability reads all of them. */
export const RUN_DECKS = 1200

/** The power the per-part metrics use to combine their parts. See powerMean. */
export const PART_POWER = 4

/**
 * Combine per-part readings so a few bad parts aren't averaged away: the p-th root of the mean of each reading to the
 * power p. p = 1 is the plain average, and a higher p moves it toward the worst part. With p = 4, one bad part among 99
 * counts for about a third of its own reading (99^(−1/4)), where a plain average would count it for a 99th.
 */
export function powerMean(values: ArrayLike<number>, p = PART_POWER): number {
  let total = 0
  for (let index = 0; index < values.length; index++) total += values[index] ** p
  return (total / values.length) ** (1 / p)
}

/**
 * The share of observations that fall where random decks wouldn't put them: half the summed difference between the
 * observed shares and the expected ones (the total variation distance). 0 when they match, and 1 when every observation
 * falls where random decks never put one.
 */
export function mismatch(counts: ArrayLike<number>, expected: ArrayLike<number>, offset = 0): number {
  let total = 0
  for (let bin = 0; bin < expected.length; bin++) total += counts[offset + bin]
  if (!total) return 0
  let difference = 0
  for (let bin = 0; bin < expected.length; bin++) difference += Math.abs(counts[offset + bin] / total - expected[bin])
  return difference / 2
}
