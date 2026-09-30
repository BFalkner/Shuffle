import type { CSSProperties } from 'react'
import { Button } from 'react-aria-components'
import type { DeckKind } from '../../engine/decks'
import { fmtLevel } from '../../engine/scoring'
import type { Scored } from './scorer'

interface Props {
  kind: DeckKind
  /** the active method's result from the current starting deck, and whether it is for an earlier version of its moves */
  current: Scored | undefined
  /** the same from the other starting deck */
  other: Scored | undefined
  onSwitchDeck: () => void
}

const DECK_NAME: Record<DeckKind, string> = { sorted: 'a sorted deck', played: 'a played deck' }

/**
 * How far from random the active method leaves the deck: the total, and each category as a bar from random (0) to a
 * sorted deck that was never shuffled (1). While an edit is being scored, the last score stays up, dimmed.
 */
export default function ScoreCard({ kind, current, other, onSwitchDeck }: Props) {
  const otherKind: DeckKind = kind === 'sorted' ? 'played' : 'sorted'
  if (!current) {
    return (
      <section className="scorecard" aria-label="Score" aria-busy="true">
        <p className="scorecard-waiting">Scoring…</p>
      </section>
    )
  }

  const { result, stale } = current
  const clean = result.clearCount === result.categories.length
  const furthest = result.categories.reduce((worst, reading) => (reading.level > worst.level ? reading : worst))

  return (
    <section className={`scorecard${stale ? ' stale' : ''}`} aria-label="Score" aria-busy={stale}>
      <h2>From {DECK_NAME[kind]}</h2>
      <p className="scorecard-total">
        <span className={`scorecard-number ${clean ? 'clean' : 'short'}`}>{fmtLevel(result.total)}</span>
        <span className="scorecard-verdict">{clean ? 'Every category is within the noise of a random deck.' : `Furthest from random: ${furthest.title}.`}</span>
      </p>
      <ul className="levels">
        {result.categories.map((reading) => (
          <li key={reading.category} className={reading.clear ? 'clean' : 'short'}>
            <span className="levels-name">{reading.title}</span>
            <span className="levels-bar" aria-hidden="true">
              <span style={{ '--level': Math.max(0, Math.min(1, reading.level)) } as CSSProperties} />
            </span>
            <span className="levels-value">{fmtLevel(reading.level)}</span>
          </li>
        ))}
      </ul>
      <p className="scorecard-scale">0 is a random deck. 1 is a sorted deck that was never shuffled. The total adds up the three.</p>
      <p className="scorecard-other">
        From {DECK_NAME[otherKind]}: <b>{other ? fmtLevel(other.result.total) : '…'}</b>
        <Button className="textbtn" onPress={onSwitchDeck}>
          Switch to {DECK_NAME[otherKind]}
        </Button>
      </p>
    </section>
  )
}
