import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useTitle } from '../../hooks/useTitle'
import DATA from './data.json'
import { startMoveDemo, type DemoMove } from './moveDemo'
import OpsChart from './OpsChart'
import { OPS_CHARTS } from './opsCharts'
import './home.css'

// The two recommended methods, from a search of every move sequence costing up to 7 units (see the footnote).
const SUMMARY = DATA.cards

/**
 * One step in the chain: a shuffle, the order it leaves behind, and the test
 * that was added to catch it. Steps without a move demo describe a weakness
 * rather than a new move.
 */
interface Step {
  op?: DemoMove
  name: string
  color?: string
  /** what your hands do, in one sentence */
  how?: string
  paragraphs: ReactNode[]
  /** strength after four repetitions, 0–100: ordering, proximity, position */
  bars?: [number, number, number]
}

const STEPS: Step[] = [
  {
    op: 'mash',
    name: 'Mash',
    color: '#1a6b3a',
    how: 'Split the deck in two and let the halves fall together a few cards at a time.',
    paragraphs: [
      'Each half keeps its cards in their original order. After one mash, a sorted deck is two long runs woven together. The number of runs roughly doubles with each mash, so from a sorted deck the run count looks random only after six mashes.',
      <>
        Counting runs was the first test we built. <Link to="/order-tests">Ordering</Link> counts them, and longest chain finds the longest run still in one
        piece.
      </>,
    ],
    bars: [32, 100, 100],
  },
  {
    op: 'overhand',
    name: 'Overhand',
    color: '#c0612a',
    how: 'Hold the deck in one hand and thumb small packets off the top, each one landing on the last.',
    paragraphs: [
      'The overhand breaks up runs quickly, so it passes ordering within a few passes. But the cards inside each packet stay together, so cards that started next to each other stay close. Keep going as long as you like and they never spread out.',
      <>
        We added <Link to="/order-tests">proximity</Link> to catch it. Proximity counts old neighbours that are still within three places of each other.
      </>,
    ],
    bars: [90, 56, 44],
  },
  {
    op: 'ohr',
    name: 'Half overhand, then mash',
    color: '#2f8f7f',
    how: 'Cut the deck, overhand one half, then mash the two halves back together.',
    paragraphs: [
      'Each move fixes what the other leaves behind. The overhand breaks up the runs the mash is slow on, and the mash spreads out the neighbours the overhand leaves together. From a sorted deck, four rounds break up order about as well as six plain mashes.',
      'It still doesn’t beat plain mashing, because order isn’t the last thing to clear. The ends of the deck and the spacing of old neighbours clear last, as the next steps explain. The overhand does little for either. Each round is also two moves instead of one.',
    ],
    bars: [100, 99, 100],
  },
  {
    op: 'pile',
    name: 'Pile',
    color: '#3a5f9e',
    how: 'Deal the cards one at a time into six piles, then stack the piles.',
    paragraphs: [
      'The deal always splits neighbours the same way, and none stay close. A random deck keeps a few close by chance, so the pile fails proximity on the low side.',
      <>
        Worse, dealing isn&rsquo;t random. Anyone who knows the deck before the deal knows it after. We added the{' '}
        <Link to="/global-tests">position</Link> test for the pile. A pile adds nothing random, so it can&rsquo;t fix what other moves leave behind.
      </>,
    ],
    bars: [92, 93, 0],
  },
  {
    name: 'The mash, again',
    paragraphs: [
      'The mash is the only move here whose leftovers shrink the more you repeat it. It has two more weak spots.',
      <>
        The top and bottom few cards barely move. A card you saw on the bottom is often still near the bottom several mashes later.{' '}
        <Link to="/sticky-ends">End retention</Link> catches this, and it is why a sorted deck needs an eighth mash.
      </>,
      <>
        Early mashes also spread old neighbours out more evenly than chance would. A spread that even is as easy to detect as a clump.{' '}
        <Link to="/global-tests">Distinguishability</Link> found it first. That test trains a simple program to tell shuffled decks from random ones.
        Proximity now checks for it too.
      </>,
    ],
  },
  {
    name: 'Mana weaving',
    paragraphs: [
      'Some players space their lands evenly through the deck before shuffling: land, spell, spell, land. A light shuffle can leave that pattern in place, and none of the tests above look at card types.',
      <>
        <Link to="/mana-tests">Land spacing</Link> measures the gaps between lands. Lands spaced too evenly fail it, just as lands in clumps do.
      </>,
    ],
  },
]

const START_DECK_TEXT: ReactNode[] = [
  'Cards sit in the exact order the deck was built, so every kind of structure is at its maximum. This is the hardest case. The shuffle has to break up the order, the neighbours and the positions from scratch. It takes eight mashes to clear every test reliably from here.',
  'This deck had seven mashes, and then its top thirty cards were sorted, as happens when you gather your cards after a game. It looks random at a glance, but the sorted block is real structure. Ordering reads 36 against a random deck’s 50, close pairs 12.3 against 5.9, and the original end cards sit at their ends at five times the random rate.',
  <>
    The lands start at perfectly even intervals, and the rest of the deck is in random order. If a shuffle leaves that pattern in place, the regularity is real structure, and the
    land-spacing test catches it at once. Lands spaced <i>too</i> regularly are as far from random as lands clumped together.
  </>,
  'The lands start in three loose clusters, the way a deck looks after a game in which lands came out in runs, and the rest of the deck is in random order. Shuffling has to break up the clumps, and the land-spacing and clump-rate tests track how quickly it does.',
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
        {SUMMARY.cards.map((card) => (
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
      <div className="sec-eyebrow">Every shuffle leaves a trace</div>
      <p className="opsintro">
        Each way of shuffling leaves its own kind of order behind. We started with one test. Each time a shuffle passed every test we had and still
        wasn&rsquo;t random, we added a test that could see what it left behind. The steps below follow that order.
      </p>
      <div className="chain">
        {STEPS.map((step) => (
          <div key={step.name} className={step.op ? 'def step' : 'def step nodemo'}>
            {step.op && (
              <div className="stepdemo">
                <MoveDemo op={step.op} />
                {step.bars && (
                  <div className="mbars">
                    {(['Ordering', 'Proximity', 'Position'] as const).map((label, index) => (
                      <div key={label} className="mbar">
                        <div className="mbl">
                          <span>{label}</span>
                          <span>{step.bars![index]}</span>
                        </div>
                        <div className="mtrack">
                          <div className="mfill" style={{ width: `${step.bars![index]}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div>
              <div className="dn">
                {step.color && <i style={{ background: step.color }} />}
                {step.name}
              </div>
              <div className="dd">
                {step.how && <p className="how">{step.how}</p>}
                {step.paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="opsintro" style={{ marginTop: '0.9rem', marginBottom: 0 }}>
        The bars show how close four repeats of each move get to a random deck on three of the tests. A full bar means random.
      </p>

      <div className="rule" />
      <div className="sec-eyebrow">Why the answer is mashing</div>
      <p className="opsintro">
        Every other move leaves something that more of the same move won&rsquo;t fix. More overhands never separate neighbours, and another pile deal is
        just as predictable as the first. What the mash leaves behind shrinks each time, and the ends of the deck are the last to go. That’s why both
        recommendations are plain mashing, and why the number depends on where the deck starts.
      </p>
      <p className="opsintro">
        The charts below show the same story in numbers. Each one repeats a single move on a sorted deck and follows one test. The value for a random
        deck is given under each title.
      </p>
      <div className="opsgrid">
        {OPS_CHARTS.map((cfg) => (
          <OpsChart key={cfg.key} cfg={cfg} />
        ))}
      </div>

      <div className="rule" />
      <div className="sec-eyebrow">Try your own routine</div>
      <p className="opsintro">
        The <Link to="/simulator">simulator</Link> lets you build a routine from these moves, run it many times, and see which tests it passes. Where
        the deck starts changes how much shuffling it needs, so the simulator can start from any of these four decks. The left edge of each strip is the
        top of the deck. The first two strips are coloured by original position, and the other two by card type:{' '}
        <span style={{ color: '#2e7d4f', fontWeight: 600 }}>lands</span> against spells.
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
        We chose the recommendations by scoring every routine that costs up to 7 units, starting from a played deck. A mash and a half overhand cost 1
        unit each, a full overhand costs 2, and a pile costs 4. The pile&rsquo;s cost is a guess until we time it. We then ran the leaders 20 times from
        each of the four starting decks. A run counts as a pass only when it clears every test. Seven mashes passed all 20 runs from a played deck, and eight
        passed 18 to 20 of 20 from each starting deck. No six-unit routine was reliable: the best mixes passed 16 of 20, and six plain mashes passed 18. The
        pile routine we used to recommend (4 mashes, pile, 4 mashes) costs 12 units and passed only 1 of 5 runs from a sorted
        deck. Pass thresholds sit two
        standard deviations from random decks: ordering ≥ {SUMMARY.thr.seq} runs, proximity ≤ {SUMMARY.thr.cp} close pairs. Random baselines: ordering{' '}
        {SUMMARY.rand.seq}, proximity {SUMMARY.rand.cp}. Figures in the steps above come from 1,200 simulated decks per routine.
      </p>
    </div>
  )
}
