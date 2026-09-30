import { useState, type KeyboardEvent } from 'react'
import { Button, FieldError, Group, Input, Label, Separator, TextField, Toolbar } from 'react-aria-components'
import type { OpKey } from '../../engine/moves'
import { OP_COST, OP_NAME, OP_TOKEN, compressSeq, parseRoutine } from '../../engine/routines'
import ConfirmButton from './ConfirmButton'
import { methodName, type Experiment } from './experiments'
import type { RoutineEditor as Editor } from './useRoutineEditor'

/** The move buttons, in the order people reach for them, with the key that types each one. */
const MOVE_BUTTONS: { op: OpKey; label: string; key: string }[] = [
  { op: 'mash', label: 'Mash', key: 'M' },
  { op: 'ohr', label: 'Top half', key: 'T' },
  { op: 'ohb', label: 'Bottom half', key: 'B' },
  { op: 'overhand', label: 'Overhand', key: 'O' },
  { op: 'pile', label: 'Pile', key: 'P' },
]

interface Props {
  method: Experiment
  editor: Editor
  onRename: (name: string) => void
  onDuplicate: () => void
  onDelete: () => void
}

/**
 * The active method, edited in place. The moves read like text: a caret sits between them, the move buttons (or their
 * keys) type a move in at the caret, and Backspace deletes the move before it. Every change is saved at once and can be
 * undone.
 */
export default function RoutineEditor({ method, editor, onRename, onDuplicate, onDelete }: Props) {
  const { seq } = method
  const units = seq.reduce((total, op) => total + OP_COST[op], 0)

  // Letter keys, Backspace, Delete and undo work anywhere in the editor except the text fields. Arrow keys move the
  // caret only from the move strip, because the toolbar uses them to move between its buttons.
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('input, textarea')) return
    const onStrip = target.classList.contains('strip')
    if (!onStrip && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    if (editor.handleKey(event)) event.preventDefault()
  }

  return (
    <section className="editor" aria-label="Routine editor" onKeyDown={onKeyDown}>
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

      <MoveStrip seq={seq} caret={editor.caret} onCaret={editor.setCaret} />

      <Toolbar className="movebar" aria-label="Moves">
        <Group className="movebar-moves" aria-label="Add a move at the caret">
          {MOVE_BUTTONS.map(({ op, label, key }) => (
            <Button key={op} className={`movebtn ${op}`} onPress={() => editor.insert(op)} aria-label={OP_NAME[op]} aria-keyshortcuts={key}>
              <span className="movebtn-token">{OP_TOKEN[op]}</span>
              <span className="movebtn-label">{label}</span>
            </Button>
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
      </Toolbar>
      <p className="editor-keys">
        Keys: <kbd>M</kbd> <kbd>T</kbd> <kbd>B</kbd> <kbd>O</kbd> <kbd>P</kbd> add a move at the caret, <kbd>Backspace</kbd> deletes the one before it, the arrow keys
        move the caret on the strip, and <kbd>Ctrl</kbd> <kbd>Z</kbd> undoes.
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

/**
 * The moves as tokens with a caret between them. Click a token to put the caret after it, or the start to put it before
 * the first move. With focus here, the arrow keys, Home and End move the caret.
 */
function MoveStrip({ seq, caret, onCaret }: { seq: OpKey[]; caret: number; onCaret: (caret: number) => void }) {
  return (
    <div
      className="strip"
      tabIndex={0}
      role="group"
      aria-label={`Moves, caret after move ${caret} of ${seq.length}`}
      aria-description="Type M, T, B, O or P to add a move at the caret. Backspace deletes the move before it. Arrow keys move the caret."
    >
      <span className={`strip-start${caret === 0 ? ' at' : ''}`} onClick={() => onCaret(0)}>
        Start
      </span>
      {caret === 0 && <span className="strip-caret" aria-hidden="true" />}
      {seq.map((op, index) => (
        <span key={index} className="strip-slot">
          <span className={`strip-token ${op}${index < caret ? ' done' : ''}`} title={OP_NAME[op]} onClick={() => onCaret(index + 1)}>
            {OP_TOKEN[op]}
          </span>
          {caret === index + 1 && <span className="strip-caret" aria-hidden="true" />}
        </span>
      ))}
      {seq.length === 0 && <span className="strip-empty">Add a move to begin.</span>}
    </div>
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
