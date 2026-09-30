import { useEffect, useRef, type FocusEvent, type MouseEvent } from 'react'
import { Button, GridList, GridListItem, useDrag, useDragAndDrop, type DropItem } from 'react-aria-components'
import { isOpKey, type OpKey } from '../../engine/moves'
import { OP_NAME, OP_TOKEN } from '../../engine/routines'
import { MOVE_TYPE, TOKEN_TYPE, gapAt, holdMove, stripDropTarget } from './stripDrag'
import type { RoutineEditor } from './useRoutineEditor'

/** The move a move button's drag carries, if the drop has one. */
async function droppedMove(items: DropItem[]): Promise<OpKey | null> {
  const item = items.find((candidate) => candidate.kind === 'text' && candidate.types.has(MOVE_TYPE))
  const op = item?.kind === 'text' ? await item.getText(MOVE_TYPE) : null
  return op && isOpKey(op) ? op : null
}

/**
 * The moves as tokens, with a caret between two of them. Click a token to put the caret after it, Start to put it before
 * the first move, or the space between moves to put it in the nearest gap; with a token focused, the arrow keys move between tokens and the caret follows. Drag a token to
 * move it, or drop it anywhere outside the strip to take it out. Drop a move button's move between two tokens to add it
 * there.
 */
export default function MoveStrip({ seq, editor, focusRequest }: { seq: OpKey[]; editor: RoutineEditor; focusRequest: number }) {
  const { caret } = editor
  const stripRef = useRef<HTMLDivElement>(null)

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) => [...keys].map((key) => ({ [TOKEN_TYPE]: String(key) })),
    onDragStart: (event) => {
      const token = document.querySelector(`.strip-list [data-key="${String([...event.keys][0])}"]`)
      if (token) holdMove(token, event.x, event.y)
    },
    getAllowedDropOperations: () => ['move'],
    acceptedDragTypes: [TOKEN_TYPE, MOVE_TYPE],
    dropTargetDelegate: stripDropTarget('.strip-list'),
    getDropOperation: (_target, types) => (types.has(MOVE_TYPE) ? 'copy' : 'move'),
    onReorder: (event) => {
      if (event.target.dropPosition !== 'on') editor.move(Number([...event.keys][0]), Number(event.target.key), event.target.dropPosition)
    },
    onInsert: async (event) => {
      const op = await droppedMove(event.items)
      if (op && event.target.dropPosition !== 'on') editor.insert(op, Number(event.target.key) + (event.target.dropPosition === 'after' ? 1 : 0))
    },
    onRootDrop: async (event) => {
      const op = await droppedMove(event.items)
      if (op) editor.insert(op, seq.length)
    },
  })

  // Focus the token before the caret, or Start. React Aria puts a new token on the page one render after the moves change,
  // so this waits a frame for it. Returns a cleanup that cancels the wait.
  const focusCaret = () => {
    const frame = requestAnimationFrame(() => {
      const strip = stripRef.current
      const target = caret === 0 ? strip?.querySelector('.strip-start') : strip?.querySelector(`[data-key="${caret - 1}"]`)
      if (target instanceof HTMLElement && target !== document.activeElement) target.focus()
    })
    return () => cancelAnimationFrame(frame)
  }

  // While focus is in the strip, keep it on the token before the caret (or on Start), so typing a move or deleting one
  // leaves focus where the next key press acts.
  useEffect(() => {
    if (stripRef.current?.contains(document.activeElement)) return focusCaret()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caret, seq])

  // When asked (a method was opened), take focus. This runs after the render that asked, so the caret is already the new
  // one. Only a new request moves focus.
  useEffect(() => {
    if (focusRequest) return focusCaret()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest])

  // Focusing a token (by keyboard or click) puts the caret after it.
  const followFocus = (event: FocusEvent<HTMLDivElement>) => {
    const key = (event.target as HTMLElement).closest('[data-key]')?.getAttribute('data-key')
    if (key != null) editor.setCaret(Number(key) + 1)
  }

  // A click on the strip's background (between moves, after them, or in the margin around the strip) puts the caret in the
  // nearest gap, and focus on the move before it, so the keys act there next.
  const placeCaret = (event: MouseEvent<HTMLDivElement>) => {
    const strip = stripRef.current
    const list = strip?.querySelector('.strip-list')
    if (!strip || !list || (event.target as HTMLElement).closest('[data-key], .strip-start')) return
    const gap = gapAt(list, event.clientX, event.clientY)
    const next = gap ? gap.index + (gap.position === 'after' ? 1 : 0) : 0
    editor.setCaret(next)
    const target = next === 0 ? strip.querySelector('.strip-start') : strip.querySelector(`[data-key="${next - 1}"]`)
    if (target instanceof HTMLElement) target.focus()
  }

  return (
    <div ref={stripRef} className="strip" onFocus={followFocus} onClick={placeCaret}>
      <Button className={`strip-start${caret === 0 ? ' at' : ''}`} aria-label="Start: put the caret before the first move" onPress={() => editor.setCaret(0)}>
        Start
      </Button>
      <GridList
        className="strip-list"
        aria-label={`Moves, caret after move ${caret} of ${seq.length}`}
        layout="grid"
        disallowTypeAhead
        dragAndDropHooks={dragAndDropHooks}
        onAction={(key) => editor.setCaret(Number(key) + 1)}
        renderEmptyState={() => <span className="strip-empty">Add a move to begin, or drag one here.</span>}
      >
        {seq.map((op, index) => (
          <GridListItem
            key={index}
            id={String(index)}
            textValue={OP_NAME[op]}
            className={`strip-token ${op}${index < caret ? ' done' : ''}${caret === index + 1 ? ' caret-after' : ''}`}
          >
            {OP_TOKEN[op]}
            {/* React Aria's handle for keyboard and screen reader drags. Hidden from sight: a mouse drags the token itself. */}
            <Button slot="drag" className="strip-drag" aria-label={`Move ${OP_NAME[op]}, move ${index + 1} of ${seq.length}`} />
          </GridListItem>
        ))}
      </GridList>
    </div>
  )
}

/** One handler that calls both, in order. */
function bothHandlers<E>(first?: (event: E) => void, second?: (event: E) => void): (event: E) => void {
  return (event) => {
    first?.(event)
    second?.(event)
  }
}

/** A move button: press it to add the move at the caret, or drag it to drop the move anywhere in the strip. */
export function MoveButton({ op, label, shortcut, onAdd }: { op: OpKey; label: string; shortcut: string; onAdd: () => void }) {
  // hasDragButton keeps useDrag's keyboard handlers off the button, so Enter and Space still add the move at the caret.
  const { dragProps, isDragging } = useDrag({ getItems: () => [{ [MOVE_TYPE]: op }], getAllowedDropOperations: () => ['copy'], hasDragButton: true })
  return (
    <Button
      className={`movebtn ${op}${isDragging ? ' dragging' : ''}`}
      onPress={onAdd}
      aria-label={OP_NAME[op]}
      aria-keyshortcuts={shortcut}
      // React Aria's Button doesn't pass `draggable` through, so render the <button> here with the drag props on it. Both
      // have a dragstart handler: the drag's starts the drag, and the Button's ends the press, so it doesn't stay stuck
      // pressed after a drag.
      render={(props) => <button {...props} {...dragProps} onDragStart={bothHandlers(dragProps.onDragStart, props.onDragStart)} />}
    >
      <span className="movebtn-token">{OP_TOKEN[op]}</span>
      <span className="movebtn-label">{label}</span>
    </Button>
  )
}
