import { useState, type Dispatch, type SetStateAction } from 'react'
import { Button } from 'react-aria-components'
import MiniDeck from '../../components/MiniDeck'
import { toggleTracked, trackingSummary, type TrackSlots } from '../../components/tracking'
import { posOf } from '../../engine/decks'
import { OPS, type Deck, type OpKey } from '../../engine/moves'
import { OP_NAME } from '../../engine/routines'

/**
 * One example deck put through the routine, one state per step. After an edit, the steps before the change keep the
 * decks they had, and only the rest are dealt again, so adding a move at the end doesn't reshuffle what came before.
 */
function useExampleStates(start: Deck, seq: OpKey[]): Deck[] {
  // React's "store information from previous renders" pattern: when the moves change, work out the new states during
  // render from the ones held.
  const [held, setHeld] = useState(() => ({ start, seq, states: dealOn([start], seq) }))
  if (held.start === start && held.seq === seq) return held.states
  // A new starting deck deals everything again; new moves keep the states before the first move that changed.
  const unchanged = seq.findIndex((op, index) => op !== held.seq[index])
  const kept = held.start === start ? Math.min(unchanged < 0 ? seq.length : unchanged, held.seq.length) : 0
  const next = { start, seq, states: dealOn(held.start === start ? held.states.slice(0, kept + 1) : [start], seq.slice(kept)) }
  setHeld(next)
  return next.states
}

/** Continue dealt states through more moves: each move applies to the last state. */
function dealOn(states: Deck[], moves: OpKey[]): Deck[] {
  return moves.reduce((dealt, op) => [...dealt, OPS[op](dealt[dealt.length - 1])], states)
}

interface Props {
  start: Deck
  seq: OpKey[]
  startLabel: string
  step: number
  onStep: (step: number) => void
  tracked: TrackSlots
  onTracked: Dispatch<SetStateAction<TrackSlots>>
  animate: boolean
  speed: number
}

/** The example deck at the caret's step, with buttons to step through the routine and cards you can follow. */
export default function DeckView({ start, seq, startLabel, step, onStep, tracked, onTracked, animate, speed }: Props) {
  const states = useExampleStates(start, seq)
  const shown = Math.min(step, states.length - 1)
  const summary = trackingSummary(tracked, posOf(states[shown]))

  return (
    <section className="deckview" aria-label="Example deck">
      <div className="deckview-head">
        <Button className="stepbtn" aria-label="Previous step" isDisabled={shown === 0} onPress={() => onStep(shown - 1)}>
          ‹
        </Button>
        <span className="deckview-step">{shown === 0 ? `Starting deck, ${startLabel}` : `After move ${shown} of ${seq.length}: ${OP_NAME[seq[shown - 1]]}`}</span>
        <Button className="stepbtn" aria-label="Next step" isDisabled={shown === states.length - 1} onPress={() => onStep(shown + 1)}>
          ›
        </Button>
      </div>
      {/* The wrapper leaves room on the left for the deck's original-order strip, outside the width MiniDeck measures. */}
      <div className="deckview-deck">
        <MiniDeck deck={states[shown]} step={shown} tracked={tracked} animate={animate} speed={speed} onCardClick={(card) => onTracked((slots) => toggleTracked(slots, card))} />
      </div>
      <div className="deckview-foot">
        {summary ? (
          <>
            <span className="deckview-tracking">{summary}</span>
            <Button className="textbtn" onPress={() => onTracked((slots) => slots.map(() => null))}>
              Stop following
            </Button>
          </>
        ) : (
          <span className="deckview-hint">Tap a card to follow it through the shuffle.</span>
        )}
      </div>
    </section>
  )
}
