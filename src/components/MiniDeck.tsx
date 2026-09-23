import { useState, type CSSProperties } from 'react'
import { colorFor, posOf } from '../engine/decks'
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

function gridFor(n: number, width: number) {
  const gap = GAP
  const W = width - STRIP
  // Cap the tile size: wide screens get more columns, not giant tiles.
  const cols = Math.min(n, Math.max(10, Math.ceil(n / 6), Math.floor((W + gap) / (MAX_TILE + gap))))
  const cw = Math.max(6, Math.floor((W - (cols - 1) * gap) / cols))
  const ch = Math.round(cw * 1.4)
  const rows = Math.ceil(n / cols)
  return { cols, cw, ch, gap, stageW: cols * cw + (cols - 1) * gap, stageH: rows * ch + (rows - 1) * gap }
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
}

/** A deck laid out as a grid of colour-coded tiles that slide to their new places after each move. */
export default function MiniDeck({ deck, step, tracked, animate, speed, onCardClick }: Props) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>(320)
  const n = deck.length
  const g = gridFor(n, width)

  // Remember what was shown before the current deck, so each card knows where it's coming from.
  // (React's "store information from previous renders" pattern.)
  const [shown, setShown] = useState<{ deck: Deck; step: number; from: { deck: Deck; step: number } | null }>({ deck, step, from: null })
  if (shown.deck !== deck) setShown({ deck, step, from: { deck: shown.deck, step: shown.step } })
  const last = shown.from && shown.from.deck.length === n ? shown.from : null

  const pos = posOf(deck)
  const startPos = posOf(last ? last.deck : deck)
  const forward = !last || step >= last.step
  const delayPer = WAVE / n / speed

  const stageStyle = {
    width: g.stageW,
    height: g.stageH,
    '--dur': `${(DUR / speed).toFixed(3)}s`,
  } as CSSProperties

  return (
    <div ref={wrapRef} className={`minideck${animate ? '' : ' minideck--still'}`}>
      <div className="minideck-stage" style={stageStyle}>
        <div
          className="minideck-strip"
          title="original order, front to back"
          style={{ background: `linear-gradient(to bottom,${colorFor(0, n)},${colorFor(Math.floor(n / 2), n)},${colorFor(n - 1, n)})` }}
        />
        {Array.from({ length: n }, (_, card) => {
          const idx = pos[card]
          const r = Math.floor(idx / g.cols)
          const c = idx % g.cols
          const ti = tracked.indexOf(card)
          const travel = Math.abs(idx - startPos[card])
          // Forward: cards leave in order of destination; backward: in order of where they start.
          const key = forward ? idx : startPos[card]
          const style: CSSProperties = {
            width: g.cw,
            height: g.ch,
            background: colorFor(card, n),
            transform: `translate(${c * (g.cw + g.gap)}px,${r * (g.ch + g.gap)}px)`,
            transitionDelay: `${animate ? (key * delayPer).toFixed(0) : 0}ms`,
            // tracked on top; movers above stationary; longer trips higher
            zIndex: ti >= 0 ? 1000 + ti : travel > 0 ? 100 + travel : 1,
          }
          if (ti >= 0) {
            style.outline = `2.5px solid ${TRACK_COLORS[ti]}`
            style.boxShadow = '0 0 0 1px #fff,0 2px 6px rgba(0,0,0,0.3)'
          }
          return (
            <div key={card} className="minideck-card" style={style} onClick={onCardClick ? () => onCardClick(card) : undefined}>
              {ti >= 0 && (
                <div className="minideck-badge" style={{ background: TRACK_COLORS[ti] }}>
                  {ti + 1}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
