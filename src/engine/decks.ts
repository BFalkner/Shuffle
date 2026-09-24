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

export function sortedDeck(deckSize: number): Deck {
  return Array.from({ length: deckSize }, (_, card) => card)
}

/** Fisher–Yates: a genuinely random deck. */
export function fisher(deckSize: number): Deck {
  const deck = sortedDeck(deckSize)
  for (let position = deckSize - 1; position > 0; position--) {
    const swapWith = Math.floor(Math.random() * (position + 1))
    const held = deck[position]
    deck[position] = deck[swapWith]
    deck[swapWith] = held
  }
  return deck
}

/** position of each card: posOf(deck)[card] = index */
export function posOf(deck: Deck): number[] {
  const positions = new Array<number>(deck.length)
  for (let position = 0; position < deck.length; position++) positions[deck[position]] = position
  return positions
}

// Card types, by id range: lands (40%), draw (17%), interaction (12%), the rest.
export function catSizes(deckSize: number): [number, number, number, number] {
  const land = Math.round(deckSize * 0.4)
  const draw = Math.round(deckSize * 0.17)
  const interaction = Math.round(deckSize * 0.12)
  return [land, draw, interaction, deckSize - land - draw - interaction]
}

export function catBounds(deckSize: number): number[] {
  const sizes = catSizes(deckSize)
  return [sizes[0], sizes[0] + sizes[1], sizes[0] + sizes[1] + sizes[2], deckSize]
}

export function catOf(id: number, bounds: number[]): number {
  for (let category = 0; category < bounds.length; category++) if (id < bounds[category]) return category
  return 3
}

export function startDeck(kind: DeckKind, deckSize: number): Deck {
  if (kind === 'sorted') return sortedDeck(deckSize)
  if (kind === 'played') {
    // seven mashes, then the top thirty cards sorted: an ordinary game plus the gathered block
    let deck = sortedDeck(deckSize)
    for (let game = 0; game < 7; game++) deck = mash(deck)
    const blockSize = Math.min(30, deckSize)
    const top = deck.slice(0, blockSize).sort((left, right) => left - right)
    return top.concat(deck.slice(blockSize))
  }
  const landCount = catSizes(deckSize)[0]
  const lands: number[] = []
  const spells: number[] = []
  for (let card = 0; card < landCount; card++) lands.push(card)
  for (let card = landCount; card < deckSize; card++) spells.push(card)

  if (kind === 'weave') {
    const out = new Array<number>(deckSize)
    const taken = new Array<boolean>(deckSize).fill(false)
    const step = deckSize / landCount
    let landIndex = 0
    let spellIndex = 0
    for (let land = 0; land < landCount; land++) {
      const pos = Math.min(deckSize - 1, Math.round(land * step))
      taken[pos] = true
      out[pos] = lands[landIndex++]
    }
    for (let position = 0; position < deckSize; position++) if (!taken[position]) out[position] = spells[spellIndex++]
    return out
  }

  // lumpy: lands gathered into three loose clusters
  const out = new Array<number>(deckSize).fill(-1)
  const clusters = 3
  const perCluster = Math.ceil(landCount / clusters)
  const centers = [Math.floor(deckSize * 0.18), Math.floor(deckSize * 0.5), Math.floor(deckSize * 0.8)]
  let landIndex = 0
  for (let cluster = 0; cluster < clusters && landIndex < landCount; cluster++) {
    const clusterStart = centers[cluster] - Math.floor(perCluster / 2)
    for (let offset = 0; offset < perCluster && landIndex < landCount; offset++) {
      let position = clusterStart + offset
      while (position < 0 || position >= deckSize || out[position] !== -1) position++
      if (position < deckSize) out[position] = lands[landIndex++]
    }
  }
  let spellIndex = 0
  for (let position = 0; position < deckSize; position++) if (out[position] === -1) out[position] = spells[spellIndex++]
  return out
}

/** Card colour by original position: dark green (top) to pale (bottom). */
export function colorFor(id: number, deckSize: number): string {
  const depth = id / (deckSize - 1)
  return `hsl(${(150 + (depth - 0.5) * 30).toFixed(0)},42%,${(30 + depth * 48).toFixed(0)}%)`
}
