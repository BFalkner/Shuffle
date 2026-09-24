import { useMemo, type Dispatch, type SetStateAction } from 'react'
import MiniDeck from '../../components/MiniDeck'
import type { CardTypes } from '../../engine/decks'
import { posOf } from '../../engine/decks'
import type { Experiment } from '../../engine/experiments'
import { OP_COST, OP_NAME, OP_TOKEN, runStates, type Deck } from '../../engine/moves'
import { liveTracked, toggleTracked, trackingSummary, type TrackSlots } from '../../engine/tracking'
import type { ScoredResult } from './types'

interface Props {
  exp: Experiment
  result: ScoredResult | undefined
  start: Deck
  /** card types, when the starting deck is shown by type */
  types?: CardTypes
  startLabel: string
  /** shared step (also drives the dots on the charts) */
  step: number
  onStep: (step: number) => void
  tracked: TrackSlots
  onTracked: Dispatch<SetStateAction<TrackSlots>>
  animate: boolean
  speed: number
}

/** Opened under a method's row: watch it shuffle one example deck, step by step. */
export default function MethodPanel({ exp, result, start, types, startLabel, step: sharedStep, onStep, tracked, onTracked, animate, speed }: Props) {
  // One example run of this method from the current starting deck.
  const states = useMemo(() => runStates(start, exp.seq), [start, exp.seq])
  const step = Math.min(sharedStep, states.length - 1)
  const cost = exp.seq.reduce((total, op) => total + OP_COST[op], 0)
  const fails = result?.fails ?? []
  const hasTracked = liveTracked(tracked).length > 0

  return (
    <div className="cmpanim">
      <div className="panhead">
        <div className="panseq">
          {exp.seq.map((op, index) => (
            <span key={index} className={`tok ${op}${index === step - 1 ? ' curr' : ''}`} title="jump to this step" onClick={() => onStep(index + 1)}>
              {OP_TOKEN[op]}
            </span>
          ))}
        </div>
        <div className="panmeta">
          {exp.seq.length} moves · {cost} unit{cost === 1 ? '' : 's'} ·{' '}
          {result ? (fails.length ? `short on: ${fails.join(', ')}` : 'clears every diagnostic') : 'scoring…'}
          {hasTracked && (
            <span className="panuntrack" onClick={() => onTracked(tracked.map(() => null))}>
              clear tracking
            </span>
          )}
        </div>
      </div>
      <MiniDeck types={types} deck={states[step]} step={step} tracked={tracked} animate={animate} speed={speed} onCardClick={(card) => onTracked((slots) => toggleTracked(slots, card))} />
      <div className="mininav">
        <button type="button" disabled={step === 0} onClick={() => onStep(step - 1)} aria-label="Step back">
          ‹
        </button>
        <span className="cmpaniml">{step === 0 ? `start — ${startLabel}` : `${step} / ${exp.seq.length} · ${OP_NAME[exp.seq[step - 1]]}`}</span>
        <button type="button" disabled={step === states.length - 1} onClick={() => onStep(step + 1)} aria-label="Step forward">
          ›
        </button>
      </div>
      <div className="btrack">{trackingSummary(tracked, posOf(states[step]))}</div>
    </div>
  )
}
