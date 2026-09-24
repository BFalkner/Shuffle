import { useState, type CSSProperties } from 'react'
import { LAND, LAND_COLOR, OTHER_COLOR, colorFor, posOf, type CardTypes } from '../engine/decks'
import type { Deck } from '../engine/moves'
import { TRACK_COLORS } from '../engine/tracking'
import { useElementWidth } from '../hooks/useElementWidth'
import './MiniDeck.css'

const GAP = 2
const MAX_TILE = 24
/** room on the left for the original-order strip */
const STRIP = 18
/** total stagger across the deck, ms at normal speed */
const WAVE = 420
/** slide duration, s at normal speed */
const DUR = 0.95

function gridFor(deckSize: number, width: number) {
  const gap = GAP
  const usableWidth = width - STRIP
  // Cap the tile size: wide screens get more columns, not giant tiles.
  const cols = Math.min(deckSize, Math.max(10, Math.ceil(deckSize / 6), Math.floor((usableWidth + gap) / (MAX_TILE + gap))))
  const cardWidth = Math.max(6, Math.floor((usableWidth - (cols - 1) * gap) / cols))
  const cardHeight = Math.round(cardWidth * 1.4)
  const rows = Math.ceil(deckSize / cols)
  return { cols, cardWidth, cardHeight, gap, stageW: cols * cardWidth + (cols - 1) * gap, stageH: rows * cardHeight + (rows - 1) * gap }
}

interface Props {
  /** The current arrangement: deck[position] = card id. */
  deck: Deck
  /** Which step of the shuffle is shown; stepping backwards plays the wave in reverse. */
  step: number
  /** Tracked cards; index = badge number - 1, null = empty slot. */
  tracked: readonly (number | null)[]
  animate: boolean
  speed: number
  onCardClick?: (card: number) => void
  /** When given, colour cards by type (land or not) instead of by original position. */
  types?: CardTypes
}

/** A deck laid out as a grid of colour-coded tiles that slide to their new places after each move. */
export default function MiniDeck({ deck, step, tracked, animate, speed, onCardClick, types }: Props) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>(320)
  const deckSize = deck.length
  const grid = gridFor(deckSize, width)

  // Remember what was shown before the current deck, so each card knows where it's coming from.
  // (React's "store information from previous renders" pattern.)
  const [shown, setShown] = useState<{ deck: Deck; step: number; from: { deck: Deck; step: number } | null }>({ deck, step, from: null })
  if (shown.deck !== deck) setShown({ deck, step, from: { deck: shown.deck, step: shown.step } })
  const last = shown.from && shown.from.deck.length === deckSize ? shown.from : null

  const pos = posOf(deck)
  const startPos = posOf(last ? last.deck : deck)
  const forward = !last || step >= last.step
  const delayPer = WAVE / deckSize / speed

  const stageStyle = {
    width: grid.stageW,
    height: grid.stageH,
    '--dur': `${(DUR / speed).toFixed(3)}s`,
  } as CSSProperties

  return (
    <div ref={wrapRef} className={`minideck${animate ? '' : ' minideck--still'}`}>
      <div className="minideck-stage" style={stageStyle}>
        {!types && (
          <div
            className="minideck-strip"
            title="original order, front to back"
            style={{ background: `linear-gradient(to bottom,${colorFor(0, deckSize)},${colorFor(Math.floor(deckSize / 2), deckSize)},${colorFor(deckSize - 1, deckSize)})` }}
          />
        )}
        {Array.from({ length: deckSize }, (_, card) => {
          const idx = pos[card]
          const row = Math.floor(idx / grid.cols)
          const column = idx % grid.cols
          const trackIndex = tracked.indexOf(card)
          const travel = Math.abs(idx - startPos[card])
          // Forward: cards leave in order of destination; backward: in order of where they start.
          const key = forward ? idx : startPos[card]
          const style: CSSProperties = {
            width: grid.cardWidth,
            height: grid.cardHeight,
            background: types ? (types[card] === LAND ? LAND_COLOR : OTHER_COLOR) : colorFor(card, deckSize),
            transform: `translate(${column * (grid.cardWidth + grid.gap)}px,${row * (grid.cardHeight + grid.gap)}px)`,
            transitionDelay: `${animate ? (key * delayPer).toFixed(0) : 0}ms`,
            // tracked on top; movers above stationary; longer trips higher
            zIndex: trackIndex >= 0 ? 1000 + trackIndex : travel > 0 ? 100 + travel : 1,
          }
          if (trackIndex >= 0) {
            style.outline = `2.5px solid ${TRACK_COLORS[trackIndex]}`
            style.boxShadow = '0 0 0 1px #fff,0 2px 6px rgba(0,0,0,0.3)'
          }
          return (
            <div key={card} className="minideck-card" style={style} onClick={onCardClick ? () => onCardClick(card) : undefined}>
              {trackIndex >= 0 && (
                <div className="minideck-badge" style={{ background: TRACK_COLORS[trackIndex] }}>
                  {trackIndex + 1}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
