// Starting decks.
import { mash, type Deck } from './moves.ts'

export type DeckKind = 'sorted' | 'played'

export const DECK_KINDS: { value: DeckKind; label: string }[] = [
  { value: 'sorted', label: 'Freshly built — sorted' },
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

/** The deck a routine starts from: sorted by card number, or as it comes back after a game. */
export function startDeck(kind: DeckKind, deckSize: number): Deck {
  if (kind === 'sorted') return sortedDeck(deckSize)
  // seven mashes, then the top thirty cards sorted: an ordinary game plus the gathered block
  let deck = sortedDeck(deckSize)
  for (let game = 0; game < 7; game++) deck = mash(deck)
  const blockSize = Math.min(30, deckSize)
  const top = deck.slice(0, blockSize).sort((left, right) => left - right)
  return top.concat(deck.slice(blockSize))
}
