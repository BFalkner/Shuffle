// How decks are coloured on the page.

/** Card colour by original position: dark green (top) to pale (bottom). */
export function colorFor(id: number, deckSize: number): string {
  const depth = id / (deckSize - 1)
  return `hsl(${(150 + (depth - 0.5) * 30).toFixed(0)},42%,${(30 + depth * 48).toFixed(0)}%)`
}
