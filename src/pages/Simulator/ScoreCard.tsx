import type { CSSProperties } from 'react'
import { Button } from 'react-aria-components'
import type { DeckKind } from '../../engine/decks'
import { fmtLevel, noiseLines } from '../../engine/scoring'
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

/** The bars' log scale, in noise lines: it runs from well inside the noise to past an unshuffled deck. */
const SCALE = { from: 0.1, to: 1000 }

/** How far along its bar a reading of `lines` noise lines reaches, 0 to 1. The edge of random, 1, sits at a quarter. */
const reach = (lines: number) =>
  lines <= SCALE.from ? 0 : Math.min(1, Math.log10(lines / SCALE.from) / Math.log10(SCALE.to / SCALE.from))

/**
 * How far from random the active method leaves the deck: the total, and each category's level beside a bar. The bar
 * shows the category in noise lines on a log scale, with a mark at the edge of random, so a bar that stops short of the
 * mark is clear and one that passes it isn't, whatever the numbers. While an edit is being scored, the last score
 * stays up, dimmed.
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
        {result.categories.map((reading) => {
          const lines = noiseLines(reading.category, result.avg, result.base, result.moveCount)
          return (
            <li key={reading.category} className={reading.clear ? 'clean' : 'short'}>
              <span className="levels-name">{reading.title}</span>
              <span className="levels-bar" aria-hidden="true" title={`${lines < 0.1 ? 'under 0.1' : lines.toPrecision(2)} times the noise of a random deck`}>
                <span style={{ '--reach': reach(lines) } as CSSProperties} />
              </span>
              <span className="levels-value">{fmtLevel(reading.level)}</span>
            </li>
          )
        })}
      </ul>
      <p className="scorecard-scale">
        0 is a random deck. 1 is a sorted deck that was never shuffled. The total adds up the three. Each bar shows how far its category is from
        random, on a log scale. A bar that stops before the mark is as random as a shuffled deck can read.
      </p>
      <p className="scorecard-other">
        From {DECK_NAME[otherKind]}: <b>{other ? fmtLevel(other.result.total) : '…'}</b>
        <Button className="textbtn" onPress={onSwitchDeck}>
          Switch to {DECK_NAME[otherKind]}
        </Button>
      </p>
    </section>
  )
}
