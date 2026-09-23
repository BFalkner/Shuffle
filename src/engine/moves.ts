// The shuffle model: each move takes a deck (an array of card ids, index 0 = top)
// and returns a new, shuffled copy. Nothing here mutates its input.

export type Deck = number[]

/** Box–Muller normal sample. */
export function gauss(mean: number, sd: number): number {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** Where a hand cuts a deck of n cards: gaussian around the middle, σ = 7%, clamped to the middle third. */
export function cut(n: number): number {
  const lo = Math.floor(n / 3)
  const hi = Math.floor((2 * n) / 3)
  return Math.max(lo, Math.min(hi, Math.round(gauss(n / 2, n * 0.07))))
}

// Riffle packet sizes, fitted to a hand-measured mash: mostly single cards.
const PACKET_SIZES = [1, 2, 3, 4]
const PACKET_WEIGHTS = [80, 15, 4, 1]
const PACKET_CUM = (() => {
  let s = 0
  const c: number[] = []
  for (const w of PACKET_WEIGHTS) {
    s += w
    c.push(s)
  }
  return { c, t: s }
})()

function drawPacket(): number {
  const r = Math.random() * PACKET_CUM.t
  for (let i = 0; i < PACKET_SIZES.length; i++) if (r < PACKET_CUM.c[i]) return PACKET_SIZES[i]
  return 1
}

/** Exponential sample with rate l. */
function expov(l: number): number {
  return -Math.log(1 - Math.random()) / l
}

/**
 * Interleave two halves. Halves strictly alternate, and each drop is scaled by
 * that side's share of the cards still held (with stochastic rounding), so the
 * thicker half releases faster and the two deplete together.
 */
export function riffle(a: Deck, b: Deck): Deck {
  const s = [a.slice(), b.slice()]
  let c = Math.random() < 0.5 ? 0 : 1
  const r: Deck = []
  while (s[0].length && s[1].length) {
    const share = s[c].length / ((s[0].length + s[1].length) / 2)
    const x = drawPacket() * share
    let k = Math.floor(x)
    if (Math.random() < x - k) k++
    k = Math.max(1, Math.min(s[c].length, k))
    for (let i = 0; i < k; i++) r.push(s[c].shift()!)
    c ^= 1
  }
  while (s[0].length) r.push(s[0].shift()!)
  while (s[1].length) r.push(s[1].shift()!)
  return r
}

/** Mash / riffle: cut, then interleave the halves. */
export function mash(d: Deck): Deck {
  const k = cut(d.length)
  return riffle(d.slice(0, k), d.slice(k))
}

/** Overhand: peel packets (mean 3, max 8) off the top, each landing on the last. */
export function overhand(d: Deck): Deck {
  const cap = 8
  const mean = 3
  let rem = d.slice()
  let r: Deck = []
  while (rem.length) {
    const k = Math.max(1, Math.min(Math.min(rem.length, cap), Math.floor(expov(1 / mean))))
    r = rem.slice(0, k).concat(r)
    rem = rem.slice(k)
  }
  return r
}

/** Pile: deal into six piles in rotation, then stack them. Deterministic. */
export function pile(d: Deck): Deck {
  const np = 6
  const p: Deck[] = Array.from({ length: np }, () => [])
  for (let i = 0; i < d.length; i++) p[i % np].push(d[i])
  let r: Deck = []
  for (const x of p) r = r.concat(x)
  return r
}

/** Overhand the top half only; the bottom half is untouched. */
export function ohTop(d: Deck): Deck {
  const k = cut(d.length)
  return overhand(d.slice(0, k)).concat(d.slice(k))
}

/** Overhand the bottom half only; the top half is untouched. */
export function ohBottom(d: Deck): Deck {
  const k = cut(d.length)
  return d.slice(0, k).concat(overhand(d.slice(k)))
}

/** Off-centre riffle: the halves merge offset by g cards, so both new ends come from the middle. */
export function offCentreRiffle(d: Deck, g: number): Deck {
  const n = d.length
  const k = cut(n)
  const o = Math.min(g, k - 1, n - k - 1)
  const a = d.slice(0, k)
  const b = d.slice(k)
  return b.slice(0, o).concat(riffle(a.slice(0, a.length - o), b.slice(o)), a.slice(a.length - o))
}

export const OPS = {
  mash,
  overhand,
  pile,
  ohr: ohTop,
  ohb: ohBottom,
} as const

export type OpKey = keyof typeof OPS

export function isOpKey(x: string): x is OpKey {
  return Object.prototype.hasOwnProperty.call(OPS, x)
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

/** Apply a sequence of moves, returning every intermediate state (states[0] is the input). */
export function runStates(start: Deck, seq: readonly OpKey[]): Deck[] {
  let d = start.slice()
  const states = [d.slice()]
  for (const op of seq) {
    d = OPS[op](d)
    states.push(d.slice())
  }
  return states
}

/** "M×2·OHt·M×2·OHb" — a compact label for a sequence. */
export function compressSeq(seq: readonly OpKey[]): string {
  const out: string[] = []
  let i = 0
  while (i < seq.length) {
    let j = i
    while (j < seq.length && seq[j] === seq[i]) j++
    const c = j - i
    const lab = OP_TOKEN[seq[i]]
    out.push(c > 1 ? `${lab}×${c}` : lab)
    i = j
  }
  return out.join('·')
}
