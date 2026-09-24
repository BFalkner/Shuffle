// Random-deck baselines and pass thresholds for each metric.
import { BASELINES } from './baselines.ts'
import { fisher, numberedTypes } from './decks.ts'
import { METRICS, type MetricKey } from './metrics.ts'

export interface Baseline {
  mean: number
  standardDeviation: number
  /** threshold: meaning depends on the metric's side (see Side) */
  threshold: number
  /** band-side metrics only */
  high?: number
  low?: number
}

export type Base = Record<MetricKey, Baseline>

/** Measure deckCount random decks of size deckSize and derive each metric's pass rule. */
export function calibrate(deckSize: number, deckCount: number): Base {
  const types = numberedTypes(deckSize)
  const totals: Partial<Record<MetricKey, { sum: number; sumOfSquares: number }>> = {}
  METRICS.forEach((metric) => {
    if (metric.key !== 'position' && metric.key !== 'endret') totals[metric.key] = { sum: 0, sumOfSquares: 0 }
  })
  for (let trial = 0; trial < deckCount; trial++) {
    const deck = fisher(deckSize)
    METRICS.forEach((metric) => {
      if (!metric.measure || metric.key === 'endret') return
      const value = metric.measure(deck, deckSize, types)
      totals[metric.key]!.sum += value
      totals[metric.key]!.sumOfSquares += value * value
    })
  }
  const base = {} as Base
  METRICS.forEach((metric) => {
    if (metric.key === 'position' || metric.key === 'endret') return
    const total = totals[metric.key]!
    const mean = total.sum / deckCount
    const standardDeviation = Math.sqrt(Math.max(0, total.sumOfSquares / deckCount - mean * mean))
    base[metric.key] = {
      mean,
      standardDeviation,
      threshold: metric.side === 'high' ? mean - 2.5 * standardDeviation : metric.side === 'low' ? mean + 3 * standardDeviation : 3 * standardDeviation,
    }
  })

  // Proximity: per-deck upper edge, but a tight rate-based lower edge (catches over-dispersion).
  const proximity = base.proximity
  proximity.high = proximity.mean + 3 * proximity.standardDeviation
  proximity.low = proximity.mean - (3 * proximity.standardDeviation) / Math.sqrt(200)
  proximity.threshold = proximity.high

  // Clump rate and global proximity: rate-based bands on the trial average.
  const clump = base.clump
  clump.high = clump.mean + (3.5 * clump.standardDeviation) / Math.sqrt(200)
  clump.low = clump.mean - (3.5 * clump.standardDeviation) / Math.sqrt(200)
  clump.threshold = clump.high

  const drift = base.drift
  drift.high = drift.mean + (3 * drift.standardDeviation) / Math.sqrt(200)
  drift.low = drift.mean - (3 * drift.standardDeviation) / Math.sqrt(200)
  drift.threshold = drift.high

  // End retention: analytic, judged as a rate over 400 trials.
  const endRate = (2 * 4) / deckSize
  const endStandardDeviation = Math.sqrt(2 * (4 / deckSize) * (1 - 4 / deckSize))
  base.endret = { mean: endRate, standardDeviation: endStandardDeviation, threshold: (3 * endStandardDeviation) / Math.sqrt(400) }

  // Position: chi-square with (deckSize - 1)² degrees of freedom.
  const degreesOfFreedom = (deckSize - 1) * (deckSize - 1)
  base.position = { mean: degreesOfFreedom, standardDeviation: Math.sqrt(2 * degreesOfFreedom), threshold: degreesOfFreedom * 1.45 }
  base.classifier = { mean: 0.5, standardDeviation: 0.02, threshold: 0.56 }
  return base
}

const BASE_CACHE = new Map<number, Base>()

/**
 * Baseline for deckSize. The deck sizes the site offers use the stored calibration in baselines.ts, so every run judges
 * against the same pass lines. Any other size is calibrated from 400 random decks on first use, and its pass lines
 * move a little from one start to the next.
 */
export function getBase(deckSize: number): Base {
  if (BASELINES[deckSize]) return BASELINES[deckSize]
  let base = BASE_CACHE.get(deckSize)
  if (!base) {
    base = calibrate(deckSize, 400)
    BASE_CACHE.set(deckSize, base)
  }
  return base
}
