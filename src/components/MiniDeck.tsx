import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { posOf } from '../engine/decks'
import type { Deck } from '../engine/moves'
import { useElementSize } from '../hooks/useElementSize'
import { colorFor } from './deckColors'
import { LEATHER_DENSITY, LEATHER_SIZE, leatherTexture } from './leather'
import { TRACK_COLORS } from './tracking'
import './MiniDeck.css'

const GAP = 4
const MAX_TILE = 22
/** height over width: a Magic card is 63 × 88 mm */
const CARD_RATIO = 88 / 63
/** room on the left for the original-order strip */
const STRIP = 18
/** total stagger across the deck, ms at normal speed */
const WAVE = 420
/** slide duration, s at normal speed */
const DUR = 0.8
/** which way the shine's lamp stands from the deck's centre, degrees clockwise: 0 far side, 90 right, 180 near side, 270 left */
const LAMP_DIRECTION = 18.4
/** how far the lamp stands from the deck's centre along the table, in deck widths */
const LAMP_DISTANCE = 15
/** how high the lamp is above the table, in deck widths: the lower it is, the brighter the deck's near side than its far side */
const LAMP_HEIGHT = 15
/** how high the lamp stands above the deck, degrees up from the table; the cards' leather is lit from it too */
const LAMP_ELEVATION = (Math.atan2(LAMP_HEIGHT, LAMP_DISTANCE) * 180) / Math.PI
/** half the beam's width at the deck's centre, px: the light is half as bright this far from the middle of the beam */
const BEAM_WIDTH = 45
/** how bright the beam is at the deck's centre */
const BEAM_PEAK = 0.20
/** the beam's average speed across the deck's centre, px a second */
const SHINE_SPEED = 170
/** the shortest and longest wait before each shine, ms; each wait is picked at random between them */
const SHINE_WAIT_SHORTEST = 2 * 60_000
const SHINE_WAIT_LONGEST = 5 * 60_000
/** how far out the beam's light is faded to nothing, in BEAM_WIDTHs; by then it is under 3% of its peak */
const BEAM_REACH = 6
/** where the gradient samples the beam's brightness across its width, in BEAM_WIDTHs from its middle */
const BEAM_SAMPLES = [0.22, 0.44, 0.67, 1, 1.33, 1.78, 2.33, 3, 3.78, 4.89]

const degrees = (radians: number) => (radians * 180) / Math.PI
const radians = (degrees: number) => (degrees * Math.PI) / 180

/**
 * Whether the shine is sweeping now, and a callback for when its sweep ends. A sweep starts after a random wait, and
 * the end of each sweep starts the next wait. Nothing is timed while animation is off, and turning it off ends a sweep.
 */
function useShine(enabled: boolean): [boolean, () => void] {
  const [sweeping, setSweeping] = useState(false)
  if (!enabled && sweeping) setSweeping(false)

  useEffect(() => {
    if (!enabled || sweeping) return
    const wait = SHINE_WAIT_SHORTEST + Math.random() * (SHINE_WAIT_LONGEST - SHINE_WAIT_SHORTEST)
    const timer = setTimeout(() => setSweeping(true), wait)
    return () => clearTimeout(timer)
  }, [enabled, sweeping])

  return [sweeping, () => setSweeping(false)]
}

interface LampBeam {
  style: CSSProperties
  /** the rotations the beam swings from and to, degrees */
  swing: [number, number]
  /** ms */
  duration: number
}

/**
 * The shine's beam, worked out from the settings above for a deck of this size. It comes from a lamp standing off the
 * deck (keep LAMP_DISTANCE above about 1, so the lamp stays off it) and turning on its base, so the beam swings across
 * the deck in an arc.
 *
 * The beam is drawn in a box hanging straight down from the lamp, covering the distances from the lamp to the deck's
 * nearest and farthest corners, and turned round the lamp. Across its width the beam is lit the way light spreads from
 * a lamp: at an angle a from its middle, 1 / (1 + (a / spread)²), where the spread is the angle BEAM_WIDTH makes at the
 * deck's centre. Along it, a raised lamp's light falls off with the square of the distance to it, so a card whose floor
 * distance to the lamp is r gets (nearest² + height²) / (r² + height²) of the light the nearest card gets. The mask
 * draws that, and the opacity sets the deck's centre to BEAM_PEAK.
 *
 * The swing starts with the beam's faded edge just past the deck's first corner and ends with it just past the last,
 * at SHINE_SPEED on average across the deck's centre. The light travels left to right, or top to bottom when the lamp
 * stands straight out to one side.
 */
function lampBeam(stageW: number, stageH: number): LampBeam {
  const distance = LAMP_DISTANCE * stageW
  const height = LAMP_HEIGHT * stageW
  const direction = radians(LAMP_DIRECTION)
  const x = stageW / 2 + distance * Math.sin(direction)
  const y = stageH / 2 - distance * Math.cos(direction)
  const corners = [
    [0, 0],
    [stageW, 0],
    [0, stageH],
    [stageW, stageH],
  ]

  // rotate(a) turns "straight down" to point along (-sin a, cos a), so rotating by LAMP_DIRECTION aims the beam at the
  // deck's centre. Each corner's aim is measured from there, between -180° and 180°, so no direction wraps round.
  const aimAt = ([cornerX, cornerY]: number[]) => ((((degrees(Math.atan2(x - cornerX, cornerY - y)) - LAMP_DIRECTION) % 360) + 540) % 360) - 180
  const aims = corners.map(aimAt)
  const spread = degrees(Math.atan(BEAM_WIDTH / distance))
  const edge = BEAM_REACH * spread
  const first = LAMP_DIRECTION + Math.min(...aims) - edge
  const last = LAMP_DIRECTION + Math.max(...aims) + edge
  // Turning the beam clockwise moves its light across the deck along (-cos d, -sin d), for the lamp's direction d.
  const clockwiseMovesRight = Math.abs(Math.cos(direction)) > 0.01 ? -Math.cos(direction) > 0 : -Math.sin(direction) > 0
  const swing: [number, number] = clockwiseMovesRight ? [first, last] : [last, first]
  const duration = ((radians(last - first) * distance) / SHINE_SPEED) * 1000

  const reaches = corners.map(([cornerX, cornerY]) => Math.hypot(cornerX - x, cornerY - y))
  const nearest = Math.min(...reaches) - 2
  const farthest = Math.max(...reaches) + 2
  const lightAt = (reach: number) => (nearest ** 2 + height ** 2) / (reach ** 2 + height ** 2)
  const falloff = Array.from({ length: 6 }, (_, index) => nearest + ((farthest - nearest) * index) / 5).map(
    (reach) => `rgba(0,0,0,${lightAt(reach).toFixed(3)}) ${Math.round(reach)}px`,
  )

  // The beam points straight down the box, at 180° in the conic gradient.
  const glow = (widths: number) => `rgba(255,250,232,${(1 / (1 + widths ** 2)).toFixed(3)})`
  const across = [
    ...BEAM_SAMPLES.toReversed().map((widths) => `${glow(widths)} ${(180 - widths * spread).toFixed(3)}deg`),
    `${glow(0)} 180deg`,
    ...BEAM_SAMPLES.map((widths) => `${glow(widths)} ${(180 + widths * spread).toFixed(3)}deg`),
  ]
  const width = 2 * farthest * Math.tan(radians(edge))

  return {
    style: {
      left: x - width / 2,
      top: y + nearest,
      width,
      height: farthest - nearest,
      opacity: BEAM_PEAK / lightAt(distance),
      background: `conic-gradient(at 50% ${-nearest}px,transparent ${(180 - edge).toFixed(3)}deg,${across.join(',')},transparent ${(180 + edge).toFixed(3)}deg)`,
      maskImage: `radial-gradient(circle at 50% ${-nearest}px,${falloff.join(',')})`,
      transformOrigin: `50% ${-nearest}px`,
      transform: `rotate(${swing[0]}deg)`,
    },
    swing,
    duration,
  }
}

/**
 * The cards' leather texture, lit from the lamp. Drawing it takes a few hundred milliseconds the first time, so the
 * deck shows its plain colours first and the leather is drawn once the browser is idle. After that it comes from the
 * texture's cache.
 */
function useLeather(): string | null {
  const [texture, setTexture] = useState<string | null>(null)
  useEffect(() => {
    const draw = () => setTexture(leatherTexture(LAMP_DIRECTION, LAMP_ELEVATION))
    if (!window.requestIdleCallback) {
      const timer = window.setTimeout(draw, 200)
      return () => window.clearTimeout(timer)
    }
    const idle = window.requestIdleCallback(draw, { timeout: 2000 })
    return () => window.cancelIdleCallback(idle)
  }, [])
  return texture
}

/** One sweep of the shine's beam. It swings once on mount, and `onEnd` runs when it has finished. */
function ShineBeam({ beam, onEnd }: { beam: LampBeam; onEnd: () => void }) {
  const beamRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sweep = beamRef.current?.animate([{ transform: `rotate(${beam.swing[0]}deg)` }, { transform: `rotate(${beam.swing[1]}deg)` }], {
      duration: beam.duration,
      easing: 'ease-in-out',
      fill: 'both',
    })
    // A sweep cancelled on unmount rejects `finished`; there is nothing to do then.
    sweep?.finished.then(onEnd, () => {})
    return () => sweep?.cancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={beamRef} className="minideck-shine-beam" style={beam.style} />
}

/** how many columns each deck size is laid out in: 52 cards make 13 by 4, 60 make 10 by 6, and 99 make 11 by 9 */
const COLUMNS: Record<number, number> = { 52: 13, 60: 10, 99: 11 }
/** the columns for a deck size not listed above */
const DEFAULT_COLUMNS = 11

/**
 * The grid for a deck in `width` by `height`: its COLUMNS across, as many rows as it needs, and cards as big as both
 * the width and the height allow, capped at MAX_TILE. In a wide space the height decides, and the deck is centred
 * with room either side.
 */
function gridFor(deckSize: number, width: number, height: number) {
  const gap = GAP
  const cols = Math.min(COLUMNS[deckSize] ?? DEFAULT_COLUMNS, deckSize)
  const rows = Math.ceil(deckSize / cols)
  const byWidth = (width - STRIP - (cols - 1) * gap) / cols
  const byHeight = (height - (rows - 1) * gap) / rows / CARD_RATIO
  const cardWidth = Math.max(6, Math.floor(Math.min(MAX_TILE, byWidth, byHeight)))
  const cardHeight = Math.round(cardWidth * CARD_RATIO)
  return { cols, rows, cardWidth, cardHeight, gap, stageW: cols * cardWidth + (cols - 1) * gap, stageH: rows * cardHeight + (rows - 1) * gap }
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
  // The deck fits itself into the box it is given, so its wrapper is sized by the page, not by the cards.
  const [wrapRef, box] = useElementSize<HTMLDivElement>({ width: 320, height: 240 })
  const deckSize = deck.length
  const grid = gridFor(deckSize, box.width, box.height)

  // Remember what was shown before the current deck, so each card knows where it's coming from.
  // (React's "store information from previous renders" pattern.)
  const [shown, setShown] = useState<{ deck: Deck; step: number; from: { deck: Deck; step: number } | null }>({ deck, step, from: null })
  if (shown.deck !== deck) setShown({ deck, step, from: { deck: shown.deck, step: shown.step } })
  const last = shown.from && shown.from.deck.length === deckSize ? shown.from : null
  const [shining, endShine] = useShine(animate)
  const leather = useLeather()

  const pos = posOf(deck)
  const startPos = posOf(last ? last.deck : deck)
  const forward = !last || step >= last.step
  const delayPer = WAVE / deckSize / speed

  const stageStyle = {
    width: grid.stageW,
    height: grid.stageH,
    '--dur': `${(DUR / speed).toFixed(3)}s`,
    // Every card wears the same leather, lit from the lamp, each from its own patch of it.
    '--leather': leather ? `url(${leather})` : 'none',
    '--leather-size': `${LEATHER_SIZE / LEATHER_DENSITY}px`,
  } as CSSProperties

  // The shine's mask covers each card's slot. A short last row leaves empty slots at its end, cut off by the clip.
  const lastRow = deckSize % grid.cols
  const fullHeight = (grid.rows - 1) * (grid.cardHeight + grid.gap)
  const lastRowWidth = lastRow * (grid.cardWidth + grid.gap)
  const shineStyle = {
    '--card-w': `${grid.cardWidth}px`,
    '--card-h': `${grid.cardHeight}px`,
    '--pitch-x': `${grid.cardWidth + grid.gap}px`,
    '--pitch-y': `${grid.cardHeight + grid.gap}px`,
    clipPath: lastRow ? `polygon(0 0,100% 0,100% ${fullHeight}px,${lastRowWidth}px ${fullHeight}px,${lastRowWidth}px 100%,0 100%)` : undefined,
  } as CSSProperties

  return (
    <div ref={wrapRef} className={`minideck${animate ? '' : ' minideck--still'}`}>
      <div className="minideck-stage" style={stageStyle}>
        <div
          className="minideck-strip"
          title="original order, front to back"
          style={{ background: `linear-gradient(to bottom,${colorFor(0, deckSize)},${colorFor(Math.floor(deckSize / 2), deckSize)},${colorFor(deckSize - 1, deckSize)})` }}
        />
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
            backgroundColor: colorFor(card, deckSize),
            // a different patch of the leather for each card, so no two look alike
            backgroundPosition: `${-((card * 53) % (LEATHER_SIZE / LEATHER_DENSITY))}px ${-((card * 97) % (LEATHER_SIZE / LEATHER_DENSITY))}px`,
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
        {shining && (
          <div className="minideck-shine" style={shineStyle} aria-hidden="true">
            <ShineBeam beam={lampBeam(grid.stageW, grid.stageH)} onEnd={endShine} />
          </div>
        )}
      </div>
    </div>
  )
}
