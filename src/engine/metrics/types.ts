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
  measure: ((deck: Deck, deckSize: number, types: CardTypes) => number) | null
  /** Short description. `<i>…</i>` marks italics; nothing else is markup. */
  desc: string
  writeup: { to: WriteupRoute; label: string }
}

/** The usual label for a link to a test's write-up. */
export const FULL = 'Full write-up'
