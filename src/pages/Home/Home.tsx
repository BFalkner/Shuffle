import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useTitle } from '../../hooks/useTitle'
import DATA from './data.json'
import { startMoveDemo, type DemoMove } from './moveDemo'
import OpsChart from './OpsChart'
import { OPS_CHARTS } from './opsCharts'
import './home.css'

// The two recommended methods, from a search of every move sequence costing up to 7 units (see the footnote).
const P = DATA.cards

interface MoveInfo {
  op: DemoMove
  name: string
  color: string
  paragraphs: ReactNode[]
  /** strength after four repetitions, 0–100: ordering, proximity, position */
  bars: [number, number, number]
}

const MOVES: MoveInfo[] = [
  {
    op: 'mash',
    name: 'Mash / Riffle',
    color: '#1a6b3a',
    paragraphs: [
      'Split the deck in two and let the halves fall together in small packets, so the two streams interleave into one pile.',
      'Interleaving carries cards from each half deep into the other, spreading them along the whole deck and pulling apart cards that sat together. With packet sizes fitted to a real hand, mostly single cards, the interleave is fine enough to break up runs within a few passes. Its weakness is the ends of the deck: the outermost cards barely move from pass to pass, so a card seen on the bottom stays findable long after the rest of the deck reads random.',
    ],
    bars: [32, 100, 100],
  },
  {
    op: 'pile',
    name: 'Pile',
    color: '#3a5f9e',
    paragraphs: [
      'Deal the deck one card at a time into six face-down piles, cycling through them in order, then stack the piles back into one.',
      'Each card goes to a different pile from the card before it, so no two neighbouring cards stay together and clumps break up completely in one pass. The deal is fixed, though: every card lands in a predictable slot, so the result is a clean, repeatable separation rather than a random arrangement.',
    ],
    bars: [100, 98, 0],
  },
  {
    op: 'overhand',
    name: 'Overhand',
    color: '#c0612a',
    paragraphs: [
      'Hold the deck in one hand and use the other thumb to slide small packets off the top, dropping each new packet on top of the last, until the whole deck has passed through.',
      'This reverses the order of the packets but leaves the cards inside each packet in their original order. It moves blocks from top to bottom and breaks long runs at the seams between packets, but it works in chunks rather than card by card.',
    ],
    bars: [90, 56, 44],
  },
  {
    op: 'ohr',
    name: 'Half Overhand with Riffle',
    color: '#2f8f7f',
    paragraphs: [
      'Cut the deck in two, overhand-shuffle one half (peeling it into small, reversed packets), then riffle the halves back together.',
      'Reversing one half flips the direction of its runs, so when the halves interleave, cards that were neighbours are driven apart instead of carried along together. Its particular strength is proximity: it separates neighbouring cards that a riffle alone tends to leave in their original clumps.',
    ],
    bars: [100, 99, 100],
  },
]

const START_DECK_TEXT: ReactNode[] = [
  'Cards sit in the exact order the deck was built, so every kind of structure is at its maximum. This is the hardest case: bulk order, neighbours and position all have to be broken up from scratch. It takes eight mashes to clear every test reliably from here.',
  'Seven mashes, then the top thirty cards sorted: the shuffling of an ordinary game, plus the ordered block that goes back on top when you gather your cards afterwards. It looks random at arm’s length, but the block is real structure. Ordering reads 36 against a random deck’s 50, close pairs 12.3 against 5.9, and the original end cards sit at their ends at five times the random rate.',
  <>
    Lands dealt at perfectly even intervals before shuffling. If a shuffle leaves that pattern intact, the regularity is real structure, and the
    land-spacing test catches it immediately: lands spaced <i>too</i> regularly are as far from random as lands clumped together.
  </>,
  'The opposite failure: lands gathered into three loose clusters, as a deck looks after a game in which lands came out in runs. Shuffling has to disperse the clumps, and the land-spacing and clump-rate tests track how quickly it does.',
]

function MoveDemo({ op }: { op: DemoMove }) {
  const host = useRef<HTMLDivElement>(null)
  const caption = useRef<HTMLDivElement>(null)
  useEffect(() => startMoveDemo(host.current!, caption.current!, op), [op])
  return (
    <>
      <div className="movedeck" ref={host} />
      <div className="movecap" ref={caption} />
    </>
  )
}

export default function Home() {
  useTitle('Does Your Shuffle Randomize the Deck?')
  return (
    <div className="home">
      <div className="eyebrow">A 99-card Commander shuffling study</div>
      <h1>
        Does your shuffle <em>randomize</em>
        <br />
        the deck?
      </h1>
      <p className="lede">
        A riffle separates two neighbouring cards only when they fall in different packets, so some of a deck&rsquo;s order survives every shuffle, and
        that leftover order can be measured. With packet sizes taken from a real hand, a fine mash breaks up bulk order within a handful of passes. What it
        cannot do is move the ends of the deck: a card known to be on the bottom stays findable long after the aggregate tests read clean. Below are the four
        moves, what each does on its own, and the two methods we recommend.
      </p>

      <div className="rule double" />

      <div className="sec-eyebrow">Two methods worth using</div>
      <div className="cards">
        {P.cards.map((c) => (
          <div key={c.name} className="mcard">
            <div className="top">
              <div>
                <div className="crown">{c.crown}</div>
                <h3>{c.name}</h3>
                <div className="seq">{c.seq}</div>
              </div>
              <div className="speed">
                <div className="lab">Time cost</div>
                <div className="v">
                  {c.speed}
                  <small>u</small>
                </div>
              </div>
            </div>
            <div className="when">
              <b>Use on:</b> {c.when}
            </div>
            <p>{c.blurb}</p>
            <div className="foot">
              <Link className="btn" to="/simulator">
                Open simulator →
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="rule" />
      <div className="sec-eyebrow">The moves</div>
      <div className="defs">
        {MOVES.map((m) => (
          <div key={m.op} className="def">
            <div className="dn">
              <i style={{ background: m.color }} />
              {m.name}
            </div>
            <MoveDemo op={m.op} />
            <div className="dd">
              {m.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div className="mbars">
              {(['Ordering', 'Proximity', 'Position'] as const).map((label, i) => (
                <div key={label} className="mbar">
                  <div className="mbl">
                    <span>{label}</span>
                    <span>{m.bars[i]}</span>
                  </div>
                  <div className="mtrack">
                    <div className="mfill" style={{ width: `${m.bars[i]}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="opsintro" style={{ marginTop: '0.9rem', marginBottom: 0 }}>
        Bars show each move’s strength after four repetitions. A full bar means the move reaches random on that test.
      </p>

      <div className="rule" />
      <div className="sec-eyebrow">The three tests, one move at a time</div>
      <p className="opsintro">
        Only the <b>mash</b> both randomizes position and separates neighbours, because only a riffle interleaves, and with packet sizes fitted to a real
        hand it does so quickly, clearing every bulk test within six passes. Its blind spot is the ends of the deck, where the outermost cards barely move
        from pass to pass. The <b>overhand</b> breaks up sequence order in a single move, but on its own it does nothing for position or proximity. The{' '}
        <b>pile</b> separates neighbours completely in one pass, but the deal is deterministic, so it puts every card in a predictable slot rather than
        randomizing it. The <b>half overhand</b> overhands one half and riffles it back in a single motion, breaking up sequence and spreading position
        together.
      </p>
      <div className="opsgrid">
        {OPS_CHARTS.map((cfg) => (
          <OpsChart key={cfg.key} cfg={cfg} />
        ))}
      </div>

      <div className="rule" />
      <div className="sec-eyebrow">The starting decks</div>
      <p className="opsintro">
        Every result on this page depends on what the deck looked like before shuffling started. These are the four starting states the simulator tests
        against. The left edge of each strip is the top of the deck. The first two strips are coloured by original position, and the other two by card type:{' '}
        <span style={{ color: '#2e7d4f', fontWeight: 600 }}>lands</span> against spells.
      </p>
      <div className="defs startdefs">
        {DATA.startDecks.map((d, i) => (
          <div key={d.name} className="def">
            <div className="dn">{d.name}</div>
            <div className="deckstrip">
              {d.fills.map((fill, j) => (
                <i key={j} style={{ background: fill }} />
              ))}
            </div>
            <div className="dd">
              <p>{START_DECK_TEXT[i]}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="foot-note">
        Time cost: mash = 1 unit, half overhand = 1, full overhand = 2, pile = 4 (assumed, pending measurement). Pass thresholds sit two standard deviations
        from random decks: ordering ≥ {P.thr.seq} runs, proximity ≤ {P.thr.cp} close pairs. Random baselines: ordering {P.rand.seq}, proximity {P.rand.cp}.
        The recommendations come from a search of every move sequence costing up to 7 units, scored from a played deck. The leaders were then run 20
        times from each of the four starting decks below, and a run counts as a pass only when it clears every test.
      </p>
    </div>
  )
}
