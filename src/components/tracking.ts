// Following individual cards through a shuffle.

export const TRACK_COLORS = ['#e23b7a', '#2f6fe2', '#e08a1e', '#8a3fe0', '#13a89a', '#d4243a']

/** Fixed slots, one per colour; null = empty. A card keeps its slot (and number) until removed. */
export type TrackSlots = (number | null)[]

export function emptySlots(): TrackSlots {
  return new Array(TRACK_COLORS.length).fill(null)
}

/**
 * Toggle a card in the slot list, returning a new list.
 * Removing frees that slot without renumbering the others; adding fills the
 * first free slot, or replaces the oldest (slot 0) when all six are taken.
 */
export function toggleTracked(list: TrackSlots, card: number): TrackSlots {
  const next = list.slice()
  const existingSlot = next.indexOf(card)
  if (existingSlot >= 0) {
    next[existingSlot] = null
    return next
  }
  let slot = next.indexOf(null)
  if (slot < 0) slot = 0
  next[slot] = card
  return next
}

export function liveTracked(list: TrackSlots): number[] {
  return list.filter((card): card is number => card !== null)
}

/** "#1: 5 → 12   #2: 6 → 40   (28 apart)" */
export function trackingSummary(list: TrackSlots, positions: number[]): string {
  const live = liveTracked(list)
  if (!live.length) return ''
  let summary = list
    .map((card, slot) => (card === null ? null : `#${slot + 1}: ${card + 1} → ${positions[card] + 1}`))
    .filter(Boolean)
    .join('   ')
  if (live.length === 2) {
    const gap = Math.abs(positions[live[0]] - positions[live[1]])
    summary += `   (${gap} apart${gap <= 3 ? ' — still neighbours' : ''})`
  }
  return summary
}
