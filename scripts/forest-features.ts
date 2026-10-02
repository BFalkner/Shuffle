// Shuffle many decks with the engine and write one row of features per deck, for scripts/forest.py.
// The features measure what the engine's metrics measure. The order and old-neighbour features read the card numbers,
// which are the order of a sorted deck, as the order and proximity metrics do. The position features read where the
// card that started in each tracked place ended up, as the position metric does. From sorted the two are the same.
//
// Usage: node scripts/forest-features.ts --routine "M×5·P·M×5" [--from played] --decks 50000 --out logs/forest/pile.csv [--seed n]
//        node scripts/forest-features.ts --random --decks 50000 --out logs/forest/random.csv   (truly random decks)
import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { deckFeatures, mCorr } from '../src/engine/classifier.ts'
import { DECK_KINDS, fisher, posOf, sortedDeck, startDeck, type DeckKind } from '../src/engine/decks.ts'
import { mChain, mGradient, mOrdering, mProximity, mStrided } from './forest-measures.ts'
import { OPS, type Deck } from '../src/engine/moves.ts'
import { parseRoutine } from '../src/engine/routines.ts'
import { seed } from '../src/engine/seeded.ts'

const { values } = parseArgs({
  options: {
    routine: { type: 'string' },
    random: { type: 'boolean', default: false },
    from: { type: 'string', default: 'sorted' },
    seed: { type: 'string' },
    decks: { type: 'string', default: '50000' },
    size: { type: 'string', default: '99' },
    out: { type: 'string' },
  },
})
if (!values.out || (!values.routine && !values.random)) throw new Error('Give --out and either --routine or --random.')
const deckCount = Number(values.decks)
const deckSize = Number(values.size)
const seq = values.random ? [] : parseRoutine(values.routine!)
const from = values.from as DeckKind
if (!DECK_KINDS.some((kind) => kind.value === from)) throw new Error(`--from must be one of: ${DECK_KINDS.map((kind) => kind.value).join(', ')}`)
if (values.seed !== undefined) seed(Number(values.seed))

/** Deal one deck from `from` through the routine, and keep the deck it started as. */
function dealt(): { deck: Deck; start: Deck } {
  const start = startDeck(from, deckSize)
  return { deck: seq.reduce((current, op) => OPS[op](current), start), start }
}

/** Old-neighbour distance bins: how far apart card c and card c + 1 now sit. */
const GAP_BINS: [number, number][] = [[1, 1], [2, 2], [3, 3], [4, 6], [7, 12], [13, 24], [25, 49], [50, deckSize]]
/** Starting places whose card's final position is a feature: the top and bottom three, and every seventh in between. */
const TRACKED = [...new Set([0, 1, 2, deckSize - 3, deckSize - 2, deckSize - 1, ...Array.from({ length: Math.ceil(deckSize / 7) }, (_, i) => i * 7)])]
  .filter((place) => place < deckSize)
  .sort((a, b) => a - b)

const header = [
  'ordering', 'chain', 'close_pairs', 'local_order', 'strided', 'correlation',
  ...GAP_BINS.map(([low, high]) => (low === high ? `gap_${low}` : `gap_${low}_${high}`)),
  'now_gap_mean', 'now_gap_sd', 'now_gap_near', 'now_gap_one', 'now_corr',
  ...TRACKED.map((place) => `pos_from_${place}`),
]

/** One deck's features: order and old neighbours by card number, and the tracked places' cards against `start`. */
function features(deck: Deck, start: Deck): number[] {
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
    ...TRACKED.map((place) => positions[start[place]]),
  ]
}

const rows: string[] = [header.join(',')]
for (let i = 0; i < deckCount; i++) {
  const { deck, start } = values.random ? { deck: fisher(deckSize), start: sortedDeck(deckSize) } : dealt()
  rows.push(features(deck, start).map((value) => (Number.isInteger(value) ? String(value) : value.toFixed(5))).join(','))
}
writeFileSync(values.out, rows.join('\n') + '\n')
console.log(`Wrote ${deckCount} decks (${values.random ? 'truly random' : `${values.routine} from ${from}`}) with ${header.length} features to ${values.out}.`)
