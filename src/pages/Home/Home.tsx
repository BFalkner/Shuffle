import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useTitle } from '../../hooks/useTitle'
import Campfire from './Campfire'
import DATA from './data.json'
import Cost, { PIP_CLASS, type Pip } from './Cost'
import Embers from './Embers'
import Hero from './Hero'
import { Vista } from './Landscape'
import MoveChart, { MoveTable } from './MoveChart'
import { CHART_MOVES, MOVE_COLOR, type Reading } from './moveCharts'
import { startMoveDemo, type DemoMove } from './moveDemo'
import { BACK_EMBERS, FRONT_EMBERS, SPEED, startBackdropParallax } from './parallax'
import { RECOMMENDATIONS } from './recommendations'
import { VISTAS } from './vistas'
import './home.css'

/** One move: what your hands do, one thing it does well, and the order it leaves behind. */
interface Step {
  op: DemoMove
  name: string
  color: string
  /** what your hands do, in one sentence */
  how: string
  good: string
  bad: string
}

const STEPS: Step[] = [
  {
    op: 'mash',
    name: 'Mash',
    color: MOVE_COLOR.mash,
    how: 'Split the deck in two and let the halves fall together a few cards at a time.',
    good: 'Every mash lowers all three readings, and eight mashes bring each one under 1%.',
    bad: 'Each half keeps its internal order, and old neighbours nearly always fall in the same half, so order is still at 40% after five mashes.',
  },
  {
    op: 'overhand',
    name: 'Overhand',
    color: MOVE_COLOR.overhand,
    how: 'Hold the deck in one hand and thumb small packets off the top, each one landing on the last.',
    good: 'Packets land in reverse order, so one overhand separates more cards from their old followers than five mashes do.',
    bad: 'Packets move whole and the deck comes out close to reversed, so after eight overhands order is still at 83%, proximity at 60% and position at 72%.',
  },
  {
    op: 'pile',
    name: 'Pile',
    color: MOVE_COLOR.pile,
    how: 'Deal the cards one at a time into six piles, then stack the piles.',
    good: 'Old neighbours always go to different piles, so one deal cuts the order across the whole deck to 14%.',
    bad: 'The deal is fixed, so position stays at 100%, and every pair of old neighbours ends up the same distance apart, which keeps proximity at 95%.',
  },
]

const CHARTS: { reading: Reading; title: string; desc: string }[] = [
  {
    reading: 'order',
    title: 'Order',
    desc: 'Whether cards keep their old followers or the deck its old direction, whichever is worse. The fixed pile stays at 100%.',
  },
  { reading: 'proximity', title: 'Proximity', desc: 'Whether old neighbours sit at distances a random deck wouldn’t produce.' },
  { reading: 'position', title: 'Position', desc: 'How much a card’s starting place tells you about where it is now.' },
]

const START_DECK_TEXT: ReactNode[] = [
  'Cards sit in the exact order the deck was built, so every kind of structure is at its maximum. This is the hardest case. The shuffle has to break up the order, the neighbours and the positions from scratch.',
  'This deck had seven mashes, and then its top thirty cards were sorted, as happens when you gather your cards after a game. It looks random at a glance, but the sorted block is real structure.',
]

/** the colour at the top of the lamp-lit sky behind the simulator's table, which the sky above fades into */
const LAMP_TOP = '#22182f'

const WRITEUPS = [
  { to: '/order-tests', title: 'Tests for leftover order' },
  { to: '/global-tests', title: 'Tests across many shuffles' },
  { to: '/mana-tests', title: 'Tests for land placement' },
  { to: '/sticky-ends', title: 'The sticky ends' },
]

/** The routine the closing panel plays, one pip at a time, like the simulator's move strip. */
const TEASER: Pip[] = ['M', 'M', 'M', 'OHt', 'M', 'M']

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

/** A die: mixing by chance. */
function ChanceGlyph() {
  const pips = [
    [-14, -14],
    [14, -14],
    [0, 0],
    [-14, 14],
    [14, 14],
  ]
  return (
    <svg className="glyph" viewBox="-40 -40 80 80" aria-hidden="true">
      <g transform="rotate(-14)">
        <rect x="-28" y="-28" width="56" height="56" rx="11" fill="none" stroke="currentColor" strokeWidth="3" />
        {pips.map(([x, y]) => (
          <circle key={`${x},${y}`} cx={x} cy={y} r="4.6" fill="currentColor" />
        ))}
      </g>
    </svg>
  )
}

/** A sword: a move that does its job by force. */
function ForceGlyph() {
  // The score runs from the tip to 1/φ of the way down the blade (tip at y=-38, crossguard at y=15) and ends in a
  // sharp point.
  return (
    <svg className="glyph" viewBox="-40 -40 80 80" aria-hidden="true">
      <g transform="rotate(40)" fill="currentColor">
        <path d="M0,-38 L4,-31 L5,14 L0,20 L-5,14 L-4,-31 Z" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="miter" strokeMiterlimit="8" />
        <path d="M-0.6,-38 L0.6,-38 L0.6,-9.24 L0,-5.24 L-0.6,-9.24 Z" />
        <rect x="-16" y="15" width="32" height="5" rx="2.5" />
        <rect x="-3" y="20" width="6" height="12" />
        <circle cy="35" r="4.5" />
      </g>
    </svg>
  )
}

/** Two hands locked in an arm-wrestler's grip, as a line drawing: the two kinds of move joined. */
function ReunionGlyph() {
  // Drawn in the left man's frame: x runs up his forearm from the elbow, +y is his little-finger side. We see the back
  // of his hand, with three slits where his fingers start before they turn away behind the grip. The right man's hand
  // is behind it: only his fingers show, coming round the far edge with their tips on the back of the left man's hand,
  // and his thumb, folded over the left man's thumb and lying across his own fingers. His forearm passes behind the
  // left man's. Hidden lines are cut out with masks, leaving a small gap, so nothing needs a fill.
  const id = useId().replace(/:/g, '')
  const frame = 'translate(0 16) rotate(-62)'
  const hand = 'M-60,-7.5 L0,-6 Q3,-7.5 8.2,-11.7 L22,-16.5 Q24.6,-15.3 25.5,-8.7 Q25.1,1 22.7,2 L0,6 L-60,7.5'
  const fingers =
    'M18.5,-13.6 L18.5,-17.8 Q18.5,-20.8 15.5,-20.8 L6,-13.6 Q3,-13.6 3,-10.6 L3,-6.4 ' +
    'A1.94,1.94 0 0 0 6.9,-9.2 A1.94,1.94 0 0 0 10.8,-11 A1.94,1.94 0 0 0 14.6,-12.3 A1.94,1.94 0 0 0 18.5,-13.6 Z'
  const thumb =
    'M22.8,-17.2 Q22.8,-18.4 21.6,-18.4 L20.6,-18.4 A2.13,2.13 0 0 0 20.6,-14.1 L21.6,-14.1 Q22.8,-14.1 22.8,-15.3 Z'
  const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.86, strokeLinejoin: 'round', strokeLinecap: 'round' } as const
  // A mask cut is the shape plus a stroke wide enough to leave a gap round the line in front.
  const cut = { fill: 'black', stroke: 'black', strokeWidth: 4.14, strokeLinejoin: 'round' } as const
  const mask = (name: string, shapes: ReactNode) => (
    <mask id={`${id}-${name}`} maskUnits="userSpaceOnUse" x="-60" y="-60" width="120" height="120">
      <rect x="-60" y="-60" width="120" height="120" fill="white" />
      <g transform={frame}>{shapes}</g>
    </mask>
  )
  return (
    <svg className="glyph" viewBox="-40 -40 80 80" aria-hidden="true">
      <g transform="scale(1.4)">
        {mask(
          'front',
          <g {...cut}>
            <path d={`${hand} Z`} />
            <path d={fingers} />
            <path d={thumb} />
          </g>,
        )}
        {mask(
          'grip',
          <g {...cut}>
            <path d={fingers} />
            <path d={thumb} />
          </g>,
        )}
        {mask('thumb', <path d={thumb} fill="black" />)}
        {/* The right man's forearm, behind everything else. */}
        <g mask={`url(#${id}-front)`}>
          <path d="M-60,-7.5 L8,-6 M8,6 L-60,7.5" transform={`translate(7 0) scale(-1 1) ${frame}`} {...line} />
        </g>
        {/* The left man's arm and the back of his hand, with the slits where his fingers start. */}
        <g mask={`url(#${id}-grip)`}>
          <g transform={frame} {...line}>
            <path d={hand} />
            <path d="M23.4,-8.7 l-3.2,0 M23.4,-4.7 l-3.2,0 M22.4,-0.6 l-3.2,0" />
          </g>
        </g>
        {/* The right man's fingers, and his thumb lying over them. */}
        <g mask={`url(#${id}-thumb)`}>
          <g transform={frame} {...line}>
            <path d={fingers} />
            <path d="M6.9,-13.8 L6.9,-9.6 M10.8,-15.6 L10.8,-11.4 M14.6,-17 L14.6,-12.7" />
          </g>
        </g>
        <path d={thumb} transform={frame} {...line} />
      </g>
    </svg>
  )
}

export default function Home() {
  useTitle('The Shuffle Lab — does your shuffle randomize the deck?')
  const world = useRef<HTMLDivElement>(null)
  const skyStrip = useRef<HTMLDivElement>(null)
  const ridgeStrip = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const stopSky = startBackdropParallax(world.current!, skyStrip.current!, SPEED.sky)
    const stopRidges = startBackdropParallax(world.current!, ridgeStrip.current!, SPEED.ridges)
    return () => {
      stopSky()
      stopRidges()
    }
  }, [])
  return (
    <div className="home">
      <Hero next="routines">
        <h1>The Shuffle Lab</h1>
        <p className="tagline">Your deck remembers the last game.</p>
        <p className="lede">
          Shuffling is supposed to leave a deck in a random order, with no trace of how it was arranged before. It often doesn&rsquo;t. When you pick
          up your cards after a game, the ones you played are in one clump. A quick shuffle can leave some of them side by side for the next game.
        </p>
        <p className="lede">
          This site looks at the usual ways people shuffle by hand and how well each one breaks up that order. A simulation performs each shuffle
          routine and checks the randomness against a battery of tests.
        </p>
        <div className="actions">
          <Link className="btn-gold" to="/simulator">
            Open the simulator
          </Link>
        </div>
      </Hero>

      <main>
        {/* The night goes on below the hero, one stretch of sky and ridges per section, with sparks drifting through
            all of it, down to a campfire on the ground the footer stands on. Each layer moves at its own speed, for parallax: the sky,
            the ridges, three sizes of ember with the campfire among the largest, the sections, and a few large
            embers in front. */}
        <div className="world" ref={world}>
          <div className="world-backdrop" aria-hidden="true">
            {/* Each strip has one panel per section and one for the footer, in their order. */}
            <div className="world-strip" ref={skyStrip}>
              <div className="world-panel">
                <Vista {...VISTAS.routines} layer="sky" fadeTo={VISTAS.moves.palette.sky[0]} />
              </div>
              <div className="world-panel">
                <Vista {...VISTAS.moves} layer="sky" fadeTo={VISTAS.combine.palette.sky[0]} />
              </div>
              <div className="world-panel">
                <Vista {...VISTAS.combine} layer="sky" fadeTo={LAMP_TOP} />
              </div>
              <div className="world-panel">
                <div className="vista lamp" />
              </div>
              <div className="world-panel">
                <div className="vista lamp-foot" />
              </div>
            </div>
            <div className="world-strip" ref={ridgeStrip}>
              <div className="world-panel">
                <Vista {...VISTAS.routines} layer="ridges" />
              </div>
              <div className="world-panel">
                <Vista {...VISTAS.moves} layer="ridges" />
              </div>
              <div className="world-panel">
                <Vista {...VISTAS.combine} layer="ridges" />
              </div>
              {/* The simulator's table and the footer have no ridges of their own; the campfire's ridge is in front. */}
              <div className="world-panel" />
              <div className="world-panel" />
            </div>
          </div>
          <div className="world-embers">
            <Embers count={44} bands={BACK_EMBERS} className="world-embers-canvas" />
          </div>
          <div className="world-embers front">
            <Embers count={5} bands={FRONT_EMBERS} className="world-embers-canvas" />
          </div>
          <section className="realm" id="routines">
            <div className="wrap">
              <h2>Two routines worth learning</h2>
              <div className="rec-grid">
                {RECOMMENDATIONS.map((card) => (
                  <article key={card.name} className="block rec">
                    <div className="block-head">
                      <h3>{card.crown}</h3>
                      <Cost moves={card.moves} />
                    </div>
                    <p className="block-sub">{card.name}</p>
                    <p>{card.blurb}</p>
                    <Link className="card-cta" to="/simulator">
                      Test it in the simulator
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="realm" id="moves">
            <div className="wrap">
              <h2>Three moves, three weaknesses</h2>
              <p className="intro">
                Hand shuffles combine a few basic moves. Each move breaks up some of the old order and leaves its own kind behind. The demos start from a
                sorted deck and apply the move three times. Tap one to run it again.
              </p>
              <div className="move-grid">
                {STEPS.map((step) => (
                  <article key={step.name} className="move" style={{ '--frame': step.color } as CSSProperties}>
                    <div className="demo">
                      <MoveDemo op={step.op} />
                    </div>
                    <div className="move-text">
                      <h3>{step.name}</h3>
                      <p className="how">{step.how}</p>
                      <p className="ability">
                        <span className="mark good" aria-label="Strength">
                          ▲
                        </span>
                        {step.good}
                      </p>
                      <p className="ability">
                        <span className="mark bad" aria-label="Weakness">
                          ▼
                        </span>
                        {step.bad}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="tome">
                <h3>What&rsquo;s left after each repeat</h3>
                <p className="tome-intro">
                  Each line starts from a sorted deck and repeats one move ten times. The readings show how much of its order, proximity and position is left:
                  100% for the sorted deck, 0% for a random one.
                </p>
                <div className="oplegend" aria-hidden="true">
                  {CHART_MOVES.map(({ op, name, color }) => (
                    <span key={op}>
                      <i style={{ background: color }} />
                      {name}
                    </span>
                  ))}
                </div>
                <div className="opsgrid">
                  {CHARTS.map((chart) => (
                    <MoveChart key={chart.reading} {...chart} />
                  ))}
                </div>
                <MoveTable readings={CHARTS} />
              </div>
            </div>
          </section>

          <section className="realm" id="combine">
            <div className="wrap">
              <h2>Chance and force</h2>
              <p className="intro">Why the routines combine moves instead of repeating the best one.</p>
              <div className="duel">
                <div className="side chance">
                  <div className="side-head">
                    <h3>A mash is a gamble</h3>
                    <ChanceGlyph />
                  </div>
                  <p>
                    A mash mixes by chance, and its effect doubles with each repeat. Each mash halves the order left across the whole deck: 0.50 after one, then
                    0.25, 0.12 and 0.06. But no mash is certain to move any particular card. After six mashes of a played deck, the old top card is still in the
                    top five in 9% of games, and the old bottom card is in the bottom five in 10%. A random deck gives 5%.
                  </p>
                </div>
                <div className="versus" aria-hidden="true">
                  and
                </div>
                <div className="side force">
                  <div className="side-head">
                    <h3>A forced move is certain</h3>
                    <ForceGlyph />
                  </div>
                  <p>
                    The half overhand and the pile don&rsquo;t depend on chance. Each does its job in one move, every time. A half overhand buries the top card. In
                    20,000 shuffles of a sorted deck it never stayed in the top five, and in 99 games out of 100 it ended up 31st or deeper. A pile separates every
                    pair of old neighbours. In 20,000 deals, no pair ended up within three places of each other. Neither move mixes, though. The half overhand
                    leaves the other half in its old order, and the pile puts each card in the same place every time.
                  </p>
                </div>
              </div>
              <div className="together">
                <div className="side-head">
                  <h3>Together</h3>
                  <ReunionGlyph />
                </div>
                <p>
                  Combining them covers each move&rsquo;s weakness. Mashes before the forced move mean it works on an order nobody knows, and mashes after it
                  scatter its fixed result. From a played deck, the between-games routine left the old top card in the top five in 5% of games, as often as a
                  random deck. The half overhand doesn&rsquo;t touch the bottom half, so the old bottom card stayed in the bottom five in 15%.
                </p>
                <p>
                  Overhanding both halves fixes that. With 2 mashes, a half overhand of each half and 3 mashes, both end cards stayed near their ends no more
                  often than in a random deck. That routine passed every test in 127 of 200 runs, and seven plain mashes passed in 3.
                </p>
              </div>
            </div>
          </section>

          <section className="realm" id="simulator">
            <div className="wrap">
              <div className="table">
                <div className="table-head">
                  <h2>Test your own routine</h2>
                  <div className="teaser" aria-hidden="true">
                    {TEASER.map((pip, index) => (
                      <span key={index} className={`pip ${PIP_CLASS[pip]}`} style={{ animationDelay: `${index * 0.45}s` }}>
                        {pip}
                      </span>
                    ))}
                  </div>
                </div>
                <p>
                  The simulator lets you build a routine from these moves, run it many times, and see which tests it passes. Where the deck starts changes how
                  much shuffling it needs, so the simulator can start from either of these two decks. The left edge of each strip is the top of the deck, and
                  the colours show each card&rsquo;s original position.
                </p>
                <div className="startdecks">
                  {DATA.startDecks.map((startDeck, index) => (
                    <div key={startDeck.name} className="startdeck">
                      <h3>{startDeck.name}</h3>
                      <div className="deckstrip">
                        {startDeck.fills.map((fill, slot) => (
                          <i key={slot} style={{ background: fill }} />
                        ))}
                      </div>
                      <p>{START_DECK_TEXT[index]}</p>
                    </div>
                  ))}
                </div>
                <Link className="btn-gold big" to="/simulator">
                  Open the simulator
                </Link>
              </div>
            </div>
          </section>

          <footer className="realm coda">
            <Campfire />
            <div className="wrap">
              <nav className="writeups" aria-label="Write-ups">
                <h2>The write-ups</h2>
                <ul>
                  {WRITEUPS.map((writeup) => (
                    <li key={writeup.to}>
                      <Link to={writeup.to}>{writeup.title}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <p className="foot-note">
                We picked these routines because the pile and the half overhand break up order by force, not by chance. A mash and a half overhand cost 1 unit
                each, a full overhand costs 2, and a pile costs 4. The pile&rsquo;s cost is a guess until we time it. We ran each routine 200 times from a sorted
                deck and from a played deck. A run counts as a pass only when it clears every test, and a test passes when the deck is within three standard
                deviations of a random deck. From a played deck, 3 mashes, a half overhand and 2 mashes passed none of 200 runs. Most of what the tests found
                was position: where a card started still hints at where it ends up. Seven plain mashes, one move more, passed 3.
              </p>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}
