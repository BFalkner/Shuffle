// What a routine leaves behind in the worst game in 100, not on average. Each deck is read against the deck it started
// from: which cards are still directly followed by their old follower, the longest stretch of the old order left in one
// piece, how many old neighbours sit within three places of each other, and whether the old top and bottom cards are still near their ends.
//
// Usage: npm run worst-case -- [--decks 20000] [--size 99]
import { parseArgs } from 'node:util'
import { fisher, startDeck, type DeckKind } from '../src/engine/decks.ts'
import { OPS } from '../src/engine/moves.ts'
import { compressSeq, parseRoutine } from '../src/engine/routines.ts'
import { seed } from '../src/engine/seeded.ts'

const { values } = parseArgs({
  options: {
    decks: { type: 'string', default: '20000' },
    size: { type: 'string', default: '99' },
  },
})
const deckCount = Number(values.decks)
const deckSize = Number(values.size)

/** The routines behind the home page's "why we don't just mash" section, each from the deck it's for. */
const CHECKS: { kind: DeckKind; routine: string }[] = [
  { kind: 'sorted', routine: 'OHt' },
  { kind: 'sorted', routine: 'P' },
  { kind: 'played', routine: 'M×6' },
  { kind: 'played', routine: 'M×3·OHt·M×2' },
  { kind: 'played', routine: 'M×7' },
  { kind: 'played', routine: 'M×2·OHb·OHt·M×3' },
  { kind: 'sorted', routine: 'M×8' },
  { kind: 'sorted', routine: 'M×11' },
  { kind: 'sorted', routine: 'M×5·P·M×5' },
]

interface Reading {
  /** cards still directly followed by the card that followed them before */
  stillNext: number
  /** the longest stretch of the old order still in one piece, in cards */
  longestRun: number
  /** old neighbours within three places of each other, in either order */
  closePairs: number
  /** where the old top card is now, counting the top card as 1 */
  topCardAt: number
  /** where the old bottom card is now, counting up from the bottom card as 1 */
  bottomCardAt: number
}

/** Read a deck against its starting order: `old[i]` is where the card now at place i started. */
function read(old: number[]): Reading {
  const at = new Array<number>(old.length)
  for (let place = 0; place < old.length; place++) at[old[place]] = place
  let stillNext = 0
  let run = 1
  let longestRun = 1
  for (let place = 1; place < old.length; place++) {
    if (old[place] === old[place - 1] + 1) {
      stillNext++
      run++
      if (run > longestRun) longestRun = run
    } else run = 1
  }
  let closePairs = 0
  for (let card = 1; card < old.length; card++) if (Math.abs(at[card] - at[card - 1]) <= 3) closePairs++
  return { stillNext, longestRun, closePairs, topCardAt: at[0] + 1, bottomCardAt: old.length - at[old.length - 1] }
}

function readRoutine(kind: DeckKind, routine: string | null): Reading[] {
  // Without a routine, read random decks against a sorted start.
  if (!routine) return Array.from({ length: deckCount }, () => read(fisher(deckSize)))
  const seq = parseRoutine(routine)
  return Array.from({ length: deckCount }, () => {
    const start = startDeck(kind, deckSize)
    const startPlace = new Array<number>(deckSize)
    start.forEach((card, place) => (startPlace[card] = place))
    const deck = seq.reduce((current, op) => OPS[op](current), start)
    return read(deck.map((card) => startPlace[card]))
  })
}

const NEAR_AN_END: (keyof Reading)[] = ['topCardAt', 'bottomCardAt']

/** The value that only 1 deck in 100 is worse than: higher is worse, except for the end cards, where nearer the end is. */
function worstInHundred(readings: Reading[], key: keyof Reading): number {
  const sorted = readings.map((reading) => reading[key]).sort((a, b) => a - b)
  return NEAR_AN_END.includes(key) ? sorted[Math.floor(0.01 * (sorted.length - 1))] : sorted[Math.ceil(0.99 * (sorted.length - 1))]
}

const mean = (readings: Reading[], key: keyof Reading) => readings.reduce((sum, reading) => sum + reading[key], 0) / readings.length
const share = (readings: Reading[], test: (reading: Reading) => boolean) => readings.filter(test).length / readings.length

seed(deckSize)
console.log(`${deckCount} decks each, ${deckSize} cards. Each cell is the mean, then the worst game in 100.\n`)
console.log(`  ${'routine'.padEnd(28)}${'still next'.padEnd(13)}${'longest run'.padEnd(13)}${'close pairs'.padEnd(13)}${'top card at'.padEnd(13)}${'bottom at'.padEnd(13)}top 5  bottom 5`)
for (const { kind, routine } of [{ kind: 'sorted' as DeckKind, routine: null }, ...CHECKS]) {
  const readings = readRoutine(kind, routine)
  const label = routine ? `${compressSeq(parseRoutine(routine))} from ${kind}` : 'random deck'
  const cells = (['stillNext', 'longestRun', 'closePairs', 'topCardAt', 'bottomCardAt'] as const).map((key) => `${mean(readings, key).toFixed(1)}, ${worstInHundred(readings, key)}`.padEnd(13))
  const nearEnd = (key: keyof Reading) => `${(100 * share(readings, (reading) => reading[key] <= 5)).toFixed(1)}%`.padEnd(7)
  console.log(`  ${label.padEnd(28)}${cells.join('')}${nearEnd('topCardAt')}${nearEnd('bottomCardAt')}`)
}
