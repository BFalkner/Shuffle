// The twelve randomness diagnostics. Each per-deck metric takes the deck, its
// size and the card types and returns one number; position and
// classifier are computed across a whole batch of trials instead (measure: null).
import { LAND, catSizes, posOf, type CardTypes } from './decks'
import type { Deck } from './moves'

export function mOrdering(deck: Deck): number {
  const positions = posOf(deck)
  let runs = 1
  for (let card = 1; card < deck.length; card++) if (positions[card] < positions[card - 1]) runs++
  return runs
}

export function mProximity(deck: Deck): number {
  const positions = posOf(deck)
  let closePairs = 0
  for (let card = 0; card < deck.length - 1; card++) if (Math.abs(positions[card] - positions[card + 1]) <= 3) closePairs++
  return closePairs
}

export function mDrift(deck: Deck): number {
  const deckSize = deck.length
  let total = 0
  for (let position = 0; position < deckSize - 1; position++) total += Math.abs(deck[position] - deck[position + 1]) - 1
  return total / (deckSize - 1)
}

export function mChain(deck: Deck): number {
  const positions = posOf(deck)
  let best = 1
  let run = 1
  for (let card = 1; card < deck.length; card++) {
    run = positions[card] > positions[card - 1] ? run + 1 : 1
    best = Math.max(best, run)
  }
  return best
}

export function mStrided(deck: Deck): number {
  const positions = posOf(deck)
  let best = 2
  let run = 2
  let step = positions[1] - positions[0]
  for (let card = 2; card < deck.length; card++) {
    const nextStep = positions[card] - positions[card - 1]
    if (nextStep === step) run++
    else run = 2
    step = nextStep
    best = Math.max(best, run)
  }
  return best
}

export function mGradient(deck: Deck): number {
  const deckSize = deck.length
  let triples = 0
  for (let position = 0; position + 2 < deckSize; position++) if (deck[position + 1] === deck[position] + 1 && deck[position + 2] === deck[position + 1] + 1) triples++
  return triples / deckSize
}

export function mClump(deck: Deck, deckSize: number, types: CardTypes): number {
  const sizes = catSizes(deckSize)
  const windowSize = 10
  const expected = sizes.map((size) => (windowSize * size) / deckSize)
  let total = 0
  let windows = 0
  for (let start = 0; start + windowSize <= deckSize; start += 1) {
    const counts = [0, 0, 0, 0]
    for (let offset = 0; offset < windowSize; offset++) counts[types[deck[start + offset]]]++
    let deviation = 0
    for (let category = 0; category < 4; category++) deviation += (counts[category] - expected[category]) * (counts[category] - expected[category])
    total += deviation
    windows++
  }
  return windows ? total / windows : 0
}

export function mSpacing(deck: Deck, deckSize: number, types: CardTypes): number {
  const landPositions: number[] = []
  for (let position = 0; position < deckSize; position++) if (types[deck[position]] === LAND) landPositions.push(position)
  if (landPositions.length < 3) return 0
  const gaps: number[] = []
  for (let land = 1; land < landPositions.length; land++) gaps.push(landPositions[land] - landPositions[land - 1])
  const meanGap = gaps.reduce((total, gap) => total + gap, 0) / gaps.length
  let variance = 0
  gaps.forEach((gap) => (variance += (gap - meanGap) * (gap - meanGap)))
  return Math.sqrt(variance / gaps.length)
}

export function mCorr(deck: Deck, deckSize: number): number {
  let sumCurrent = 0
  let sumNext = 0
  let sumProduct = 0
  let sumCurrentSquared = 0
  let sumNextSquared = 0
  const pairCount = deckSize - 1
  for (let position = 0; position < deckSize - 1; position++) {
    const current = deck[position]
    const next = deck[position + 1]
    sumCurrent += current
    sumNext += next
    sumProduct += current * next
    sumCurrentSquared += current * current
    sumNextSquared += next * next
  }
  const covariance = sumProduct / pairCount - (sumCurrent / pairCount) * (sumNext / pairCount)
  const varianceCurrent = sumCurrentSquared / pairCount - (sumCurrent / pairCount) * (sumCurrent / pairCount)
  const varianceNext = sumNextSquared / pairCount - (sumNext / pairCount) * (sumNext / pairCount)
  return varianceCurrent > 0 && varianceNext > 0 ? covariance / Math.sqrt(varianceCurrent * varianceNext) : 0
}

/** Original end cards still within three of their end. */
export function mEndRetention(deck: Deck, deckSize: number): number {
  let count = 0
  for (let depth = 0; depth <= 3; depth++) {
    if (deck[depth] === 0) count++
    if (deck[deckSize - 1 - depth] === deckSize - 1) count++
  }
  return count
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
 * - two:  within ±threshold of the random mean
 * - band: between low and high
 * - low:  ≤ threshold
 * - high: ≥ threshold
 */
export type Side = 'two' | 'band' | 'low' | 'high'

export type WriteupRoute = '/order-tests' | '/global-tests' | '/mana-tests' | '/sticky-ends'

export interface Metric {
  key: MetricKey
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
  measure: ((deck: Deck, deckSize: number, types: CardTypes) => number) | null
  /** Short description. `<i>…</i>` marks italics; nothing else is markup. */
  desc: string
  writeup: { to: WriteupRoute; label: string }
}

const FULL = 'Full write-up'

export const METRICS: Metric[] = [
  {
    key: 'ordering', group: 'order', core: true, raw: false, unit: '%', side: 'two', title: 'Ordering', measure: mOrdering,
    desc: 'Counts the rising runs the deck breaks into: one when sorted, about fifty when random, more when stacked or reversed. Too few and too many are both structure, so the test is two-sided.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    key: 'proximity', group: 'order', core: true, raw: false, unit: '%', side: 'band', title: 'Proximity', measure: mProximity,
    desc: 'Counts originally adjacent pairs still within three positions. Too many means clumps survived; too few means the riffle spread neighbours <i>too</i> evenly, which is why the band is asymmetric.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    key: 'drift', group: 'order', core: false, raw: true, unit: 'avg', side: 'band', title: 'Global proximity', measure: mDrift,
    desc: 'For each pair of cards now side by side, how far apart they started, minus one, so pairs that never separated count as 0. Proximity as a distance rather than a threshold count.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    key: 'position', group: 'structure', core: true, raw: false, unit: '%', side: 'low', title: 'Position', measure: null,
    desc: 'Asks whether any card favours a fixed slot across many trials, using a chi-square over every card–position pair. A single deterministic pile deal fails it outright.',
    writeup: { to: '/global-tests', label: FULL },
  },
  {
    key: 'endret', group: 'structure', core: false, raw: true, unit: 'cards', side: 'two', title: 'End retention', measure: mEndRetention,
    desc: 'Original end cards still within three of their end: 0.08 when random. It is judged two-sided on the trial-averaged rate. Riffles pin the ends.',
    writeup: { to: '/sticky-ends', label: 'The sticky-ends write-up' },
  },
  {
    key: 'corr', group: 'order', core: true, raw: true, unit: 'r', side: 'two', title: 'Neighbour correlation', measure: mCorr,
    desc: 'Correlation between adjacent card values: +1 sorted, −1 reversed, 0 random. Correlation in either direction means neighbours are not independent, so the test is two-sided.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    key: 'classifier', group: 'holistic', core: false, raw: true, unit: '% detect', side: 'low', title: 'Distinguishability', measure: null,
    desc: 'A classifier trained live to tell this deck from a truly random one; 50% is a coin flip. Readings under about 54% are within its own training noise and mean nothing.',
    writeup: { to: '/global-tests', label: FULL },
  },
  {
    key: 'chain', group: 'order', core: false, raw: true, unit: 'cards', side: 'low', title: 'Longest chain', measure: mChain,
    desc: 'The longest run of consecutive cards still in order anywhere in the deck. Random decks show four or five; anything longer is a surviving fragment.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    key: 'strided', group: 'structure', core: false, raw: true, unit: 'cards', side: 'low', title: 'Strided chain', measure: mStrided,
    desc: 'The longest evenly spaced run still in order. A pile deal leaves this lattice behind, and reading the deck straight through will not reveal it.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    key: 'gradient', group: 'order', core: false, raw: true, unit: 'density', side: 'low', title: 'Local order', measure: mGradient,
    desc: 'The density of three or more consecutive cards still sitting together. It is near zero when random, so any reading is leftover sequence.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    key: 'spacing', group: 'structure', core: false, raw: false, unit: '%', side: 'two', title: 'Land spacing', measure: mSpacing,
    desc: 'How evenly the lands are spread. Clumped lands read high; lands spaced <i>too</i> regularly read low, which is the mana-weave signature. The test is two-sided.',
    writeup: { to: '/mana-tests', label: FULL },
  },
  {
    key: 'clump', group: 'composition', core: false, noCap: true, raw: true, unit: 'dev', side: 'band', title: 'Clump rate', measure: mClump,
    desc: 'How much the deck clumps by card type, averaged over trials, against the rate a random deck clumps at. It is two-sided: too little clumping means the shuffle spreads lands more evenly than chance.',
    writeup: { to: '/mana-tests', label: FULL },
  },
]

export const GROUPS: [MetricGroup, string][] = [
  ['order', 'Residual order'],
  ['structure', 'Placement structure'],
  ['holistic', 'Holistic'],
  ['composition', 'Composition'],
]

export function metricByKey(key: MetricKey): Metric {
  return METRICS.find((metric) => metric.key === key)!
}
