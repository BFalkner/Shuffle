// Random-deck baselines and pass thresholds for each metric.
import { BASELINES } from './baselines.ts'
import { fisher, numberedTypes } from './decks.ts'
import { METRICS, type Metric, type MetricKey } from './metrics.ts'
import type { Baseline } from './metrics/types.ts'

export type { Baseline }

export type Base = Record<MetricKey, Baseline>

/**
 * Measure deckCount random decks of size deckSize and derive each metric's pass rule. How depends on the metric's
 * calibration: per-deck metrics use the mean and spread of their measure, batch metrics use their value over batches of
 * random decks, and fixed metrics use a formula.
 */
export function calibrate(deckSize: number, deckCount: number): Base {
  const types = numberedTypes(deckSize)
  const perDeck = METRICS.filter((metric) => metric.calibration.kind === 'perDeck')
  const totals = perDeck.map(() => ({ sum: 0, sumOfSquares: 0 }))
  const batched = METRICS.filter((metric) => metric.calibration.kind === 'batches')
  const batchSize = (metric: Metric) => (metric.calibration as { size: number }).size
  const open = batched.map((metric) => metric.batch(deckSize))
  const values: number[][] = batched.map(() => [])
  for (let trial = 0; trial < deckCount; trial++) {
    const deck = fisher(deckSize)
    batched.forEach((metric, index) => {
      open[index].add(deck, types)
      if ((trial + 1) % batchSize(metric) === 0) {
        values[index].push(open[index].value())
        open[index] = metric.batch(deckSize)
      }
    })
    perDeck.forEach((metric, index) => {
      const value = metric.measure!(deck, deckSize, types)
      totals[index].sum += value
      totals[index].sumOfSquares += value * value
    })
  }

  const base = {} as Base
  for (const metric of METRICS) {
    const calibration = metric.calibration
    if (calibration.kind === 'perDeck') {
      const total = totals[perDeck.indexOf(metric)]
      const mean = total.sum / deckCount
      const standardDeviation = Math.sqrt(Math.max(0, total.sumOfSquares / deckCount - mean * mean))
      base[metric.key] = calibration.rule ? calibration.rule(mean, standardDeviation) : { mean, standardDeviation, threshold: sideThreshold(metric, mean, standardDeviation) }
    } else if (calibration.kind === 'batches') {
      base[metric.key] = calibration.finish(values[batched.indexOf(metric)], deckSize)
    } else {
      base[metric.key] = calibration.baseline(deckSize)
    }
  }
  return base
}

/** The default pass line for a per-deck metric, by its side. */
function sideThreshold(metric: Metric, mean: number, standardDeviation: number): number {
  if (metric.side === 'high') return mean - 2.5 * standardDeviation
  if (metric.side === 'low') return mean + 3 * standardDeviation
  return 3 * standardDeviation
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
