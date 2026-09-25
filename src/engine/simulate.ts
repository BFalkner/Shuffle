// Run a shuffle method many times and average every diagnostic at every step.
import { getBase, type Base } from './calibrate.ts'
import { classifierAccuracy, deckFeatures, randomFeatures } from './classifier.ts'
import { startDeck, type CardTypes, type DeckKind } from './decks.ts'
import { METRICS, addGaps, gapBins, gapChiSquare, type MetricKey } from './metrics.ts'
import { OPS, type Deck, type OpKey } from './moves.ts'
import { compositeScore, passWith, type Averages } from './scoring.ts'

// Trial counts: per-deck metrics, end retention, classifier features, and total runs (position χ²).
const T_METRIC = 200
const T_ENDRET = 400
/** Tests read as a rate over T_ENDRET trials rather than a per-deck average. */
const RATE_KEYS: MetricKey[] = ['endret', 'topspell']
const T_CLASSIFIER = 1000
const T_TOTAL = 1200

export interface MethodResult {
  deckSize: number
  kind: DeckKind
  seq: OpKey[]
  /** number of moves */
  moveCount: number
  base: Base
  avg: Averages
}

/**
 * Run a routine T_TOTAL times and average every diagnostic at every step. With steps = 'ends', only the start and the
 * last step are measured (the others read NaN): enough to score a routine, and much faster for searches. `apply` performs
 * each move; the search replaces it with a perfect shuffle to measure a truly random deck for reference.
 */
export function computeResult(
  kind: DeckKind,
  deckSize: number,
  seq: OpKey[],
  steps: 'all' | 'ends' = 'all',
  apply: (deck: Deck, op: OpKey) => Deck = (deck, op) => OPS[op](deck),
): MethodResult {
  const moveCount = seq.length
  const measured = (step: number) => steps === 'all' || step === 0 || step === moveCount
  const base = getBase(deckSize)
  const scalar = METRICS.filter((metric) => metric.measure).map((metric) => metric.key)
  const sums = {} as Record<MetricKey, Float64Array>
  scalar.forEach((key) => (sums[key] = new Float64Array(moveCount + 1)))
  const posCount: Int32Array[] = []
  for (let step = 0; step <= moveCount; step++) posCount.push(new Int32Array(deckSize * deckSize))
  const binCount = gapBins(deckSize).expected.length
  const gapCount: Int32Array[] = []
  for (let step = 0; step <= moveCount; step++) gapCount.push(new Int32Array(binCount))
  const stepFeat: number[][][] = []
  for (let step = 0; step <= moveCount; step++) stepFeat.push([])

  let trial = 0
  const rec = (step: number, deck: number[], types: CardTypes, start: number[]) => {
    METRICS.forEach((metric) => {
      if (!metric.measure) return
      if (trial < (RATE_KEYS.includes(metric.key) ? T_ENDRET : T_METRIC)) sums[metric.key][step] += metric.measure(deck, deckSize, types, start)
    })
    if (trial < T_METRIC) addGaps(gapCount[step], deck)
    const slotCounts = posCount[step]
    for (let position = 0; position < deckSize; position++) slotCounts[deck[position] * deckSize + position]++
    if (trial < T_CLASSIFIER) stepFeat[step].push(deckFeatures(deck, deckSize))
  }

  for (trial = 0; trial < T_TOTAL; trial++) {
    const start = startDeck(kind, deckSize)
    const types = start.types
    let deck = start.deck
    rec(0, deck, types, start.deck)
    for (let step = 0; step < moveCount; step++) {
      deck = apply(deck, seq[step])
      if (measured(step + 1)) rec(step + 1, deck, types, start.deck)
    }
  }

  const avg = {} as Averages
  scalar.forEach((key) => {
    const div = RATE_KEYS.includes(key) ? T_ENDRET : T_METRIC
    avg[key] = []
    for (let step = 0; step <= moveCount; step++) avg[key].push(measured(step) ? sums[key][step] / div : NaN)
  })

  // Neighbour gaps: chi-square of the old-neighbour distances pooled over T_METRIC decks.
  avg.gaps = []
  for (let step = 0; step <= moveCount; step++) avg.gaps.push(measured(step) ? gapChiSquare(gapCount[step], T_METRIC, deckSize) : NaN)

  // Position: chi-square of the card × slot table against uniform.
  avg.position = []
  const expected = T_TOTAL / deckSize
  for (let step = 0; step <= moveCount; step++) {
    if (!measured(step)) {
      avg.position.push(NaN)
      continue
    }
    const slotCounts = posCount[step]
    let chi = 0
    for (let cell = 0; cell < deckSize * deckSize; cell++) {
      const difference = slotCounts[cell] - expected
      chi += (difference * difference) / expected
    }
    avg.position.push(chi)
  }

  avg.classifier = []
  const randomSet = randomFeatures(deckSize)
  for (let step = 0; step <= moveCount; step++) avg.classifier.push(measured(step) ? classifierAccuracy(stepFeat[step], randomSet) : NaN)

  return { deckSize, kind, seq, moveCount, base, avg }
}

export interface Scored {
  /** diagnostics passed at the final step */
  passCount: number
  /** composite score 0–1 */
  score: number
  /** names of diagnostics still failing */
  fails: string[]
}

export function scoreResult(result: MethodResult): Scored {
  const failing = METRICS.filter((metric) => !passWith(metric, result.avg[metric.key][result.moveCount], result.base))
  return {
    passCount: METRICS.length - failing.length,
    score: compositeScore(result.avg, result.base),
    fails: failing.map((metric) => metric.title),
  }
}
