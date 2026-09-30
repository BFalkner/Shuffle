// Dragging moves in and out of the move strip: what a drag carries, and when letting go takes a move out.

// What a drag carries. Custom types only, so a move can't be dropped into a text field as text.
/** A move already in the routine; the data is its index. */
export const TOKEN_TYPE = 'application/x-shuffle-token'
/** A move to add, dragged from a move button; the data is its OpKey. */
export const MOVE_TYPE = 'application/x-shuffle-move'

/** The move being dragged out of the strip: where the pointer holds it, from its top-left corner, and its size. */
let held = { offsetX: 0, offsetY: 0, width: 0, height: 0 }

/** Record where the pointer (x, y on the page) picked up a move, so the move itself can be followed, not the pointer. */
export function holdMove(element: Element, x: number, y: number): void {
  const rect = element.getBoundingClientRect()
  held = { offsetX: x - rect.left, offsetY: y - rect.top, width: rect.width, height: rect.height }
}

/**
 * Whether the move being dragged still overlaps the strip, with the pointer at (x, y) relative to the element that
 * `zoneSelector` finds. A move let go while it overlaps stays where it was; it is taken out only once all of it is
 * outside the strip, however it was picked up.
 */
export function moveOverlapsStrip(zoneSelector: string, x: number, y: number): boolean {
  const zone = document.querySelector(zoneSelector)
  const strip = zone?.querySelector('.strip')
  if (!zone || !strip) return false
  const origin = zone.getBoundingClientRect()
  const rect = strip.getBoundingClientRect()
  const left = origin.left + x - held.offsetX
  const top = origin.top + y - held.offsetY
  return left < rect.right && left + held.width > rect.left && top < rect.bottom && top + held.height > rect.top
}

/** The centre of the move being dragged, on the screen, with the pointer at (x, y) relative to `zoneSelector`'s element. */
export function heldMoveCentre(zoneSelector: string, x: number, y: number): { x: number; y: number } {
  const origin = document.querySelector(zoneSelector)?.getBoundingClientRect()
  return { x: (origin?.left ?? 0) + x - held.offsetX + held.width / 2, y: (origin?.top ?? 0) + y - held.offsetY + held.height / 2 }
}
