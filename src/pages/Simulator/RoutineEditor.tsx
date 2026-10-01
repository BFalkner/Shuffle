import { useEffect, useRef, useState } from 'react'
import { Button, FieldError, Group, Input, Label, Separator, TextField } from 'react-aria-components'
import type { OpKey } from '../../engine/moves'
import { OP_COST, compressSeq, parseRoutine } from '../../engine/routines'
import ConfirmButton from './ConfirmButton'
import MoveStrip, { MoveButton } from './MoveStrip'
import { methodName, type Experiment } from './experiments'
import type { RoutineEditor as Editor } from './useRoutineEditor'

/** The move buttons, in the order people reach for them, with the key that types each one. */
const MOVE_BUTTONS: { op: OpKey; label: string; key: string }[] = [
  { op: 'mash', label: 'Mash', key: 'M' },
  { op: 'ohr', label: 'Top half', key: 'T' },
  { op: 'ohb', label: 'Bottom half', key: 'B' },
  { op: 'overhand', label: 'Overhand', key: 'O' },
  { op: 'pile', label: 'Pile', key: 'P' },
  { op: 'cut', label: 'Cut', key: 'C' },
]

interface Props {
  method: Experiment
  editor: Editor
  onRename: (name: string) => void
  onDuplicate: () => void
  onDelete: () => void
  /** changes when the move strip should take focus, because a method was opened */
  focusRequest: number
}

/**
 * The active method, edited in place. The moves read like text: a caret sits between them, the move buttons (or their
 * keys) type a move in at the caret, and Backspace deletes the move before it. Moves can also be dragged: within the
 * strip to move them, out of it to take them out, and from a move button into it. Every change is saved at once and can
 * be undone.
 */
export default function RoutineEditor({ method, editor, onRename, onDuplicate, onDelete, focusRequest }: Props) {
  const { seq } = method
  const units = seq.reduce((total, op) => total + OP_COST[op], 0)

  // The letter keys, Backspace, Delete, the left and right arrows and undo work anywhere on the page, wherever focus is,
  // except where the keys are needed for something else: text fields, and open dropdown lists (which type to find). A key
  // a control has already used is left alone, so in the strip the arrows move focus and the caret follows it. One listener
  // serves the page, reading the editor from the latest render.
  const handleKey = useRef(editor.handleKey)
  useEffect(() => {
    handleKey.current = editor.handleKey
  })
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (event.defaultPrevented || target?.closest('input, textarea, select, [contenteditable="true"], [role="listbox"], [role="dialog"]')) return
      if (handleKey.current(event)) event.preventDefault()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <section className="editor" aria-label="Routine editor">
      <div className="editor-head">
        <TextField className="namefield" aria-label="Method name" value={method.name ?? ''} onChange={onRename}>
          <Input placeholder={methodName({ ...method, name: undefined })} />
        </TextField>
        <div className="editor-actions">
          <Button className="textbtn" onPress={onDuplicate}>
            Duplicate
          </Button>
          <ConfirmButton className="textbtn danger" label="Delete" armedLabel="Press again to delete" onConfirm={onDelete} />
        </div>
      </div>

      <MoveStrip seq={seq} editor={editor} focusRequest={focusRequest} />

      {/* A plain group, not React Aria's Toolbar: Toolbar sends focus back to the button focused last whenever focus comes
          in from outside, and that interrupts a mouse press on any other button, so it could never start a drag. */}
      <Group className="movebar" aria-label="Moves">
        <Group className="movebar-moves" aria-label="Add a move at the caret">
          {MOVE_BUTTONS.map(({ op, label, key }) => (
            <MoveButton key={op} op={op} label={label} shortcut={key} onAdd={() => editor.insert(op)} />
          ))}
        </Group>
        <Separator orientation="vertical" />
        <Group className="movebar-edit" aria-label="Edit">
          <Button className="toolbtn" aria-label="Delete the move before the caret" aria-keyshortcuts="Backspace" isDisabled={editor.caret === 0} onPress={editor.deleteBefore}>
            ⌫
          </Button>
          <Button className="toolbtn" aria-label="Undo" aria-keyshortcuts="Control+Z" isDisabled={!editor.canUndo} onPress={editor.undo}>
            ↶
          </Button>
          <Button className="toolbtn" aria-label="Redo" aria-keyshortcuts="Control+Shift+Z" isDisabled={!editor.canRedo} onPress={editor.redo}>
            ↷
          </Button>
        </Group>
      </Group>
      <p className="editor-keys">
        Drag a move to reorder it, or off the strip to remove it. Keys work anywhere outside a text box: <kbd>M</kbd> <kbd>T</kbd> <kbd>B</kbd> <kbd>O</kbd>{' '}
        <kbd>P</kbd> <kbd>C</kbd> add a move at the caret, <kbd>Backspace</kbd> deletes the one before it, the arrow keys move the caret, and <kbd>Ctrl</kbd>{' '}
        <kbd>Z</kbd> undoes.
      </p>

      <div className="editor-foot">
        <NotationField seq={seq} onCommit={editor.replace} />
        <p className="editor-stats">
          <span>
            {seq.length} {seq.length === 1 ? 'move' : 'moves'}
          </span>
          <span>
            {units} {units === 1 ? 'unit' : 'units'} of time
          </span>
        </p>
      </div>
    </section>
  )
}

/** The routine in notation, editable: type or paste a routine like M×3·OHt·M×2 and press Enter. */
function NotationField({ seq, onCommit }: { seq: OpKey[]; onCommit: (seq: OpKey[]) => void }) {
  const notation = compressSeq(seq)
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState('')

  const commit = () => {
    if (draft === null) return
    try {
      onCommit(parseRoutine(draft))
      setDraft(null)
      setError('')
    } catch (problem) {
      setError((problem as Error).message)
    }
  }

  return (
    <TextField
      className="notationfield"
      value={draft ?? notation}
      onChange={(value) => {
        setDraft(value)
        setError('')
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit()
        if (event.key === 'Escape') {
          setDraft(null)
          setError('')
        }
      }}
      isInvalid={Boolean(error)}
    >
      <Label>Notation</Label>
      <Input placeholder="For example M×3·OHt·M×2" spellCheck={false} autoComplete="off" />
      <FieldError>{error}</FieldError>
    </TextField>
  )
}
