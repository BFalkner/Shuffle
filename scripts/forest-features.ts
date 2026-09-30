// Shuffle many decks with the engine and write one row of features per deck, for scripts/forest.py.
// Every feature is measured against the deck's starting order, which is the sorted deck: card c started at position c.
//
// Usage: node scripts/forest-features.ts --routine "M×5·P·M×5" --decks 50000 --out logs/forest/pile.csv
//        node scripts/forest-features.ts --random --decks 50000 --out logs/forest/random.csv   (truly random decks)
import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { deckFeatures, mCorr } from '../src/engine/classifier.ts'
import { fisher, posOf, sortedDeck } from '../src/engine/decks.ts'
import { mChain, mGradient, mOrdering, mProximity, mStrided } from './forest-measures.ts'
import { OPS, type Deck } from '../src/engine/moves.ts'
import { parseRoutine } from '../src/engine/routines.ts'

const { values } = parseArgs({
  options: {
    routine: { type: 'string' },
    random: { type: 'boolean', default: false },
    decks: { type: 'string', default: '50000' },
    size: { type: 'string', default: '99' },
    out: { type: 'string' },
  },
})
if (!values.out || (!values.routine && !values.random)) throw new Error('Give --out and either --routine or --random.')
const deckCount = Number(values.decks)
const deckSize = Number(values.size)
const seq = values.random ? [] : parseRoutine(values.routine!)

/** Old-neighbour distance bins: how far apart card c and card c + 1 now sit. */
const GAP_BINS: [number, number][] = [[1, 1], [2, 2], [3, 3], [4, 6], [7, 12], [13, 24], [25, 49], [50, deckSize]]
/** Cards whose final position is a feature: the old top and bottom three, and every seventh card in between. */
const TRACKED = [...new Set([0, 1, 2, deckSize - 3, deckSize - 2, deckSize - 1, ...Array.from({ length: Math.ceil(deckSize / 7) }, (_, i) => i * 7)])]
  .filter((card) => card < deckSize)
  .sort((a, b) => a - b)

const header = [
  'ordering', 'chain', 'close_pairs', 'local_order', 'strided', 'correlation',
  ...GAP_BINS.map(([low, high]) => (low === high ? `gap_${low}` : `gap_${low}_${high}`)),
  'now_gap_mean', 'now_gap_sd', 'now_gap_near', 'now_gap_one', 'now_corr',
  ...TRACKED.map((card) => `pos_card_${card}`),
]

/** One deck's features, all against the sorted starting order. */
function features(deck: Deck): number[] {
  const positions = posOf(deck)
  const gaps = GAP_BINS.map(() => 0)
  for (let card = 0; card < deckSize - 1; card++) {
    const distance = Math.abs(positions[card + 1] - positions[card])
    gaps[GAP_BINS.findIndex(([low, high]) => distance >= low && distance <= high)]++
  }
  return [
    mOrdering(deck),
    mChain(deck),
    mProximity(deck),
    mGradient(deck),
    mStrided(deck),
    mCorr(deck, deckSize),
    ...gaps.map((count) => count / (deckSize - 1)),
    ...deckFeatures(deck, deckSize),
    ...TRACKED.map((card) => positions[card]),
  ]
}

const rows: string[] = [header.join(',')]
for (let i = 0; i < deckCount; i++) {
  const deck = values.random ? fisher(deckSize) : seq.reduce((current, op) => OPS[op](current), sortedDeck(deckSize))
  rows.push(features(deck).map((value) => (Number.isInteger(value) ? String(value) : value.toFixed(5))).join(','))
}
writeFileSync(values.out, rows.join('\n') + '\n')
console.log(`Wrote ${deckCount} decks (${values.random ? 'truly random' : values.routine}) with ${header.length} features to ${values.out}.`)
