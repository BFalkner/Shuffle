// Pass/fail rules, progress-toward-random, the composite score, and display formatting.
import type { Base, Baseline } from './calibrate'
import { METRICS, type Metric, type MetricKey } from './metrics'

/** Per-metric averages at every step: avg[k][step]. */
export type Averages = Record<MetricKey, number[]>

export function passWith(m: Metric, val: number, base: Base): boolean {
  const b = base[m.k]
  if (m.side === 'band') return val >= b.lo! && val <= b.hi!
  if (m.side === 'high') return val >= b.thr
  if (m.side === 'low') return val <= b.thr
  return Math.abs(val - b.mean) <= b.thr
}

/** Physical floor for chart scaling: -1 for correlation, 0 otherwise. */
export function minFloor(m: Metric): number {
  return m.k === 'corr' ? -1 : 0
}

/** How far from the mean still counts as "near random" for this metric. */
export function marginScale(m: Metric, b: Baseline): number {
  if (m.side === 'band') return b.hi! - b.mean
  if (m.side === 'two') return b.thr
  return Math.abs((b.thr !== undefined ? b.thr : b.mean) - b.mean)
}

/** 1 = at the random mean, 0 = as far off as the start (or the margin), can go negative. */
export function progressRaw(m: Metric, v: number, start: number, b: Baseline): number {
  const mu = b.mean
  const den = Math.max(Math.abs(mu - start), marginScale(m, b) || 1)
  return 1 - Math.abs(v - mu) / den
}

export function progressAt(m: Metric, v: number, start: number, b: Baseline): number {
  return Math.max(0, Math.min(1, progressRaw(m, v, start, b)))
}

/** Progress from the first step to the last, 0–1. */
export function metricProgress(m: Metric, avg: Averages, base: Base): number {
  const a = avg[m.k]
  return progressAt(m, a[a.length - 1], a[0], base[m.k])
}

/**
 * Weighted mean of every metric's progress (core metrics count double),
 * capped at the lowest-scoring failing metric (except noCap metrics).
 */
export function compositeScore(avg: Averages, base: Base): number {
  let w = 0
  let s = 0
  METRICS.forEach((m) => {
    const k = m.core ? 2 : 1
    s += k * metricProgress(m, avg, base)
    w += k
  })
  const sc = s / w
  let cap = 1
  METRICS.forEach((m) => {
    if (m.noCap) return
    const fin = avg[m.k][avg[m.k].length - 1]
    if (!passWith(m, fin, base)) cap = Math.min(cap, metricProgress(m, avg, base))
  })
  return Math.min(sc, cap)
}

export function worstMetric(avg: Averages, base: Base): { m: Metric; p: number } {
  let wm = METRICS[0]
  let wp = 2
  METRICS.forEach((m) => {
    const pr = metricProgress(m, avg, base)
    if (pr < wp) {
      wp = pr
      wm = m
    }
  })
  return { m: wm, p: wp }
}

/** Value as displayed: raw metrics as-is, others as % of the way to random. */
export function displayValue(m: Metric, v: number, avg: Averages, base: Base): number {
  if (m.raw) return v
  return progressRaw(m, v, avg[m.k][0], base[m.k]) * 100
}

export function fmt(v: number, k: MetricKey): string {
  if (k === 'classifier') return `${Math.round(v * 100)}%`
  if (k === 'corr') return v.toFixed(2)
  if (k === 'position') return v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : `${Math.round(v)}`
  if (k === 'gradient') return v.toFixed(3)
  if (k === 'clump') return v.toFixed(2)
  if (v < 10) return v.toFixed(1)
  return `${Math.round(v)}`
}

/** Format a display value (see displayValue). */
export function fmtDisplay(m: Metric, v: number): string {
  return m.raw ? fmt(v, m.k) : `${Math.round(v)}%`
}
