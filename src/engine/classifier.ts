// Distinguishability: a small logistic-regression classifier trained to tell a
// method's decks from genuinely random ones. Held-out accuracy of 50% means it
// cannot tell them apart.
import { fisher } from './decks'
import { mCorr } from './metrics'
import type { Deck } from './moves'

/** Gap-spacing features plus neighbour correlation. */
export function deckFeatures(d: Deck, n: number): number[] {
  let s1 = 0
  let s2 = 0
  let sa = 0
  let c6 = 0
  let c1 = 0
  const g = n - 1
  for (let i = 0; i < n - 1; i++) {
    const gp = d[i + 1] - d[i]
    const ag = Math.abs(gp)
    s1 += gp
    s2 += gp * gp
    sa += ag
    if (ag <= 6) c6++
    if (ag === 1) c1++
  }
  const meanG = s1 / g
  const varG = s2 / g - meanG * meanG
  return [sa / g, Math.sqrt(Math.max(0, varG)), c6 / g, c1 / g, mCorr(d, n)]
}

const RANDOM_FEATURES = new Map<number, number[][]>()

/** Features of 1000 random decks of size n, cached. */
export function randomFeatures(n: number): number[][] {
  let a = RANDOM_FEATURES.get(n)
  if (!a) {
    a = []
    for (let i = 0; i < 1000; i++) a.push(deckFeatures(fisher(n), n))
    RANDOM_FEATURES.set(n, a)
  }
  return a
}

/**
 * Train on 70% of (positive ∪ negative), return accuracy on the other 30%,
 * floored at 0.5 (below-chance accuracy is noise, not signal).
 */
export function classifierAccuracy(positive: number[][], negative: number[][]): number {
  const F = positive[0].length
  const X = positive.concat(negative)
  const N = X.length
  const y: number[] = []
  for (let i = 0; i < positive.length; i++) y.push(1)
  for (let i = 0; i < negative.length; i++) y.push(0)

  // standardize
  const mu = new Array<number>(F).fill(0)
  const sd = new Array<number>(F).fill(0)
  X.forEach((r) => r.forEach((v, j) => (mu[j] += v)))
  for (let j = 0; j < F; j++) mu[j] /= N
  X.forEach((r) => r.forEach((v, j) => (sd[j] += (v - mu[j]) * (v - mu[j]))))
  for (let j = 0; j < F; j++) sd[j] = Math.sqrt(sd[j] / N) || 1
  const Z = X.map((r) => r.map((v, j) => (v - mu[j]) / sd[j]))

  // shuffled train/test split
  const idx = [...Array(N).keys()]
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = idx[i]
    idx[i] = idx[j]
    idx[j] = t
  }
  const ntr = Math.floor(N * 0.7)
  const tr = idx.slice(0, ntr)
  const te = idx.slice(ntr)

  // gradient descent
  const w = new Array<number>(F).fill(0)
  let b = 0
  const lr = 0.3
  for (let it = 0; it < 250; it++) {
    const gw = new Array<number>(F).fill(0)
    let gb = 0
    tr.forEach((k) => {
      const z = Z[k]
      let sm = b
      for (let j = 0; j < F; j++) sm += w[j] * z[j]
      const pr = 1 / (1 + Math.exp(-sm))
      const e = pr - y[k]
      for (let j = 0; j < F; j++) gw[j] += e * z[j]
      gb += e
    })
    for (let j = 0; j < F; j++) w[j] -= (lr * gw[j]) / tr.length
    b -= (lr * gb) / tr.length
  }

  let ok = 0
  te.forEach((k) => {
    const z = Z[k]
    let sm = b
    for (let j = 0; j < F; j++) sm += w[j] * z[j]
    if ((sm >= 0 ? 1 : 0) === y[k]) ok++
  })
  return Math.max(0.5, ok / te.length)
}
