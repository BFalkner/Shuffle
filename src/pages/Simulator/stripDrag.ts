// Dragging moves in and out of the move strip: what a drag carries, where a dropped move lands, and when letting go
// takes a move out.
import type { DragAndDropOptions } from 'react-aria-components'

/** React Aria doesn't export this type by name. */
type DropTargetDelegate = NonNullable<DragAndDropOptions['dropTargetDelegate']>

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

/**
 * Where a move dropped on the strip lands. The strip's drop area reaches a little past its border, and React Aria's own
 * delegate only reads a point inside the rows of moves: below the last row it lands before the last move. This one moves
 * the pointer into the nearest row first, then picks the gap by how far across that row it is: before the first move
 * whose middle is to its right, or after the row's last move.
 */
export function stripDropTarget(listSelector: string): DropTargetDelegate {
  return {
    // x and y are relative to the top left of the list.
    getDropTargetFromPoint(x, y) {
      const list = document.querySelector<HTMLElement>(listSelector)
      const moves = list ? [...list.querySelectorAll<HTMLElement>('[data-key]')] : []
      if (!list || !moves.length) return { type: 'root' }
      const origin = list.getBoundingClientRect()
      const pointX = origin.left + x
      const pointY = origin.top + y
      const rects = moves.map((move) => move.getBoundingClientRect())
      // The row nearest the pointer: the move whose top-to-bottom span is closest to it, and every move level with it.
      const gapTo = (rect: DOMRect) => Math.max(rect.top - pointY, pointY - rect.bottom, 0)
      const nearest = rects.reduce((best, rect, index) => (gapTo(rect) < gapTo(rects[best]) ? index : best), 0)
      const row = rects.flatMap((rect, index) => (Math.abs(rect.top - rects[nearest].top) < 2 ? [index] : []))
      const before = row.find((index) => pointX < rects[index].left + rects[index].width / 2)
      return before !== undefined
        ? { type: 'item', key: moves[before].dataset.key!, dropPosition: 'before' }
        : { type: 'item', key: moves[row[row.length - 1]].dataset.key!, dropPosition: 'after' }
    },
  }
}
