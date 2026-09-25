// How decks are coloured on the page.

/** Card colours for a deck shown by type, matching the starting-deck strips on the home page. */
export const LAND_COLOR = '#2e7d4f'
export const OTHER_COLOR = '#e9dfc8'

/** Card colour by original position: dark green (top) to pale (bottom). */
export function colorFor(id: number, deckSize: number): string {
  const depth = id / (deckSize - 1)
  return `hsl(${(150 + (depth - 0.5) * 30).toFixed(0)},42%,${(30 + depth * 48).toFixed(0)}%)`
}
