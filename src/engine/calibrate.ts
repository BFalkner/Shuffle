// Each metric's baseline: what it reads for random decks (level 0) and for an unshuffled sorted deck (level 1).
import { BASELINES } from './baselines.ts'
import { fisher, numberedTypes, sortedDeck } from './decks.ts'
import { METRICS, type MetricKey } from './metrics.ts'
import type { Baseline } from './metrics/types.ts'

export type { Baseline }

export type Base = Record<MetricKey, Baseline>

/**
 * Read `batchCount` batches of random decks of size deckSize, each as large as the run the metric reads, and a batch of
 * sorted decks. A batch metric's baseline is the mean and spread of its random readings plus its sorted reading. A fixed
 * metric's comes from its formula.
 */
export function calibrate(deckSize: number, batchCount: number): Base {
  const types = numberedTypes(deckSize)
  const sorted = sortedDeck(deckSize)
  const batched = METRICS.filter((metric) => metric.calibration.kind === 'batches')
  const decksPerBatch = Math.max(...batched.map((metric) => metric.trials))
  const readings: number[][] = batched.map(() => [])
  for (let batchNumber = 0; batchNumber < batchCount; batchNumber++) {
    const open = batched.map((metric) => metric.batch(deckSize))
    for (let trial = 0; trial < decksPerBatch; trial++) {
      // A random deck dealt from the sorted one, so the sorted deck is also where each card started.
      const deck = fisher(deckSize)
      batched.forEach((metric, index) => {
        if (trial < metric.trials) open[index].add(deck, types, sorted)
      })
    }
    open.forEach((batch, index) => readings[index].push(batch.value()))
  }

  const base = {} as Base
  for (const metric of METRICS) {
    const calibration = metric.calibration
    if (calibration.kind === 'fixed') {
      base[metric.key] = calibration.baseline(deckSize)
      continue
    }
    const values = readings[batched.indexOf(metric)]
    const mean = values.reduce((total, value) => total + value, 0) / values.length
    const variance = values.length > 1 ? values.reduce((total, value) => total + (value - mean) ** 2, 0) / (values.length - 1) : 0
    const unshuffled = metric.batch(deckSize)
    for (let trial = 0; trial < metric.trials; trial++) unshuffled.add(sorted, types, sorted)
    base[metric.key] = { mean, standardDeviation: Math.sqrt(variance), sorted: unshuffled.value() }
  }
  return base
}

const BASE_CACHE = new Map<number, Base>()

/**
 * Baseline for deckSize. The deck sizes the site offers use the stored calibration in baselines.ts, so every run is
 * judged against the same baselines. Any other size is calibrated from 40 batches of random decks on first use.
 */
export function getBase(deckSize: number): Base {
  if (BASELINES[deckSize]) return BASELINES[deckSize]
  let base = BASE_CACHE.get(deckSize)
  if (!base) {
    base = calibrate(deckSize, 40)
    BASE_CACHE.set(deckSize, base)
  }
  return base
}
