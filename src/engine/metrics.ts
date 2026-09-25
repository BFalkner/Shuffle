// The seventeen randomness diagnostics. Each per-deck metric takes the deck, its
// size and the card types and returns one number; neighbour gaps, position and
// classifier are computed across a whole batch of trials instead (measure: null).
import { LAND, catSizes, posOf, type CardTypes } from './decks.ts'
import type { Deck } from './moves.ts'

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

export interface GapBins {
  /** bin index for each distance 1 to deckSize - 1 */
  binOf: Int32Array
  /** share of old-neighbour pairs a random deck puts in each bin */
  expected: Float64Array
}

const GAP_BINS = new Map<number, GapBins>()

/**
 * Bins for neighbour gaps: one per distance up to 40% of the deck, then three shared bins for the long tail. In a random
 * deck two given cards sit d places apart with probability 2(n − d) / (n(n − 1)).
 */
export function gapBins(deckSize: number): GapBins {
  let bins = GAP_BINS.get(deckSize)
  if (!bins) {
    const cut = Math.floor(deckSize * 0.4)
    const tail = deckSize - 1 - cut
    const binOf = new Int32Array(deckSize)
    const expected = new Float64Array(cut + 3)
    for (let distance = 1; distance < deckSize; distance++) {
      const bin = distance <= cut ? distance - 1 : cut + Math.min(2, Math.floor(((distance - cut - 1) * 3) / tail))
      binOf[distance] = bin
      expected[bin] += (2 * (deckSize - distance)) / (deckSize * (deckSize - 1))
    }
    bins = { binOf, expected }
    GAP_BINS.set(deckSize, bins)
  }
  return bins
}

/** Add one deck's old-neighbour gaps (card c to card c + 1) to a batch's bin counts. */
export function addGaps(counts: Int32Array, deck: Deck): void {
  const { binOf } = gapBins(deck.length)
  const positions = posOf(deck)
  for (let card = 0; card < deck.length - 1; card++) counts[binOf[Math.abs(positions[card] - positions[card + 1])]]++
}

/** Chi-square of a batch's pooled gap counts against a random deck's spread. */
export function gapChiSquare(counts: Int32Array, deckCount: number, deckSize: number): number {
  const { expected } = gapBins(deckSize)
  const pairs = deckCount * (deckSize - 1)
  let chi = 0
  for (let bin = 0; bin < expected.length; bin++) {
    const expectedCount = expected[bin] * pairs
    chi += (counts[bin] - expectedCount) ** 2 / expectedCount
  }
  return chi
}

/** Spell cards (everything but lands) in old order: ascending card number. */
function spellsInOrder(deckSize: number, types: CardTypes): number[] {
  const spells: number[] = []
  for (let card = 0; card < deckSize; card++) if (types[card] !== LAND) spells.push(card)
  return spells
}

/** Rising runs among the spells alone, ignoring lands: ordering for the cards whose order a player notices. */
export function mSpellOrdering(deck: Deck, deckSize: number, types: CardTypes): number {
  const positions = posOf(deck)
  const spells = spellsInOrder(deckSize, types)
  let runs = 1
  for (let i = 1; i < spells.length; i++) if (positions[spells[i]] < positions[spells[i - 1]]) runs++
  return runs
}

/** Pairs of spells that were next to each other among the spells and are still within three places in the deck. */
export function mSpellProximity(deck: Deck, deckSize: number, types: CardTypes): number {
  const positions = posOf(deck)
  const spells = spellsInOrder(deckSize, types)
  let closePairs = 0
  for (let i = 1; i < spells.length; i++) if (Math.abs(positions[spells[i]] - positions[spells[i - 1]]) <= 3) closePairs++
  return closePairs
}

/** Longest chain among the spells alone: consecutive spells still in forward order. */
export function mSpellChain(deck: Deck, deckSize: number, types: CardTypes): number {
  const positions = posOf(deck)
  const spells = spellsInOrder(deckSize, types)
  let best = 1
  let run = 1
  for (let i = 1; i < spells.length; i++) {
    run = positions[spells[i]] > positions[spells[i - 1]] ? run + 1 : 1
    best = Math.max(best, run)
  }
  return best
}

/** Places a player sees at once: the opening hand. */
export const OPENING_HAND = 7

/** 1 when the spell that started highest in the deck is still in the opening hand's seven places, else 0. */
export function mTopSpell(deck: Deck, _deckSize: number, types: CardTypes, start: Deck): number {
  const topSpell = start.find((card) => types[card] !== LAND)
  if (topSpell === undefined) return 0
  for (let position = 0; position < OPENING_HAND; position++) if (deck[position] === topSpell) return 1
  return 0
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
/** Whether the cards that started on top and on the bottom are still within four places of their end (0, 1 or 2). */
export function mEndRetention(deck: Deck, deckSize: number, _types: CardTypes, start: Deck): number {
  const top = start[0]
  const bottom = start[deckSize - 1]
  let count = 0
  for (let depth = 0; depth <= 3; depth++) {
    if (deck[depth] === top) count++
    if (deck[deckSize - 1 - depth] === bottom) count++
  }
  return count
}

export type MetricKey =
  | 'ordering'
  | 'proximity'
  | 'drift'
  | 'sordering'
  | 'sproximity'
  | 'schain'
  | 'topspell'
  | 'gaps'
  | 'position'
  | 'endret'
  | 'corr'
  | 'classifier'
  | 'chain'
  | 'strided'
  | 'gradient'
  | 'spacing'
  | 'clump'

export type MetricGroup = 'spells' | 'order' | 'structure' | 'holistic' | 'composition'

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
  /** start is the deck before the routine; only top-spell retention uses it */
  measure: ((deck: Deck, deckSize: number, types: CardTypes, start: Deck) => number) | null
  /**
   * Which failures a player would notice at the table: 'both' sides, only 'high' readings, or none (statistical only).
   * Recommendations are judged on these; every test is still measured and reported.
   */
  noticeable?: 'both' | 'high'
  /** Short description. `<i>…</i>` marks italics; nothing else is markup. */
  desc: string
  writeup: { to: WriteupRoute; label: string }
}

const FULL = 'Full write-up'

export const METRICS: Metric[] = [
  {
    key: 'sordering', group: 'spells', core: false, raw: true, unit: 'runs', side: 'two', title: 'Spell ordering', measure: mSpellOrdering, noticeable: 'both',
    desc: 'Ordering for the spells alone, ignoring lands. A player notices spells coming back in the same order; lands are interchangeable. Too many runs means reversed order, which is as noticeable as too few.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    key: 'sproximity', group: 'spells', core: false, raw: true, unit: 'pairs', side: 'low', title: 'Spell proximity', measure: mSpellProximity, noticeable: 'high',
    desc: 'Pairs of spells that were next to each other and are still within three places. Only too many fails: spells arriving together again is what a player sees.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    key: 'schain', group: 'spells', core: false, raw: true, unit: 'cards', side: 'low', title: 'Spell chain', measure: mSpellChain, noticeable: 'high',
    desc: 'The longest run of spells still in their old order, ignoring lands. A run of the same spells in a row is the most noticeable leftover of all.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    key: 'topspell', group: 'spells', core: false, raw: true, unit: 'rate', side: 'two', title: 'Top spell retention', measure: mTopSpell, noticeable: 'high',
    desc: 'How often the spell that started highest is still in the top seven places, the opening hand, over many shuffles. A random deck: 7 in 99. The bottom card is in end retention.',
    writeup: { to: '/sticky-ends', label: 'The sticky-ends write-up' },
  },
  {
    key: 'ordering', group: 'order', core: true, raw: false, unit: '%', side: 'two', title: 'Ordering', measure: mOrdering,
    desc: 'Counts the rising runs the deck breaks into: one when sorted, about 50 when random. Built for the mash, which leaves long runs for several passes. Too many runs is leftover order too, so the test is two-sided.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    key: 'proximity', group: 'order', core: true, raw: false, unit: '%', side: 'band', title: 'Proximity', measure: mProximity,
    desc: 'Counts pairs of cards that started side by side and are still within three places. Built for the overhand, which keeps neighbours together. Too few also fails: a pile deal or an early mash spreads neighbours <i>too</i> evenly.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    key: 'drift', group: 'order', core: false, raw: true, unit: 'avg', side: 'band', title: 'Global proximity', measure: mDrift,
    desc: 'For each pair of cards now side by side, how far apart they started. Proximity as a distance rather than a count. An overhand-only routine fails it low, because its packets never separate the pairs inside them.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    key: 'gaps', group: 'order', core: false, raw: true, unit: 'χ²', side: 'low', title: 'Neighbour gaps', measure: null,
    desc: 'How far apart cards that started side by side now sit, at every distance, compared with a random deck. Seven mashes from a sorted deck leave too many pairs touching and too few two to eight apart.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    key: 'position', group: 'structure', core: true, raw: false, unit: '%', side: 'low', title: 'Position', measure: null, noticeable: 'high',
    desc: 'Whether cards keep landing in the same places across many shuffles, using a chi-square over every card and position. Built for the pile deal, which puts every card in a fixed place.',
    writeup: { to: '/global-tests', label: FULL },
  },
  {
    key: 'endret', group: 'structure', core: false, raw: true, unit: 'cards', side: 'two', title: 'End retention', measure: mEndRetention,
    desc: 'Whether the original top card and bottom card are still within three places of their end: 0.08 when random. Built for the mash, which barely moves the ends. Two-sided, and judged on the average over many shuffles.',
    writeup: { to: '/sticky-ends', label: 'The sticky-ends write-up' },
  },
  {
    key: 'corr', group: 'order', core: true, raw: true, unit: 'r', side: 'two', title: 'Neighbour correlation', measure: mCorr,
    desc: 'Correlation between each card and the next: +1 sorted, −1 reversed, 0 random. A second reading of what proximity measures. It has never caught anything on its own.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    key: 'classifier', group: 'holistic', core: false, raw: true, unit: '% detect', side: 'low', title: 'Distinguishability', measure: null,
    desc: 'A classifier trained during each run to tell these decks from truly random ones. 50% is a coin flip. The catch-all for patterns no named test looks for. Readings under about 54% are luck.',
    writeup: { to: '/global-tests', label: FULL },
  },
  {
    key: 'chain', group: 'order', core: false, raw: true, unit: 'cards', side: 'low', title: 'Longest chain', measure: mChain,
    desc: 'The longest run of consecutive cards still in order anywhere in the deck. Random decks show four or five. The mash leaves longer runs for its first few passes.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    key: 'strided', group: 'structure', core: false, raw: true, unit: 'cards', side: 'low', title: 'Strided chain', measure: mStrided,
    desc: 'The longest run of cards evenly spaced in the old order and still in sequence. Built for the pile deal’s every-sixth-card pattern, but ordering and proximity already catch that pile, so it confirms rather than catches.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    key: 'gradient', group: 'order', core: false, raw: true, unit: 'density', side: 'low', title: 'Local order', measure: mGradient,
    desc: 'How often three or more consecutive cards still sit together in order. Near zero when random. Built for the overhand, which keeps short runs intact inside its packets.',
    writeup: { to: '/order-tests', label: FULL },
  },
  {
    key: 'spacing', group: 'structure', core: false, raw: false, unit: '%', side: 'two', title: 'Land spacing', measure: mSpacing, noticeable: 'high',
    desc: 'How much the gaps between lands vary. Built for mana weaving: lands spaced <i>too</i> evenly read low, and clumped lands read high. It clears within a mash or two.',
    writeup: { to: '/mana-tests', label: FULL },
  },
  {
    key: 'clump', group: 'composition', core: false, noCap: true, raw: true, unit: 'dev', side: 'band', title: 'Clump rate', measure: mClump,
    desc: 'How far each run of ten cards strays from the expected mix of card types, averaged over many shuffles. Catches the weaving and clumps that land spacing lets through. Too little clumping fails too.',
    writeup: { to: '/mana-tests', label: FULL },
  },
]

export const GROUPS: [MetricGroup, string][] = [
  ['spells', 'Spell order'],
  ['order', 'Residual order'],
  ['structure', 'Placement structure'],
  ['holistic', 'Holistic'],
  ['composition', 'Composition'],
]

export function metricByKey(key: MetricKey): Metric {
  return METRICS.find((metric) => metric.key === key)!
}
