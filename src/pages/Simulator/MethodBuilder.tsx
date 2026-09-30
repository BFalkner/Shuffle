import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import MiniDeck from '../../components/MiniDeck'
import { posOf } from '../../engine/decks'
import type { Experiment } from './experiments'
import { OPS, type Deck, type OpKey } from '../../engine/moves'
import { OP_TOKEN, compressSeq } from '../../engine/routines'
import { toggleTracked, trackingSummary, type TrackSlots } from '../../components/tracking'

interface Props {
  /** the method being edited, or null for a new one */
  editing: Experiment | null
  start: Deck
  tracked: TrackSlots
  onTracked: Dispatch<SetStateAction<TrackSlots>>
  animate: boolean
  speed: number
  onSave: (title: string, seq: OpKey[]) => void
  onCancel: () => void
  onDelete: () => void
}

interface Snapshot {
  seq: OpKey[]
  cur: number
  states: Deck[]
}

const MAX_UNDO = 120

/**
 * Build a method one move at a time. Each move is inserted at the marker and
 * performed immediately on a live deck; stepping back lets you insert earlier.
 * Undo restores the exact prior decks (history is never re-rolled).
 */
export default function MethodBuilder({ editing, start, tracked, onTracked, animate, speed, onSave, onCancel, onDelete }: Props) {
  const [title, setTitle] = useState(editing?.title ?? '')
  const [build, setBuild] = useState<Snapshot>(() => {
    const seq = editing ? editing.seq.slice() : []
    const states = [start.slice()]
    let deck = start.slice()
    for (const op of seq) {
      deck = OPS[op](deck)
      states.push(deck.slice())
    }
    return { seq, cur: seq.length, states }
  })
  const [history, setHistory] = useState<Snapshot[]>([])
  const [message, setMessage] = useState('')
  const [deleteArmed, setDeleteArmed] = useState(false)
  const { seq, cur, states } = build

  const perform = (op: OpKey) => {
    setHistory((previous) => [...previous, build].slice(-MAX_UNDO))
    const next = seq.slice()
    next.splice(cur, 0, op)
    // keep everything before the marker; replay from there
    const nextStates = states.slice(0, cur + 1)
    let deck = nextStates[cur]
    for (let step = cur; step < next.length; step++) {
      deck = OPS[next[step]](deck)
      nextStates.push(deck.slice())
    }
    setBuild({ seq: next, cur: cur + 1, states: nextStates })
    setMessage('')
  }

  const undo = () => {
    if (!history.length) return
    setBuild(history[history.length - 1])
    setHistory((previous) => previous.slice(0, -1))
  }

  const goTo = (target: number) => setBuild((current) => ({ ...current, cur: Math.max(0, Math.min(current.states.length - 1, target)) }))

  // Arrow keys step through the shuffle.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).tagName === 'INPUT') return
      if (event.key === 'ArrowLeft') setBuild((current) => ({ ...current, cur: Math.max(0, current.cur - 1) }))
      else if (event.key === 'ArrowRight') setBuild((current) => ({ ...current, cur: Math.min(current.states.length - 1, current.cur + 1) }))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!deleteArmed) return
    const timer = setTimeout(() => setDeleteArmed(false), 3500)
    return () => clearTimeout(timer)
  }, [deleteArmed])

  const save = () => {
    if (!seq.length) {
      setMessage('Add at least one move before saving.')
      return
    }
    onSave(title.trim() || compressSeq(seq), seq)
  }

  return (
    <div className="builder">
      <div className="field" style={{ marginBottom: '0.2rem' }}>
        <input className="btitle" placeholder="name this method" value={title} onChange={(event) => setTitle(event.target.value)} />
      </div>
      <div className="bframe">
        <MiniDeck deck={states[cur]} step={cur} tracked={tracked} animate={animate} speed={speed} onCardClick={(card) => onTracked((slots) => toggleTracked(slots, card))} />
      </div>
      <div className="seqrow bseqrow">
        <span className={`seqlabel${cur === 0 ? ' curr' : ''}`} title="Select the start, before the first move" onClick={() => goTo(0)}>
          shuffle&nbsp;
        </span>
        {Array.from({ length: seq.length + 1 }, (_, step) => (
          <span key={step} className="seqslot">
            {step === cur && <span className="caret" />}
            {step < seq.length && (
              <span className={`tok ${seq[step]}${step === cur - 1 ? ' curr' : ''}`} title="jump here" onClick={() => goTo(step + 1)}>
                {OP_TOKEN[seq[step]]}
              </span>
            )}
          </span>
        ))}
      </div>
      <div className="bnav">
        <button className="navbtn" type="button" aria-label="Step back" disabled={cur === 0} onClick={() => goTo(cur - 1)}>
          ‹
        </button>
        <button className="navbtn" type="button" aria-label="Step forward" disabled={cur === states.length - 1} onClick={() => goTo(cur + 1)}>
          ›
        </button>
        <button className="navbtn navundo" type="button" disabled={!history.length} onClick={undo}>
          ↰ Undo
        </button>
      </div>
      <div className="builder2">
        <span className="chip mash" onClick={() => perform('mash')}>
          Mash
        </span>
        <span className="ohpill">
          <span className="ohlab">Overhand</span>
          <span className="ohhalf toph" title="Overhand the top half" onClick={() => perform('ohr')}>
            top
          </span>
          <span className="ohhalf" title="Overhand the bottom half" onClick={() => perform('ohb')}>
            btm
          </span>
        </span>
        <span className="chip pile" onClick={() => perform('pile')}>
          Pile
        </span>
      </div>
      <div className="bhint">
        Each move goes in at the marker and runs immediately. Step back, or tap a move, to insert one earlier. Tap a card to follow it through the shuffle.
      </div>
      <div className="btrack">{message || trackingSummary(tracked, posOf(states[cur]))}</div>
      <div className="builder2" style={{ marginTop: '0.6rem' }}>
        <button className="run" type="button" onClick={save}>
          Save method
        </button>
        <span className="chip" onClick={onCancel}>
          cancel
        </span>
        {editing && (
          <span
            className="chip"
            style={{ color: '#c0392b' }}
            onClick={() => {
              if (deleteArmed) onDelete()
              else setDeleteArmed(true)
            }}
          >
            {deleteArmed ? 'tap again to delete' : 'delete'}
          </span>
        )}
      </div>
    </div>
  )
}
