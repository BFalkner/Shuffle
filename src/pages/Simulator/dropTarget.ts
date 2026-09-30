import type { DragAndDropOptions } from 'react-aria-components'

/** React Aria doesn't export this type by name. */
type DropTargetDelegate = NonNullable<DragAndDropOptions['dropTargetDelegate']>

/**
 * How far into a row the pointer goes, from the side the dragged row comes from, before the drop line moves past that
 * row. React Aria's default is halfway; a little less makes the list feel quicker to respond.
 */
export const SWITCH_AT = 0.4

/**
 * Where a dragged row would land, for the vertical list that `listSelector` finds. React Aria marks the row being
 * dragged with data-dragging, which says which side the pointer comes from.
 */
export function earlyDropTarget(listSelector: string): DropTargetDelegate {
  return {
    // y is relative to the top of the list.
    getDropTargetFromPoint(_x, y) {
      const list = document.querySelector<HTMLElement>(listSelector)
      const rows = list ? [...list.querySelectorAll<HTMLElement>('[data-key]')] : []
      if (!list || !rows.length) return { type: 'root' }
      const pointer = list.getBoundingClientRect().top + y
      // The row under the pointer, or the nearest one when the pointer is in a gap or past either end.
      const row = rows.find((candidate) => candidate.getBoundingClientRect().bottom >= pointer) ?? rows[rows.length - 1]
      const rect = row.getBoundingClientRect()
      const fraction = (pointer - rect.top) / rect.height
      const rowIsAbove = rows.indexOf(row) < rows.findIndex((candidate) => candidate.hasAttribute('data-dragging'))
      // Coming up from below, the line moves above this row once the pointer is SWITCH_AT up from its bottom edge;
      // coming down from above, it moves below the row once the pointer is SWITCH_AT down from its top edge.
      const before = rowIsAbove ? fraction < 1 - SWITCH_AT : fraction < SWITCH_AT
      return { type: 'item', key: row.dataset.key!, dropPosition: before ? 'before' : 'after' }
    },
  }
}
