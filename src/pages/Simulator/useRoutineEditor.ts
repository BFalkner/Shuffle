import { useState } from 'react'
import type { OpKey } from '../../engine/moves'
import type { Experiment } from './experiments'

/** Keys that insert a move while the editor has focus. */
export const MOVE_KEYS: Record<string, OpKey> = { m: 'mash', o: 'overhand', t: 'ohr', b: 'ohb', p: 'pile' }

interface History {
  past: OpKey[][]
  future: OpKey[][]
}

const UNDO_LIMIT = 200

/** Where the caret belongs after the moves change from `before` to `after`: at the end of the part that changed. */
export function caretAfterChange(before: readonly OpKey[], after: readonly OpKey[]): number {
  const shorter = Math.min(before.length, after.length)
  const prefix = Array.from({ length: shorter }).findIndex((_, index) => before[index] !== after[index])
  const commonPrefix = prefix < 0 ? shorter : prefix
  const suffixRoom = shorter - commonPrefix
  const suffix = Array.from({ length: suffixRoom }).findIndex((_, index) => before[before.length - 1 - index] !== after[after.length - 1 - index])
  return after.length - (suffix < 0 ? suffixRoom : suffix)
}

export interface RoutineEditor {
  /** moves before the caret; the deck and the chart dots show the deck at this step */
  caret: number
  setCaret: (caret: number) => void
  insert: (op: OpKey) => void
  deleteBefore: () => void
  deleteAfter: () => void
  /** replace every move, as one undoable change */
  replace: (seq: OpKey[]) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  /** handle a key press inside the editor; returns true when it was used */
  handleKey: (event: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }) => boolean
}

/**
 * Edit the active method's moves like text: a caret, moves typed in at the caret, and undo and redo. Each method keeps
 * its own history for the visit, so switching between methods and back keeps both.
 */
export function useRoutineEditor(active: Experiment | undefined, setSeq: (id: string, seq: OpKey[]) => void): RoutineEditor {
  const [histories, setHistories] = useState<Record<string, History>>({})
  // The caret belongs to one method; switching methods puts it at the end of the new one.
  const [caretState, setCaretState] = useState<{ id: string | undefined; caret: number }>({ id: active?.id, caret: active?.seq.length ?? 0 })
  const seq = active?.seq ?? []
  const caret = caretState.id === active?.id ? Math.min(caretState.caret, seq.length) : seq.length
  const setCaret = (next: number) => setCaretState({ id: active?.id, caret: Math.max(0, Math.min(seq.length, next)) })
  const history = (active && histories[active.id]) || { past: [], future: [] }

  const change = (next: OpKey[], nextCaret: number) => {
    if (!active) return
    setHistories({ ...histories, [active.id]: { past: [...history.past, seq].slice(-UNDO_LIMIT), future: [] } })
    setSeq(active.id, next)
    setCaretState({ id: active.id, caret: nextCaret })
  }

  /** Step back (from 'past') or forward (from 'future') through the active method's history. */
  const restore = (from: 'past' | 'future') => {
    const stack = history[from]
    if (!active || !stack.length) return
    const restored = stack[stack.length - 1]
    const next: History = from === 'past' ? { past: stack.slice(0, -1), future: [...history.future, seq] } : { past: [...history.past, seq], future: stack.slice(0, -1) }
    setHistories({ ...histories, [active.id]: next })
    setSeq(active.id, restored)
    setCaretState({ id: active.id, caret: caretAfterChange(seq, restored) })
  }

  const editor: RoutineEditor = {
    caret,
    setCaret,
    insert: (op) => change([...seq.slice(0, caret), op, ...seq.slice(caret)], caret + 1),
    deleteBefore: () => {
      if (caret > 0) change(seq.filter((_, index) => index !== caret - 1), caret - 1)
    },
    deleteAfter: () => {
      if (caret < seq.length) change(seq.filter((_, index) => index !== caret), caret)
    },
    replace: (next) => {
      if (next.join(',') !== seq.join(',')) change(next, caretAfterChange(seq, next))
    },
    undo: () => restore('past'),
    redo: () => restore('future'),
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    handleKey: (event) => {
      const command = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      if (command && key === 'z') {
        if (event.shiftKey) editor.redo()
        else editor.undo()
        return true
      }
      if (command && key === 'y') {
        editor.redo()
        return true
      }
      if (command || event.altKey) return false
      if (MOVE_KEYS[key]) editor.insert(MOVE_KEYS[key])
      else if (event.key === 'Backspace') editor.deleteBefore()
      else if (event.key === 'Delete') editor.deleteAfter()
      else if (event.key === 'ArrowLeft') setCaret(caret - 1)
      else if (event.key === 'ArrowRight') setCaret(caret + 1)
      else if (event.key === 'Home') setCaret(0)
      else if (event.key === 'End') setCaret(seq.length)
      else return false
      return true
    },
  }
  return editor
}
