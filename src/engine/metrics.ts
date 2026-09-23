// The twelve randomness diagnostics. Each per-deck metric takes the deck, its
// size and the card-type bounds and returns one number; position and
// classifier are computed across a whole batch of trials instead (fn: null).
import { catOf, catSizes, posOf } from './decks'
import type { Deck } from './moves'

export function mOrdering(a: Deck): number {
  const p = posOf(a)
  let r = 1
  for (let v = 1; v < a.length; v++) if (p[v] < p[v - 1]) r++
  return r
}

export function mProximity(a: Deck): number {
  const p = posOf(a)
  let c = 0
  for (let v = 0; v < a.length - 1; v++) if (Math.abs(p[v] - p[v + 1]) <= 3) c++
  return c
}

export function mDrift(a: Deck): number {
  const n = a.length
  let s = 0
  for (let i = 0; i < n - 1; i++) s += Math.abs(a[i] - a[i + 1]) - 1
  return s / (n - 1)
}

export function mChain(a: Deck): number {
  const p = posOf(a)
  let best = 1
  let run = 1
  for (let v = 1; v < a.length; v++) {
    run = p[v] > p[v - 1] ? run + 1 : 1
    best = Math.max(best, run)
  }
  return best
}

export function mStrided(a: Deck): number {
  const p = posOf(a)
  let best = 2
  let run = 2
  let d = p[1] - p[0]
  for (let v = 2; v < a.length; v++) {
    const dd = p[v] - p[v - 1]
    if (dd === d) run++
    else run = 2
    d = dd
    best = Math.max(best, run)
  }
  return best
}

export function mGradient(a: Deck): number {
  const n = a.length
  let c = 0
  for (let i = 0; i + 2 < n; i++) if (a[i + 1] === a[i] + 1 && a[i + 2] === a[i + 1] + 1) c++
  return c / n
}

export function mClump(a: Deck, n: number, b: number[]): number {
  const cs = catSizes(n)
  const w = 10
  const exp = cs.map((x) => (w * x) / n)
  let s = 0
  let m = 0
  for (let i = 0; i + w <= n; i += 1) {
    const cnt = [0, 0, 0, 0]
    for (let j = 0; j < w; j++) cnt[catOf(a[i + j], b)]++
    let dd = 0
    for (let k = 0; k < 4; k++) dd += (cnt[k] - exp[k]) * (cnt[k] - exp[k])
    s += dd
    m++
  }
  return m ? s / m : 0
}

export function mSpacing(a: Deck, n: number, b: number[]): number {
  const pos: number[] = []
  for (let i = 0; i < n; i++) if (catOf(a[i], b) === 0) pos.push(i)
  if (pos.length < 3) return 0
  const g: number[] = []
  for (let i = 1; i < pos.length; i++) g.push(pos[i] - pos[i - 1])
  const mn = g.reduce((x, y) => x + y, 0) / g.length
  let v = 0
  g.forEach((x) => (v += (x - mn) * (x - mn)))
  return Math.sqrt(v / g.length)
}

export function mCorr(a: Deck, n: number): number {
  let sx = 0
  let sy = 0
  let sxy = 0
  let sxx = 0
  let syy = 0
  const m = n - 1
  for (let i = 0; i < n - 1; i++) {
    const x = a[i]
    const y = a[i + 1]
    sx += x
    sy += y
    sxy += x * y
    sxx += x * x
    syy += y * y
  }
  const cov = sxy / m - (sx / m) * (sy / m)
  const vx = sxx / m - (sx / m) * (sx / m)
  const vy = syy / m - (sy / m) * (sy / m)
  return vx > 0 && vy > 0 ? cov / Math.sqrt(vx * vy) : 0
}

/** Original end cards still within three of their end. */
export function mEndRetention(d: Deck, n: number): number {
  let c = 0
  for (let i = 0; i <= 3; i++) {
    if (d[i] === 0) c++
    if (d[n - 1 - i] === n - 1) c++
  }
  return c
}

export type MetricKey =
  | 'ordering'
  | 'proximity'
  | 'drift'
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
 * - two:  within ±thr of the random mean
 * - band: between lo and hi
 * - low:  ≤ thr
 * - high: ≥ thr
 */
export type Side = 'two' | 'band' | 'low' | 'high'

export type WriteupRoute = '/order-tests' | '/global-tests' | '/mana-tests' | '/sticky-ends'

export interface Metric {
  k: MetricKey
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
  fn: ((d: Deck, n: number, bounds: number[]) => number) | null
  /** Short description. `<i>…</i>` marks italics; nothing else is markup. */
  desc: string
  writeup: { to: WriteupRoute; label: string }
}

const FULL = 'Full write-up'

export const METRICS: Metric[] = [
  {
    k: 'ordering', group: 'order', core: true, raw: false, unit: '%', side: 'two', title: 'Ordering', fn: mOrdering,
    desc: 'Counts the rising runs the deck breaks into — one when sorted, about fifty when random, more when stacked or reversed. Two-sided: too few and too many are both structure.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    k: 'proximity', group: 'order', core: true, raw: false, unit: '%', side: 'band', title: 'Proximity', fn: mProximity,
    desc: 'Originally-adjacent pairs still within three positions. Too many means surviving clumps; too few means the riffle spread neighbours <i>too</i> evenly — the band is asymmetric for that reason.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    k: 'drift', group: 'order', core: false, raw: true, unit: 'avg', side: 'band', title: 'Global proximity', fn: mDrift,
    desc: 'The average distance every originally-adjacent pair now sits apart, zeroed so still-neighbours count as 0. Proximity as a magnitude rather than a threshold count.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    k: 'position', group: 'structure', core: true, raw: false, unit: '%', side: 'low', title: 'Position', fn: null,
    desc: 'Asks whether any card favours a fixed slot across many trials, via a chi-square over every card–position pair. A lone deterministic pile deal fails it outright.',
    writeup: { to: '/global-tests', label: FULL },
  },
  {
    k: 'endret', group: 'structure', core: false, raw: true, unit: 'cards', side: 'two', title: 'End retention', fn: mEndRetention,
    desc: 'Original end cards still within three of their end — 0.08 when random, judged two-sided on the trial-averaged rate. Riffles pin the ends.',
    writeup: { to: '/sticky-ends', label: 'The sticky-ends write-up' },
  },
  {
    k: 'corr', group: 'order', core: true, raw: true, unit: 'r', side: 'two', title: 'Neighbor correlation', fn: mCorr,
    desc: 'Correlation between adjacent card values: +1 sorted, −1 reversed, 0 random. Any correlation either way means neighbours are not independent, so it is two-sided.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    k: 'classifier', group: 'holistic', core: false, raw: true, unit: '% detect', side: 'low', title: 'Distinguishability', fn: null,
    desc: 'A classifier trained live to tell this deck from true random; 50% is a coin flip. Readings under about 53% are its own training noise and mean nothing.',
    writeup: { to: '/global-tests', label: FULL },
  },
  {
    k: 'chain', group: 'order', core: false, raw: true, unit: 'cards', side: 'low', title: 'Longest chain', fn: mChain,
    desc: 'The longest run of consecutive cards still in order anywhere in the deck — four or five when random; longer is a surviving fragment.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    k: 'strided', group: 'structure', core: false, raw: true, unit: 'cards', side: 'low', title: 'Strided chain', fn: mStrided,
    desc: 'The longest evenly-spaced run still in order — the lattice a pile deal leaves, invisible to a straight read-through.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    k: 'gradient', group: 'order', core: false, raw: true, unit: 'density', side: 'low', title: 'Local order', fn: mGradient,
    desc: 'The density of three-plus consecutive cards still sitting together — near zero when random, so any reading is leftover sequence.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    k: 'spacing', group: 'structure', core: false, raw: false, unit: '%', side: 'two', title: 'Land spacing', fn: mSpacing,
    desc: 'How evenly the lands are spread. Clumped lands read high; lands spaced <i>too</i> regularly read low — the mana-weave signature. Two-sided.',
    writeup: { to: '/mana-tests', label: FULL },
  },
  {
    k: 'clump', group: 'composition', core: false, noCap: true, raw: true, unit: 'dev', side: 'band', title: 'Clump rate', fn: mClump,
    desc: 'How much the deck clumps by card type, averaged over trials, against the rate a random deck clumps at. Two-sided: too little means the shuffle spreads lands more evenly than chance — over-dispersion.',
    writeup: { to: '/mana-tests', label: FULL },
  },
]

export const GROUPS: [MetricGroup, string][] = [
  ['order', 'Residual order'],
  ['structure', 'Placement structure'],
  ['holistic', 'Holistic'],
  ['composition', 'Composition'],
]

export function metricByKey(k: MetricKey): Metric {
  return METRICS.find((m) => m.k === k)!
}
