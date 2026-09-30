import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useTitle } from '../../hooks/useTitle'
import DATA from './data.json'
import MoveChart, { MoveTable } from './MoveChart'
import { CHART_MOVES, MOVE_COLOR, type Reading } from './moveCharts'
import { startMoveDemo, type DemoMove } from './moveDemo'
import { RECOMMENDATIONS } from './recommendations'
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
  useTitle('The Shuffle Lab — does your shuffle randomize the deck?')
  return (
    <div className="home">
      <div className="eyebrow">Does your shuffle actually randomize the deck?</div>
      <h1>
        The Shuffle <em>Lab</em>
      </h1>
      <p className="lede">
        Shuffling is supposed to leave a deck in a random order, with no trace of how it was arranged before. It often doesn&rsquo;t. When you pick up
        your cards after a game, the ones you played are in one clump. A quick shuffle can leave some of them side by side for the next
        game. This site looks at the usual ways people shuffle by hand and how well each one breaks up that order. A simulation performs each shuffle routine and checks the randomness against a battery of tests. Below are
        the routines we recommend, the order each kind of shuffle leaves behind, and a simulator for testing your own routine.
      </p>

      <div className="rule double" />

      <div className="sec-eyebrow">What we recommend</div>
      <div className="cards">
        {RECOMMENDATIONS.map((card) => (
          <div key={card.name} className="mcard">
            <div className="top">
              <div>
                <div className="crown">{card.crown}</div>
                <h3>{card.name}</h3>
              </div>
            </div>
            {card.when && (
              <div className="when">
                <b>Use on:</b> {card.when}
              </div>
            )}
            <p>{card.blurb}</p>
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
      <p className="opsintro">
        Each move starts from a sorted deck. The readings show how much of its order, proximity and position is left: 100% for the sorted deck, 0% for
        a random one.
      </p>
      <div className="chain">
        {STEPS.map((step) => (
          <div key={step.name} className="def step">
            <div className="stepdemo">
              <MoveDemo op={step.op} />
            </div>
            <div>
              <div className="dn">
                <i style={{ background: step.color }} />
                {step.name}
              </div>
              <div className="dd">
                <p className="how">{step.how}</p>
                <p>{step.good}</p>
                <p>{step.bad}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
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

      <div className="rule" />
      <div className="sec-eyebrow">Why we combine moves</div>
      <p className="opsintro">
        A mash mixes by chance, and its effect doubles with each repeat. Each mash halves the order left across the whole deck: 0.50 after one, then
        0.25, 0.12 and 0.06. But no mash is certain to move any particular card. After six mashes of a played deck, the old top card is still in the top
        five in 9% of games, and the old bottom card is in the bottom five in 10%. A random deck gives 5%.
      </p>
      <p className="opsintro">
        The half overhand and the pile don&rsquo;t depend on chance. Each does its job in one move, every time. A half overhand buries the top card. In
        20,000 shuffles of a sorted deck it never stayed in the top five, and in 99 games out of 100 it ended up 31st or deeper. A pile separates every
        pair of old neighbours. In 20,000 deals, no pair ended up within three places of each other. Neither move mixes, though. The half overhand leaves
        the other half in its old order, and the pile puts each card in the same place every time.
      </p>
      <p className="opsintro">
        Combining them covers each move&rsquo;s weakness. Mashes before the forced move mean it works on an order nobody knows, and mashes after it
        scatter its fixed result. From a played deck, 2 mashes, a half overhand of each half and 3 mashes left the top and bottom cards near their ends
        no more often than a random deck does. That routine passed every test in 127 of 200 runs, and seven plain mashes passed in 3.
      </p>

      <div className="rule" />
      <div className="sec-eyebrow">Try your own routine</div>
      <p className="opsintro">
        The <Link to="/simulator">simulator</Link> lets you build a routine from these moves, run it many times, and see which tests it passes. Where
        the deck starts changes how much shuffling it needs, so the simulator can start from either of these two decks. The left edge of each strip is the
        top of the deck, and the colours show each card&rsquo;s original position.
      </p>
      <div className="defs startdefs">
        {DATA.startDecks.map((startDeck, index) => (
          <div key={startDeck.name} className="def">
            <div className="dn">{startDeck.name}</div>
            <div className="deckstrip">
              {startDeck.fills.map((fill, slot) => (
                <i key={slot} style={{ background: fill }} />
              ))}
            </div>
            <div className="dd">
              <p>{START_DECK_TEXT[index]}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="foot-note">
        We picked these routines because the pile and the half overhand break up order by force, not by chance. A mash and a half overhand cost 1 unit
        each, a full overhand costs 2, and a pile costs 4. The pile&rsquo;s cost is a guess until we time it. We ran each routine 200 times from a sorted
        deck and from a played deck. A run counts as a pass only when it clears every test, and a test passes when the deck is within three standard
        deviations of a random deck. From a played deck, 3 mashes, a half overhand and 2 mashes passed none of 200 runs. Most of what the tests found was
        position: where a card started still hints at where it ends up. Seven plain mashes, one move more, passed 3.
      </p>
    </div>
  )
}
