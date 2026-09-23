// Random-deck baselines and pass thresholds for each metric.
import { catBounds, fisher } from './decks'
import { METRICS, type MetricKey } from './metrics'

export interface Baseline {
  mean: number
  sd: number
  /** threshold: meaning depends on the metric's side (see Side) */
  thr: number
  /** band-side metrics only */
  hi?: number
  lo?: number
}

export type Base = Record<MetricKey, Baseline>

/** Measure R random decks of size n and derive each metric's pass rule. */
export function calibrate(n: number, R: number): Base {
  const b = catBounds(n)
  const acc: Partial<Record<MetricKey, { s: number; ss: number }>> = {}
  METRICS.forEach((m) => {
    if (m.k !== 'position' && m.k !== 'endret') acc[m.k] = { s: 0, ss: 0 }
  })
  for (let t = 0; t < R; t++) {
    const d = fisher(n)
    METRICS.forEach((m) => {
      if (!m.fn || m.k === 'endret') return
      const v = m.fn(d, n, b)
      acc[m.k]!.s += v
      acc[m.k]!.ss += v * v
    })
  }
  const base = {} as Base
  METRICS.forEach((m) => {
    if (m.k === 'position' || m.k === 'endret') return
    const a = acc[m.k]!
    const mn = a.s / R
    const sd = Math.sqrt(Math.max(0, a.ss / R - mn * mn))
    base[m.k] = {
      mean: mn,
      sd,
      thr: m.side === 'high' ? mn - 2.5 * sd : m.side === 'low' ? mn + 3 * sd : 3 * sd,
    }
  })

  // Proximity: per-deck upper edge, but a tight rate-based lower edge (catches over-dispersion).
  const bp = base.proximity
  bp.hi = bp.mean + 3 * bp.sd
  bp.lo = bp.mean - (3 * bp.sd) / Math.sqrt(200)
  bp.thr = bp.hi

  // Clump rate and global proximity: rate-based bands on the trial average.
  const bc = base.clump
  bc.hi = bc.mean + (3.5 * bc.sd) / Math.sqrt(200)
  bc.lo = bc.mean - (3.5 * bc.sd) / Math.sqrt(200)
  bc.thr = bc.hi

  const bd = base.drift
  bd.hi = bd.mean + (3 * bd.sd) / Math.sqrt(200)
  bd.lo = bd.mean - (3 * bd.sd) / Math.sqrt(200)
  bd.thr = bd.hi

  // End retention: analytic, judged as a rate over 400 trials.
  const pe = (2 * 4) / n
  const sde = Math.sqrt(2 * (4 / n) * (1 - 4 / n))
  base.endret = { mean: pe, sd: sde, thr: (3 * sde) / Math.sqrt(400) }

  // Position: chi-square with (n-1)² degrees of freedom.
  const dof = (n - 1) * (n - 1)
  base.position = { mean: dof, sd: Math.sqrt(2 * dof), thr: dof * 1.45 }
  base.classifier = { mean: 0.5, sd: 0.02, thr: 0.56 }
  return base
}

const BASE_CACHE = new Map<number, Base>()

/** Calibrated baseline for deck size n (400 random decks), cached. */
export function getBase(n: number): Base {
  let b = BASE_CACHE.get(n)
  if (!b) {
    b = calibrate(n, 400)
    BASE_CACHE.set(n, b)
  }
  return b
}
