import type { Deck } from '../moves.ts'
import { RUN_DECKS, type Metric } from './types.ts'

// Pair order runs on every deck at every step, so it is written for speed: plain loops, and one set of seen cards per
// batch that each deck clears and reuses instead of allocating its own.
//
// The seen cards are a bitset: card c is bit (c & 31) of word c >> 5, and each word keeps a count of its set bits. A
// 99-card deck needs 4 words. Counting the seen cards below a number adds the counts of the words before its word, then
// the set bits below it in its own word. That measured 40% faster than a Fenwick tree for decks this size.

/** The cards seen so far while reading one deck. */
interface Seen {
  /** bit (card & 31) of words[card >> 5] is set once the card is seen */
  words: Int32Array
  /** counts[word]: the set bits in words[word] */
  counts: Int32Array
}

function emptySeen(deckSize: number): Seen {
  const wordCount = Math.ceil(deckSize / 32)
  return { words: new Int32Array(wordCount), counts: new Int32Array(wordCount) }
}

/** The number of set bits in a 32-bit word. */
function countBits(word: number): number {
  word -= (word >>> 1) & 0x55555555
  word = (word & 0x33333333) + ((word >>> 2) & 0x33333333)
  return Math.imul((word + (word >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24
}

/** How many cards numbered below `card` have been seen. */
function countSeenBelow(seen: Seen, card: number): number {
  const word = card >>> 5
  let total = 0
  for (let before = 0; before < word; before++) total += seen.counts[before]
  // (1 << bit) - 1 keeps the bits below `bit`; for bit 31 it wraps to 0x7fffffff, which is still right.
  return total + countBits(seen.words[word] & ((1 << (card & 31)) - 1))
}

function markSeen(seen: Seen, card: number): void {
  const word = card >>> 5
  seen.words[word] |= 1 << (card & 31)
  seen.counts[word]++
}

/**
 * The pairs of cards out of their old order. Reading the deck from the bottom up, each card is out of order with every
 * lower-numbered card already seen below it. `seen` is cleared first.
 */
function countInversions(deck: Deck, seen: Seen): number {
  seen.words.fill(0)
  seen.counts.fill(0)
  let inversions = 0
  for (let place = deck.length - 1; place >= 0; place--) {
    const card = deck[place]
    inversions += countSeenBelow(seen, card)
    markSeen(seen, card)
  }
  return inversions
}

/** Kendall's tau from an inversion count: +1 with none (every pair in its old order), −1 with every pair reversed. */
function tauFromInversions(inversions: number, deckSize: number): number {
  return 1 - (4 * inversions) / (deckSize * (deckSize - 1))
}

/**
 * Kendall's tau against the old order: +1 when every pair of cards is still in its old order, −1 when every pair is
 * reversed, and 0 for a random deck on average.
 */
export function kendallTau(deck: Deck): number {
  return tauFromInversions(countInversions(deck, emptySeen(deck.length)), deck.length)
}

/**
 * Pair order: of every pair of cards, whether they are still in their old order, at every spacing, not just old
 * neighbours. Neighbour order reads each pair of old neighbours on its own, so it misses a small order bias spread across
 * the whole deck, the kind slower routines leave near the clean line: cards a few places apart in the old order stay in
 * order a little more often than chance. The batch averages Kendall's tau with its sign, then drops the sign, so
 * reliably reversed reads as high as reliably kept.
 */
export const pairOrder: Metric = {
  key: 'pairOrder',
  category: 'order',
  title: 'Pair order',
  trials: RUN_DECKS,
  batch: (deckSize) => {
    const seen = emptySeen(deckSize)
    let sum = 0
    let count = 0
    return {
      add: (deck) => {
        sum += tauFromInversions(countInversions(deck, seen), deckSize)
        count++
      },
      value: () => Math.abs(sum / count),
    }
  },
  calibration: { kind: 'batches' },
}
