import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useTitle } from '../../hooks/useTitle'
import DATA from './data.json'
import { startMoveDemo, type DemoMove } from './moveDemo'
import OpsChart from './OpsChart'
import { OPS_CHARTS } from './opsCharts'
import './home.css'

// Precomputed: the two recommended methods, scored from a sorted deck over 800+ trials.
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
      'Split the deck into two halves and bring them together by releasing cards from both halves in small clumps, so the two streams interleave as they fall into a single pile.',
      'Interleaving carries cards from each half deep into the other, redistributing positions along the full length of the deck and pulling apart cards that sat together. With packet sizes fitted to a real hand — mostly single cards — the interleave is fine enough to shred runs within a few passes. Its weakness is the sticky ends: the outermost cards barely move, pass after pass, so a card seen on the bottom stays findable long after the rest of the deck reads random.',
    ],
    bars: [32, 100, 100],
  },
  {
    op: 'pile',
    name: 'Pile',
    color: '#3a5f9e',
    paragraphs: [
      'Deal the deck card by card into six face-down piles, cycling through them in order, then stack the piles back into one.',
      'Sending each successive card to a different pile means no two formerly adjacent cards stay together, so clumps are broken apart completely in a single pass. The deal is fixed, so every card lands in a determined slot — a clean, repeatable separation rather than a random arrangement.',
    ],
    bars: [100, 98, 0],
  },
  {
    op: 'overhand',
    name: 'Overhand',
    color: '#c0612a',
    paragraphs: [
      'Hold the deck in one hand and use the opposite thumb to peel small packets off the top, dropping each new packet on top of the last, until the whole deck has passed through.',
      'Peeling and re-stacking reverses the order of the packets while leaving the cards inside each packet in their original sequence. It transports blocks from top to bottom and snaps long stretches of sequence at the seams between packets, working on the deck in chunks rather than card by card.',
    ],
    bars: [90, 56, 44],
  },
  {
    op: 'ohr',
    name: 'Half Overhand with Riffle',
    color: '#2f8f7f',
    paragraphs: [
      'Cut the deck in two and overhand-shuffle one of the halves — peel it into small reversed packets — then bring the halves together by riffling them, interleaving the cards as they fall.',
      'Reversing one half flips the direction of its run, so as the two halves interleave, formerly adjacent cards are driven apart instead of being carried along together. Its particular strength is proximity — separating neighbouring cards that a riffle alone tends to keep in their original clumps.',
    ],
    bars: [100, 99, 100],
  },
]

const START_DECK_TEXT: ReactNode[] = [
  'Cards sit in the exact order the deck was assembled, so every kind of structure is at its maximum. This is the hardest case: bulk order, neighbours, and position all have to be broken from scratch, and it is the state the two methods above are scored from.',
  'Seven mashes, then the top thirty cards sorted — the shuffling of an ordinary game plus the ordered block that goes back on top when you gather your cards afterwards. It looks random at arm’s length, but the block is real structure: ordering reads 36 against random’s 50, close pairs 12.3 against 5.9, and the original end cards sit at their ends at five times the random rate.',
  <>
    Lands dealt at perfectly even intervals before shuffling. If a shuffle leaves the pattern intact, that regularity is real structure — the
    land-spacing test reads it instantly, because lands spaced <i>too</i> regularly are as far from random as lands clumped together.
  </>,
  'The opposite failure: lands gathered into three loose clusters, the way a deck looks after a game in which lands came out in runs. Shuffling has to disperse the clumps, and the land-spacing and clump tests track how quickly it does.',
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
        A riffle separates two adjacent cards only when a cut happens to land in the gap between them, so order survives shuffling in measurable ways.
        Measured with packet sizes taken from a real hand, a fine mash shreds bulk order within a handful of passes — what it cannot do is move the ends of
        the deck, and a card known to be on the bottom stays findable long after the aggregate tests read clean. Below are the four moves, what each
        accomplishes on its own, and two full methods scored against three properties of a random deck.
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
        Bars show each move’s strength after four repetitions; a full bar means it reaches random on that test.
      </p>

      <div className="rule" />
      <div className="sec-eyebrow">The three tests, one move at a time</div>
      <p className="opsintro">
        Only the <b>mash</b> both randomizes position and separates neighbours, because only the riffle interleaves — and with packet sizes fitted to a
        real hand it is quick about it, clearing every bulk test within six passes. Its blind spot is its own ends: the outermost cards barely move, pass
        after pass. The <b>overhand</b> breaks sequence order in a single move, but on its own it does nothing for position or proximity. The <b>pile</b>{' '}
        separates neighbours completely in one pass, but the deal is deterministic, so it fixes every card in a knowable slot rather than randomizing it.
        The <b>Half Overhand</b> overhands one half and riffles it back in a single motion, breaking sequence and spreading position together.
      </p>
      <div className="opsgrid">
        {OPS_CHARTS.map((cfg) => (
          <OpsChart key={cfg.key} cfg={cfg} />
        ))}
      </div>

      <div className="rule" />
      <div className="sec-eyebrow">The starting decks</div>
      <p className="opsintro">
        Every result on this page depends on what the deck looked like before the shuffling started. These are the four starting states the simulator tests
        against, left edge of each strip = top of the deck. The first two are coloured by original position, the weaves by card type —{' '}
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
        Scored from a sorted deck over 800+ trials.
      </p>
    </div>
  )
}
