import type { CardTypes } from '../decks.ts'
import type { Deck } from '../moves.ts'

export type MetricKey =
  | 'ordering'
  | 'proximity'
  | 'drift'
  | 'gaps'
  | 'position'
  | 'endret'
  | 'corr'
  | 'classifier'
  | 'chain'
  | 'strided'
  | 'gradient'
  | 'spacing'
  | 'clump'

export type MetricGroup = 'order' | 'structure' | 'holistic' | 'composition'

/**
 * How a metric passes:
 * - two:  within ±threshold of the random mean
 * - band: between low and high
 * - low:  ≤ threshold
 * - high: ≥ threshold
 */
export type Side = 'two' | 'band' | 'low' | 'high'

/** A metric's random-deck average and its pass line. */
export interface Baseline {
  mean: number
  standardDeviation: number
  /** threshold: meaning depends on the metric's side (see Side) */
  threshold: number
  /** band-side metrics only */
  high?: number
  low?: number
}

/** One step of one run: the metric reads each deck added, then gives its value for the step. */
export interface Batch {
  add(deck: Deck, types: CardTypes): void
  value(): number
}

/**
 * How a metric gets its pass line from random decks:
 * - perDeck: from the mean and standard deviation of its measure over random decks, by its side unless a rule is given
 * - batches: from its batch value over batches of random decks of the given size
 * - fixed:   from a formula or constant, with no random decks needed
 */
export type Calibration =
  | { kind: 'perDeck'; rule?: (mean: number, standardDeviation: number) => Baseline }
  | { kind: 'batches'; size: number; finish: (values: number[], deckSize: number) => Baseline }
  | { kind: 'fixed'; baseline: (deckSize: number) => Baseline }

export type WriteupRoute = '/order-tests' | '/global-tests' | '/mana-tests' | '/sticky-ends'

export interface Metric {
  key: MetricKey
  group: MetricGroup
  title: string
  /** core metrics count double in the composite score */
  core: boolean
  /** raw: shown in natural units; otherwise shown as % of the way to random */
  raw: boolean
  unit: string
  side: Side
  /** excluded from the composite score cap */
  noCap?: boolean
  /** The metric's reading of one deck, for metrics averaged over decks; null for metrics read across a whole batch. */
  measure: ((deck: Deck, deckSize: number, types: CardTypes) => number) | null
  /** How many of a run's shuffled decks the metric reads, from the first. */
  trials: number
  /** A fresh batch for one step of a run. */
  batch: (deckSize: number) => Batch
  calibration: Calibration
  /** How to show a raw value; by default one decimal place under 10, else a whole number. */
  format?: (value: number) => string
  /** Physical floor for chart scaling; 0 unless set. */
  floor?: number
  /** Short description. `<i>…</i>` marks italics; nothing else is markup. */
  desc: string
  writeup: { to: WriteupRoute; label: string }
}

/** The usual label for a link to a test's write-up. */
export const FULL = 'Full write-up'

/** Decks read by a metric averaged per deck. */
export const PER_DECK_TRIALS = 200

/** A batch that averages a per-deck measure over the first `trials` decks. */
export function averageBatch(measure: (deck: Deck, deckSize: number, types: CardTypes) => number, trials: number) {
  return (deckSize: number): Batch => {
    let sum = 0
    return { add: (deck, types) => void (sum += measure(deck, deckSize, types)), value: () => sum / trials }
  }
}
