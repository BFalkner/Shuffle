// Run a shuffle method many times and average every diagnostic at every step.
import { getBase, type Base } from './calibrate'
import { classifierAccuracy, deckFeatures, randomFeatures } from './classifier'
import { catBounds, startDeck, type DeckKind } from './decks'
import { METRICS, type MetricKey } from './metrics'
import { OPS, type OpKey } from './moves'
import { compositeScore, passWith, type Averages } from './scoring'

// Trial counts: per-deck metrics, end retention, classifier features, and total runs (position χ²).
const T_METRIC = 200
const T_ENDRET = 400
const T_CLASSIFIER = 1000
const T_TOTAL = 1200

export interface MethodResult {
  n: number
  kind: DeckKind
  seq: OpKey[]
  /** number of moves */
  L: number
  base: Base
  avg: Averages
}

export function computeResult(kind: DeckKind, n: number, seq: OpKey[]): MethodResult {
  const L = seq.length
  const bounds = catBounds(n)
  const base = getBase(n)
  const scalar = METRICS.filter((m) => m.fn).map((m) => m.k)
  const sums = {} as Record<MetricKey, Float64Array>
  scalar.forEach((k) => (sums[k] = new Float64Array(L + 1)))
  const posCount: Int32Array[] = []
  for (let s = 0; s <= L; s++) posCount.push(new Int32Array(n * n))
  const stepFeat: number[][][] = []
  for (let s = 0; s <= L; s++) stepFeat.push([])

  let t = 0
  const rec = (step: number, deck: number[]) => {
    METRICS.forEach((m) => {
      if (!m.fn) return
      if (t < (m.k === 'endret' ? T_ENDRET : T_METRIC)) sums[m.k][step] += m.fn(deck, n, bounds)
    })
    const pc = posCount[step]
    for (let i = 0; i < n; i++) pc[deck[i] * n + i]++
    if (t < T_CLASSIFIER) stepFeat[step].push(deckFeatures(deck, n))
  }

  for (t = 0; t < T_TOTAL; t++) {
    let d = startDeck(kind, n)
    rec(0, d)
    for (let s = 0; s < L; s++) {
      d = OPS[seq[s]](d)
      rec(s + 1, d)
    }
  }

  const avg = {} as Averages
  scalar.forEach((k) => {
    const div = k === 'endret' ? T_ENDRET : T_METRIC
    avg[k] = []
    for (let s = 0; s <= L; s++) avg[k].push(sums[k][s] / div)
  })

  // Position: chi-square of the card × slot table against uniform.
  avg.position = []
  const exp = T_TOTAL / n
  for (let s = 0; s <= L; s++) {
    const pc = posCount[s]
    let chi = 0
    for (let i = 0; i < n * n; i++) {
      const dd = pc[i] - exp
      chi += (dd * dd) / exp
    }
    avg.position.push(chi)
  }

  avg.classifier = []
  const rf = randomFeatures(n)
  for (let s = 0; s <= L; s++) avg.classifier.push(classifierAccuracy(stepFeat[s], rf))

  return { n, kind, seq, L, base, avg }
}

export interface Scored {
  /** diagnostics passed at the final step */
  passCount: number
  /** composite score 0–1 */
  score: number
  /** names of diagnostics still failing */
  fails: string[]
}

export function scoreResult(r: MethodResult): Scored {
  const failing = METRICS.filter((m) => !passWith(m, r.avg[m.k][r.L], r.base))
  return {
    passCount: METRICS.length - failing.length,
    score: compositeScore(r.avg, r.base),
    fails: failing.map((m) => m.title),
  }
}
