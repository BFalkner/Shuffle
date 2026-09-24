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

// Card types: lands (40%), draw (17%), interaction (12%), the rest.
export const LAND = 0

export function catSizes(deckSize: number): [number, number, number, number] {
  const land = Math.round(deckSize * 0.4)
  const draw = Math.round(deckSize * 0.17)
  const interaction = Math.round(deckSize * 0.12)
  return [land, draw, interaction, deckSize - land - draw - interaction]
}

/** The type of every card: types[card] is 0 (land), 1 (draw), 2 (interaction) or 3 (the rest). */
export type CardTypes = number[]

/** Types grouped by card number, lands first: a deck built and sorted by type. */
export function numberedTypes(deckSize: number): CardTypes {
  const types: CardTypes = []
  catSizes(deckSize).forEach((count, type) => {
    for (let i = 0; i < count; i++) types.push(type)
  })
  return types
}

/** The same type counts, handed out to cards at random, so a card's number says nothing about its type. */
function randomTypes(deckSize: number): CardTypes {
  const types: CardTypes = new Array(deckSize)
  const cards = fisher(deckSize)
  let next = 0
  catSizes(deckSize).forEach((count, type) => {
    for (let i = 0; i < count; i++) types[cards[next++]] = type
  })
  return types
}

export interface StartingDeck {
  deck: Deck
  types: CardTypes
}

/**
 * The deck a routine starts from. The sorted and played decks keep types grouped by number. The woven and clumped
 * decks are random apart from where the lands sit: their card order and types are drawn fresh each time.
 */
export function startDeck(kind: DeckKind, deckSize: number): StartingDeck {
  if (kind === 'sorted') return { deck: sortedDeck(deckSize), types: numberedTypes(deckSize) }
  if (kind === 'played') {
    // seven mashes, then the top thirty cards sorted: an ordinary game plus the gathered block
    let deck = sortedDeck(deckSize)
    for (let game = 0; game < 7; game++) deck = mash(deck)
    const blockSize = Math.min(30, deckSize)
    const top = deck.slice(0, blockSize).sort((left, right) => left - right)
    return { deck: top.concat(deck.slice(blockSize)), types: numberedTypes(deckSize) }
  }

  const types = randomTypes(deckSize)
  const order = fisher(deckSize)
  const lands = order.filter((card) => types[card] === LAND)
  const others = order.filter((card) => types[card] !== LAND)
  const landSlots = kind === 'weave' ? wovenLandSlots(deckSize, lands.length) : clumpedLandSlots(deckSize, lands.length)
  const deck: Deck = []
  let landIndex = 0
  let otherIndex = 0
  for (let position = 0; position < deckSize; position++) deck.push(landSlots[position] ? lands[landIndex++] : others[otherIndex++])
  return { deck, types }
}

/** Lands at perfectly even intervals. */
function wovenLandSlots(deckSize: number, landCount: number): boolean[] {
  const slots = new Array<boolean>(deckSize).fill(false)
  const step = deckSize / landCount
  for (let land = 0; land < landCount; land++) slots[Math.min(deckSize - 1, Math.round(land * step))] = true
  return slots
}

/** Lands gathered into three loose clusters. */
function clumpedLandSlots(deckSize: number, landCount: number): boolean[] {
  const slots = new Array<boolean>(deckSize).fill(false)
  const clusters = 3
  const perCluster = Math.ceil(landCount / clusters)
  const centers = [Math.floor(deckSize * 0.18), Math.floor(deckSize * 0.5), Math.floor(deckSize * 0.8)]
  let placed = 0
  for (let cluster = 0; cluster < clusters && placed < landCount; cluster++) {
    const clusterStart = centers[cluster] - Math.floor(perCluster / 2)
    for (let offset = 0; offset < perCluster && placed < landCount; offset++) {
      let position = clusterStart + offset
      while (position < 0 || position >= deckSize || slots[position]) position++
      if (position < deckSize) {
        slots[position] = true
        placed++
      }
    }
  }
  return slots
}

/** Card colour by original position: dark green (top) to pale (bottom). */
export function colorFor(id: number, deckSize: number): string {
  const depth = id / (deckSize - 1)
  return `hsl(${(150 + (depth - 0.5) * 30).toFixed(0)},42%,${(30 + depth * 48).toFixed(0)}%)`
}
