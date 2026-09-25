// Pass/fail rules, progress-toward-random, the composite score, and display formatting.
import type { Base, Baseline } from './calibrate.ts'
import { AREAS, METRICS, type Area, type Metric, type MetricKey } from './metrics.ts'
import { AREA_REFERENCE } from './areaReference.ts'

/** Per-metric averages at every step: avg[key][step]. */
export type Averages = Record<MetricKey, number[]>

export function passWith(metric: Metric, value: number, base: Base): boolean {
  const baseline = base[metric.key]
  if (metric.side === 'band') return value >= baseline.low! && value <= baseline.high!
  if (metric.side === 'high') return value >= baseline.threshold
  if (metric.side === 'low') return value <= baseline.threshold
  return Math.abs(value - baseline.mean) <= baseline.threshold
}

/**
 * How far a value sits from the random mean, as a fraction of the distance to the pass line on that side: 0 at the
 * random mean, 1 on the pass line, above 1 when the test fails. Each test keeps its own tolerance, so degrees compare
 * across tests. One-sided tests read 0 on the side that can't fail.
 */
export function testDegree(metric: Metric, value: number, base: Base): number {
  const baseline = base[metric.key]
  const offset = value - baseline.mean
  if (metric.side === 'band') return offset >= 0 ? offset / (baseline.high! - baseline.mean) : -offset / (baseline.mean - baseline.low!)
  if (metric.side === 'low') return Math.max(0, offset) / (baseline.threshold - baseline.mean)
  if (metric.side === 'high') return Math.max(0, -offset) / (baseline.mean - baseline.threshold)
  return Math.abs(offset) / baseline.threshold
}

/**
 * The degree of a failure a player would notice: testDegree on the noticeable side only, 0 on the other side, and 0
 * for statistical-only tests. A noticeable degree above 1 means the test fails in a way that shows up at the table.
 */
export function noticeableDegree(metric: Metric, value: number, base: Base): number {
  if (!metric.noticeable) return 0
  if (metric.noticeable === 'high' && value < base[metric.key].mean) return 0
  return testDegree(metric, value, base)
}

export interface AreaReading {
  /** worst test degree in the area: above 1 means the area fails */
  degree: number
  /** worst noticeable degree in the area: above 1 means a noticeable failure */
  noticed: number
  /**
   * degree and noticed minus what a perfect shuffle reads in this area on average: 0 is as random as a perfect shuffle.
   * Subtracting, not dividing, keeps the pass-line scale; a perfect shuffle's readings are near 0 in some areas.
   */
  excess: number
  noticedExcess: number
  /** the test behind degree, and behind noticed */
  worstTest: string
  noticedTest: string
}

/**
 * Each area's reading at one step. An area's degree is its worst test's degree, so failing several tests in one area
 * counts once. Areas with more tests read higher even on a random deck, because the worst of more noisy readings is
 * higher; the excess figures subtract a perfect shuffle's average (areaReference.ts) so areas compare fairly.
 */
export function areaReadings(avg: Averages, base: Base, step: number, deckSize: number): Record<Area, AreaReading> {
  const reference = AREA_REFERENCE[deckSize]
  const readings = {} as Record<Area, AreaReading>
  for (const area of [...AREAS.map(([key]) => key), 'holistic'] as Area[]) {
    let degree = 0
    let noticed = 0
    let worstTest = ''
    let noticedTest = ''
    for (const metric of METRICS.filter((candidate) => candidate.area === area)) {
      const value = avg[metric.key][step]
      const testReading = testDegree(metric, value, base)
      const noticedReading = noticeableDegree(metric, value, base)
      if (testReading >= degree) [degree, worstTest] = [testReading, metric.title]
      if (noticedReading >= noticed) [noticed, noticedTest] = [noticedReading, metric.title]
    }
    const scale = reference?.[area]
    readings[area] = {
      degree,
      noticed,
      excess: degree - (scale?.degree ?? 0),
      noticedExcess: noticed - (scale?.noticed ?? 0),
      worstTest,
      noticedTest,
    }
  }
  return readings
}

/** Physical floor for chart scaling: -1 for correlation, 0 otherwise. */
export function minFloor(metric: Metric): number {
  return metric.key === 'corr' ? -1 : 0
}

/** How far from the mean still counts as "near random" for this metric. */
export function marginScale(metric: Metric, baseline: Baseline): number {
  if (metric.side === 'band') return baseline.high! - baseline.mean
  if (metric.side === 'two') return baseline.threshold
  return Math.abs((baseline.threshold !== undefined ? baseline.threshold : baseline.mean) - baseline.mean)
}

/** 1 = at the random mean, 0 = as far off as the start (or the margin), can go negative. */
export function progressRaw(metric: Metric, value: number, start: number, baseline: Baseline): number {
  const mean = baseline.mean
  const scale = Math.max(Math.abs(mean - start), marginScale(metric, baseline) || 1)
  return 1 - Math.abs(value - mean) / scale
}

export function progressAt(metric: Metric, value: number, start: number, baseline: Baseline): number {
  return Math.max(0, Math.min(1, progressRaw(metric, value, start, baseline)))
}

/** Progress from the first step to the last, 0–1. */
export function metricProgress(metric: Metric, avg: Averages, base: Base): number {
  const values = avg[metric.key]
  return progressAt(metric, values[values.length - 1], values[0], base[metric.key])
}

/**
 * Mean progress over the four areas, each area weighted equally no matter how many tests it has (inside an area, core
 * metrics count double). Capped at the lowest-scoring failing metric, except noCap metrics.
 */
export function compositeScore(avg: Averages, base: Base): number {
  const areaProgress = AREAS.map(([area]) => {
    let totalWeight = 0
    let weightedSum = 0
    METRICS.filter((metric) => metric.area === area).forEach((metric) => {
      const weight = metric.core ? 2 : 1
      weightedSum += weight * metricProgress(metric, avg, base)
      totalWeight += weight
    })
    return weightedSum / totalWeight
  })
  const average = areaProgress.reduce((a, b) => a + b, 0) / areaProgress.length
  let cap = 1
  METRICS.forEach((metric) => {
    if (metric.noCap) return
    const finalValue = avg[metric.key][avg[metric.key].length - 1]
    if (!passWith(metric, finalValue, base)) cap = Math.min(cap, metricProgress(metric, avg, base))
  })
  return Math.min(average, cap)
}

export function worstMetric(avg: Averages, base: Base): { metric: Metric; progress: number } {
  let worst = METRICS[0]
  let worstProgress = 2
  METRICS.forEach((metric) => {
    const progress = metricProgress(metric, avg, base)
    if (progress < worstProgress) {
      worstProgress = progress
      worst = metric
    }
  })
  return { metric: worst, progress: worstProgress }
}

/** Value as displayed: raw metrics as-is, others as % of the way to random. */
export function displayValue(metric: Metric, value: number, avg: Averages, base: Base): number {
  if (metric.raw) return value
  return progressRaw(metric, value, avg[metric.key][0], base[metric.key]) * 100
}

export function fmt(value: number, key: MetricKey): string {
  if (key === 'classifier') return `${Math.round(value * 100)}%`
  if (key === 'corr') return value.toFixed(2)
  if (key === 'position') return value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `${Math.round(value / 1e3)}k` : `${Math.round(value)}`
  if (key === 'gradient') return value.toFixed(3)
  if (key === 'clump') return value.toFixed(2)
  if (value < 10) return value.toFixed(1)
  return `${Math.round(value)}`
}

/** Format a display value (see displayValue). */
export function fmtDisplay(metric: Metric, value: number): string {
  return metric.raw ? fmt(value, metric.key) : `${Math.round(value)}%`
}
