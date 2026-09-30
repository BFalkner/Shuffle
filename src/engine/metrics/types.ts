import type { CardTypes } from '../decks.ts'
import type { Deck } from '../moves.ts'

export type MetricKey = 'sequence' | 'proximity' | 'spread' | 'ends' | 'lands' | 'classifier'

/**
 * The four kinds of leftover order a shuffle can leave behind. Each metric belongs to one, except distinguishability,
 * the catch-all, which is reported alongside them.
 */
export type Category = 'sequence' | 'proximity' | 'position' | 'lands'

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
  add(deck: Deck, types: CardTypes, start: Deck): void
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
