// Starting decks and card-type bookkeeping.
import { mash, type Deck } from './moves'

export type DeckKind = 'sorted' | 'weave' | 'lumpy' | 'played'

export const DECK_KINDS: { value: DeckKind; label: string }[] = [
  { value: 'sorted', label: 'Freshly built — sorted' },
  { value: 'weave', label: 'Mana weaved' },
  { value: 'lumpy', label: 'Mana clumped' },
  { value: 'played', label: 'Already played' },
]

export const DECK_SIZES: { value: number; label: string }[] = [
  { value: 99, label: '99 — Commander' },
  { value: 60, label: '60 — Constructed' },
  { value: 52, label: '52 — cards' },
]

export function sortedDeck(n: number): Deck {
  return Array.from({ length: n }, (_, i) => i)
}

/** Fisher–Yates: a genuinely random deck. */
export function fisher(n: number): Deck {
  const a = sortedDeck(n)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

/** position of each card: posOf(deck)[card] = index */
export function posOf(a: Deck): number[] {
  const p = new Array<number>(a.length)
  for (let i = 0; i < a.length; i++) p[a[i]] = i
  return p
}

// Card types, by id range: lands (40%), draw (17%), interaction (12%), the rest.
export function catSizes(n: number): [number, number, number, number] {
  const land = Math.round(n * 0.4)
  const draw = Math.round(n * 0.17)
  const inter = Math.round(n * 0.12)
  return [land, draw, inter, n - land - draw - inter]
}

export function catBounds(n: number): number[] {
  const c = catSizes(n)
  return [c[0], c[0] + c[1], c[0] + c[1] + c[2], n]
}

export function catOf(id: number, bounds: number[]): number {
  for (let i = 0; i < bounds.length; i++) if (id < bounds[i]) return i
  return 3
}

export function startDeck(kind: DeckKind, n: number): Deck {
  if (kind === 'sorted') return sortedDeck(n)
  if (kind === 'played') {
    // seven mashes, then the top thirty cards sorted: an ordinary game plus the gathered block
    let d = sortedDeck(n)
    for (let i = 0; i < 7; i++) d = mash(d)
    const k = Math.min(30, n)
    const top = d.slice(0, k).sort((a, b) => a - b)
    return top.concat(d.slice(k))
  }
  const L = catSizes(n)[0]
  const lands: number[] = []
  const spells: number[] = []
  for (let i = 0; i < L; i++) lands.push(i)
  for (let i = L; i < n; i++) spells.push(i)

  if (kind === 'weave') {
    const out = new Array<number>(n)
    const taken = new Array<boolean>(n).fill(false)
    const step = n / L
    let li = 0
    let si = 0
    for (let k = 0; k < L; k++) {
      const pos = Math.min(n - 1, Math.round(k * step))
      taken[pos] = true
      out[pos] = lands[li++]
    }
    for (let i = 0; i < n; i++) if (!taken[i]) out[i] = spells[si++]
    return out
  }

  // lumpy: lands gathered into three loose clusters
  const out = new Array<number>(n).fill(-1)
  const clusters = 3
  const per = Math.ceil(L / clusters)
  const centers = [Math.floor(n * 0.18), Math.floor(n * 0.5), Math.floor(n * 0.8)]
  let li = 0
  for (let c = 0; c < clusters && li < L; c++) {
    const pos = centers[c] - Math.floor(per / 2)
    for (let k = 0; k < per && li < L; k++) {
      let p = pos + k
      while (p < 0 || p >= n || out[p] !== -1) p++
      if (p < n) out[p] = lands[li++]
    }
  }
  let si = 0
  for (let i = 0; i < n; i++) if (out[i] === -1) out[i] = spells[si++]
  return out
}

/** Card colour by original position: dark green (top) to pale (bottom). */
export function colorFor(id: number, n: number): string {
  const t = id / (n - 1)
  return `hsl(${(150 + (t - 0.5) * 30).toFixed(0)},42%,${(30 + t * 48).toFixed(0)}%)`
}
