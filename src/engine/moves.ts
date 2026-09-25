// The shuffle model: each move takes a deck (an array of card ids, index 0 = top)
// and returns a new, shuffled copy. Nothing here mutates its input.

export type Deck = number[]

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

/**
 * Interleave two halves. Halves strictly alternate, and each drop is scaled by
 * that side's share of the cards still held (with stochastic rounding), so the
 * thicker half releases faster and the two deplete together.
 */
export function riffle(topHalf: Deck, bottomHalf: Deck): Deck {
  const halves = [topHalf.slice(), bottomHalf.slice()]
  let side = Math.random() < 0.5 ? 0 : 1
  const result: Deck = []
  while (halves[0].length && halves[1].length) {
    const share = halves[side].length / ((halves[0].length + halves[1].length) / 2)
    const drop = drawPacket() * share
    let count = Math.floor(drop)
    if (Math.random() < drop - count) count++
    count = Math.max(1, Math.min(halves[side].length, count))
    for (let moved = 0; moved < count; moved++) result.push(halves[side].shift()!)
    side ^= 1
  }
  while (halves[0].length) result.push(halves[0].shift()!)
  while (halves[1].length) result.push(halves[1].shift()!)
  return result
}

/** Mash / riffle: cut, then interleave the halves. */
export function mash(deck: Deck): Deck {
  const cutAt = cut(deck.length)
  return riffle(deck.slice(0, cutAt), deck.slice(cutAt))
}

/** Overhand: peel packets (mean 3, max 8) off the top, each landing on the last. */
export function overhand(deck: Deck): Deck {
  const cap = 8
  const mean = 3
  let remaining = deck.slice()
  let result: Deck = []
  while (remaining.length) {
    const packet = Math.max(1, Math.min(Math.min(remaining.length, cap), Math.floor(exponentialSample(1 / mean))))
    result = remaining.slice(0, packet).concat(result)
    remaining = remaining.slice(packet)
  }
  return result
}

/**
 * Pile: deal face down into six piles in rotation, then stack them. Deterministic.
 * Each card lands on top of its pile, so every pile comes out in reverse deal order.
 */
export function pile(deck: Deck): Deck {
  const pileCount = 6
  const piles: Deck[] = Array.from({ length: pileCount }, () => [])
  for (let position = 0; position < deck.length; position++) piles[position % pileCount].unshift(deck[position])
  let result: Deck = []
  for (const dealtPile of piles) result = result.concat(dealtPile)
  return result
}

/** Overhand the top half only; the bottom half is untouched. */
export function ohTop(deck: Deck): Deck {
  const cutAt = cut(deck.length)
  return overhand(deck.slice(0, cutAt)).concat(deck.slice(cutAt))
}

/** Overhand the bottom half only; the top half is untouched. */
export function ohBottom(deck: Deck): Deck {
  const cutAt = cut(deck.length)
  return deck.slice(0, cutAt).concat(overhand(deck.slice(cutAt)))
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
} as const

export type OpKey = keyof typeof OPS

export function isOpKey(candidate: string): candidate is OpKey {
  return Object.prototype.hasOwnProperty.call(OPS, candidate)
}

/** Time cost of each move, in units (a mash = 1). */
export const OP_COST: Record<OpKey, number> = { mash: 1, overhand: 2, pile: 4, ohr: 1, ohb: 1 }

export const OP_NAME: Record<OpKey, string> = {
  mash: 'Mash',
  overhand: 'Overhand',
  pile: 'Pile',
  ohr: 'Overhand top',
  ohb: 'Overhand bottom',
}

/** Short token shown in sequence strips. */
export const OP_TOKEN: Record<OpKey, string> = { mash: 'M', overhand: 'OH', pile: 'P', ohr: 'OHt', ohb: 'OHb' }

const TOKEN_OP: Record<string, OpKey> = { m: 'mash', oh: 'overhand', p: 'pile', oht: 'ohr', ohb: 'ohb' }

/** Parse a routine written like compressSeq prints it: "M×4·P·M×4". Also accepts spaces or commas, and x or * for ×. */
export function parseRoutine(text: string): OpKey[] {
  return text
    .split(/[·\s,]+/)
    .filter(Boolean)
    .flatMap((token) => {
      const match = /^(oht|ohb|oh|m|p)(?:[×x*](\d+))?$/i.exec(token)
      if (!match) throw new Error(`Unknown move "${token}" in "${text}". Use M, OH, P, OHt or OHb, with ×n to repeat.`)
      return Array<OpKey>(Number(match[2] ?? 1)).fill(TOKEN_OP[match[1].toLowerCase()])
    })
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

/** "M×2·OHt·M×2·OHb" — a compact label for a sequence. */
export function compressSeq(seq: readonly OpKey[]): string {
  const out: string[] = []
  let start = 0
  while (start < seq.length) {
    let end = start
    while (end < seq.length && seq[end] === seq[start]) end++
    const count = end - start
    const label = OP_TOKEN[seq[start]]
    out.push(count > 1 ? `${label}×${count}` : label)
    start = end
  }
  return out.join('·')
}
