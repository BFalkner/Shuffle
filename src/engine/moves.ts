// The shuffle model: each move takes a deck (an array of card ids, index 0 = top)
// and returns a new, shuffled copy. Nothing here mutates its input.
//
// A half overhand leaves the deck split: splitAt is the number of cards in the top half. The next mash or cut uses that
// split instead of making its own, as a hand does when it overhands a half and then mashes or restacks the same halves.
// Every move returns a new array, and slice() drops splitAt, so a split never outlives the move after it.

export type Deck = number[] & { splitAt?: number }

/** Box–Muller normal sample. */
export function gauss(mean: number, standardDeviation: number): number {
  let uniform1 = 0
  let uniform2 = 0
  while (uniform1 === 0) uniform1 = Math.random()
  while (uniform2 === 0) uniform2 = Math.random()
  return mean + standardDeviation * Math.sqrt(-2 * Math.log(uniform1)) * Math.cos(2 * Math.PI * uniform2)
}

/** Where a hand cuts a deck of deckSize cards: gaussian around the middle, σ = 7%, clamped to the middle third. */
export function cut(deckSize: number): number {
  const lowest = Math.floor(deckSize / 3)
  const highest = Math.floor((2 * deckSize) / 3)
  return Math.max(lowest, Math.min(highest, Math.round(gauss(deckSize / 2, deckSize * 0.07))))
}

/** Where the deck is split: the split a half overhand left, or a new cut if the deck is whole. */
function splitOf(deck: Deck): number {
  return deck.splitAt ?? cut(deck.length)
}

// Riffle packet sizes, fitted to a hand-measured mash: mostly single cards.
const PACKET_SIZES = [1, 2, 3, 4]
const PACKET_WEIGHTS = [80, 15, 4, 1]
const PACKET_CUM = (() => {
  let runningTotal = 0
  const cumulative: number[] = []
  for (const weight of PACKET_WEIGHTS) {
    runningTotal += weight
    cumulative.push(runningTotal)
  }
  return { cumulative, total: runningTotal }
})()

function drawPacket(): number {
  const roll = Math.random() * PACKET_CUM.total
  for (let packet = 0; packet < PACKET_SIZES.length; packet++) if (roll < PACKET_CUM.cumulative[packet]) return PACKET_SIZES[packet]
  return 1
}

/** Exponential sample with the given rate. */
function exponentialSample(rate: number): number {
  return -Math.log(1 - Math.random()) / rate
}

// The moves below run for every deck in every run, so they are written for speed: each one writes into a single result
// array by index, with no shift, unshift, slice or concat per card or packet. Each draws its random numbers in the
// same order as the plain versions it replaced, so the same seed deals the same decks.

/**
 * Interleave top[topFrom..topTo) with bottom[bottomFrom..bottomTo) into a new deck. Halves strictly alternate, and each
 * drop is scaled by that side's share of the cards still held (with stochastic rounding), so the thicker half releases
 * faster and the two deplete together. The halves are read by index; neither array changes.
 */
function interleave(top: Deck, topFrom: number, topTo: number, bottom: Deck, bottomFrom: number, bottomTo: number): Deck {
  const result: Deck = []
  // The next card each half will drop.
  let topNext = topFrom
  let bottomNext = bottomFrom
  let side = Math.random() < 0.5 ? 0 : 1
  while (topNext < topTo && bottomNext < bottomTo) {
    const topHeld = topTo - topNext
    const bottomHeld = bottomTo - bottomNext
    const held = side === 0 ? topHeld : bottomHeld
    const share = held / ((topHeld + bottomHeld) / 2)
    const drop = drawPacket() * share
    let count = Math.floor(drop)
    if (Math.random() < drop - count) count++
    count = Math.max(1, Math.min(held, count))
    if (side === 0) {
      for (const end = topNext + count; topNext < end; topNext++) result.push(top[topNext])
    } else {
      for (const end = bottomNext + count; bottomNext < end; bottomNext++) result.push(bottom[bottomNext])
    }
    side ^= 1
  }
  // One half has run out: the rest of the other falls on the bottom.
  for (; topNext < topTo; topNext++) result.push(top[topNext])
  for (; bottomNext < bottomTo; bottomNext++) result.push(bottom[bottomNext])
  return result
}

/**
 * Interleave two halves. Halves strictly alternate, and each drop is scaled by
 * that side's share of the cards still held (with stochastic rounding), so the
 * thicker half releases faster and the two deplete together.
 */
export function riffle(topHalf: Deck, bottomHalf: Deck): Deck {
  return interleave(topHalf, 0, topHalf.length, bottomHalf, 0, bottomHalf.length)
}

/** Mash / riffle: split the deck, unless it is split already, then interleave the halves. */
export function mash(deck: Deck): Deck {
  const cutAt = splitOf(deck)
  return interleave(deck, 0, cutAt, deck, cutAt, deck.length)
}

const OVERHAND_PACKET_MEAN = 3
const OVERHAND_PACKET_CAP = 8

/**
 * Overhand deck[from..to) into result[from..to): peel packets off the top, each landing on the last. The first packet
 * ends up at the bottom of the range and the last on top, so the range fills from its bottom up, each packet keeping
 * its own order.
 */
function overhandInto(deck: Deck, from: number, to: number, result: Deck): void {
  let taken = from
  let end = to
  while (taken < to) {
    const packet = Math.max(1, Math.min(Math.min(to - taken, OVERHAND_PACKET_CAP), Math.floor(exponentialSample(1 / OVERHAND_PACKET_MEAN))))
    end -= packet
    for (let card = 0; card < packet; card++) result[end + card] = deck[taken + card]
    taken += packet
  }
}

/** Overhand: peel packets (mean 3, max 8) off the top, each landing on the last. */
export function overhand(deck: Deck): Deck {
  const result: Deck = new Array<number>(deck.length).fill(0)
  overhandInto(deck, 0, deck.length, result)
  return result
}

/**
 * Pile: deal face down into six piles in rotation, then stack them. Deterministic.
 * Each card lands on top of its pile, so every pile comes out in reverse deal order.
 */
export function pile(deck: Deck): Deck {
  const pileCount = 6
  const result: Deck = []
  for (let dealtPile = 0; dealtPile < pileCount; dealtPile++) {
    // This pile holds the cards dealt at dealtPile, dealtPile + 6, …; the last one dealt is on top.
    const lastDealt = dealtPile + pileCount * Math.floor((deck.length - 1 - dealtPile) / pileCount)
    for (let position = lastDealt; position >= dealtPile; position -= pileCount) result.push(deck[position])
  }
  return result
}

/** Overhand the top half only; the bottom half is untouched. The deck stays split. */
export function ohTop(deck: Deck): Deck {
  const cutAt = splitOf(deck)
  const result: Deck = deck.slice()
  overhandInto(deck, 0, cutAt, result)
  result.splitAt = cutAt
  return result
}

/** Overhand the bottom half only; the top half is untouched. The deck stays split. */
export function ohBottom(deck: Deck): Deck {
  const cutAt = splitOf(deck)
  const result: Deck = deck.slice()
  overhandInto(deck, cutAt, deck.length, result)
  result.splitAt = cutAt
  return result
}

/**
 * Cut: split the deck, unless it is split already, and put the bottom half on top. Every card keeps the card after it,
 * except at the cut and where the old bottom now meets the old top.
 */
export function cutDeck(deck: Deck): Deck {
  const cutAt = splitOf(deck)
  const lifted = deck.length - cutAt
  const result: Deck = new Array<number>(deck.length)
  for (let position = 0; position < deck.length; position++) {
    result[position] = position < lifted ? deck[cutAt + position] : deck[position - lifted]
  }
  return result
}

/** Off-centre riffle: the halves merge offset by `offset` cards, so both new ends come from the middle. */
export function offCentreRiffle(deck: Deck, offset: number): Deck {
  const deckSize = deck.length
  const cutAt = cut(deckSize)
  const clippedOffset = Math.min(offset, cutAt - 1, deckSize - cutAt - 1)
  const topHalf = deck.slice(0, cutAt)
  const bottomHalf = deck.slice(cutAt)
  return bottomHalf.slice(0, clippedOffset).concat(riffle(topHalf.slice(0, topHalf.length - clippedOffset), bottomHalf.slice(clippedOffset)), topHalf.slice(topHalf.length - clippedOffset))
}

export const OPS = {
  mash,
  overhand,
  pile,
  ohr: ohTop,
  ohb: ohBottom,
  cut: cutDeck,
} as const

export type OpKey = keyof typeof OPS

export function isOpKey(candidate: string): candidate is OpKey {
  return Object.prototype.hasOwnProperty.call(OPS, candidate)
}

/** Apply a sequence of moves, returning every intermediate state (states[0] is the input). */
export function runStates(start: Deck, seq: readonly OpKey[]): Deck[] {
  let deck = start.slice()
  const states = [deck.slice()]
  for (const op of seq) {
    deck = OPS[op](deck)
    states.push(deck.slice())
  }
  return states
}
