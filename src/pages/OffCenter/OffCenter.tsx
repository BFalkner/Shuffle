import { useState } from 'react'
import { sortedDeck } from '../../engine/decks'
import { mash, offCentreRiffle, type Deck } from '../../engine/moves'
import Writeup from '../writeups/Writeup'
import DATA from './data.json'
import LineChart from './LineChart'
import './offcenter.css'

// Precomputed results: 300 trials per method, every depth to 12 passes, 99 cards.
type VariantKey = 'mash' | 'off5' | 'off10' | 'off15' | 'off20' | 'hybrid'
type MetricKey = 'ordering' | 'proximity' | 'chain' | 'position' | 'endret'
interface Variant extends Record<MetricKey, number[]> {
  mob: number[][]
}
const VARIANTS = DATA.variants as Record<VariantKey, Variant>
const THR = DATA.thr as Record<MetricKey, { thr: number; mean: number; side: string }>
const DEPTH = DATA.depth

const META: Record<VariantKey, { name: string; color: string }> = {
  mash: { name: 'plain riffle (g = 0)', color: '#8fb3d6' },
  off5: { name: 'off-centre 5', color: '#5f92c4' },
  off10: { name: 'off-centre 10', color: '#3a6fae' },
  off15: { name: 'off-centre 15', color: '#245493' },
  off20: { name: 'off-centre 20', color: '#123a72' },
  hybrid: { name: 'alternating (10 / plain)', color: '#c0612a' },
}
const ORDER: VariantKey[] = ['mash', 'off5', 'off10', 'off15', 'off20', 'hybrid']

/** First pass (1-based) at which a variant clears a diagnostic, or null within the budget. */
function clears(variant: VariantKey, key: MetricKey): number | null {
  const rule = THR[key]
  const arr = VARIANTS[variant][key]
  for (let pass = 0; pass < arr.length; pass++) {
    const val = arr[pass]
    const passed = rule.side === 'low' ? val <= rule.thr : rule.side === 'high' ? val >= rule.thr : Math.abs(val - rule.mean) <= rule.thr
    if (passed) return pass + 1
  }
  return null
}

/** Passes to clear ordering, proximity and position together. */
function coreClears(variant: VariantKey): number | null {
  const results = (['ordering', 'proximity', 'position'] as const).map((key) => clears(variant, key))
  return results.every((x) => x !== null) ? Math.max(...(results as number[])) : null
}

/** Average mobility of the two end buckets after `pass` passes. */
function edgeMobility(variant: VariantKey, pass: number): number {
  const mobility = VARIANTS[variant].mob[pass - 1]
  return (mobility[0] + mobility[mobility.length - 1]) / 2
}

// This page shades its strips a little darker at the top than the simulator does.
function stripColor(id: number, deckSize: number) {
  const depth = id / (deckSize - 1)
  return `hsl(${(150 + (depth - 0.5) * 30).toFixed(0)},42%,${(24 + depth * 56).toFixed(0)}%)`
}

function Strip({ deck }: { deck: Deck }) {
  return (
    <div className="strip">
      {deck.map((card, index) => (
        <i key={index} style={{ background: stripColor(card, deck.length) }} />
      ))}
    </div>
  )
}

const deal = () => {
  const base = sortedDeck(DATA.N)
  return { plain: mash(base), off: offCentreRiffle(base, 10) }
}

function MetricChart({ metricKey, shown }: { metricKey: MetricKey; shown: VariantKey[] }) {
  const log = metricKey === 'position'
  const transform = (x: number) => (log ? Math.log10(x) : x)
  let ymin = Infinity
  let ymax = -Infinity
  shown.forEach((variant) =>
    VARIANTS[variant][metricKey].forEach((x) => {
      ymin = Math.min(ymin, transform(x))
      ymax = Math.max(ymax, transform(x))
    }),
  )
  const rule = THR[metricKey]
  const guides = []
  if (rule.side === 'two') {
    guides.push({ y: rule.mean - rule.thr, label: 'band' }, { y: rule.mean + rule.thr })
    ymin = Math.min(ymin, rule.mean - rule.thr)
    ymax = Math.max(ymax, rule.mean + rule.thr)
  } else {
    guides.push({ y: transform(rule.thr), label: 'pass' })
    ymin = Math.min(ymin, transform(rule.thr))
    ymax = Math.max(ymax, transform(rule.thr))
  }
  const pad = (ymax - ymin) * 0.06
  ymin -= pad
  ymax += pad
  return (
    <LineChart
      height={180}
      xmin={1}
      xmax={DEPTH}
      ymin={ymin}
      ymax={ymax}
      hlines={guides}
      series={shown.map((variant) => ({ key: variant, color: META[variant].color, pts: VARIANTS[variant][metricKey].map((y, index) => [index + 1, transform(y)] as [number, number]) }))}
      ytop={log ? `10^${ymax.toFixed(1)}` : Math.round(ymax)}
      ybot={log ? `10^${ymin.toFixed(1)}` : Math.round(ymin)}
      xlabL="1 pass"
      xlabR={`${DEPTH} passes`}
    />
  )
}

export default function OffCenter() {
  const [strips, setStrips] = useState(deal)
  const [show, setShow] = useState<Record<VariantKey, boolean>>({ mash: true, off5: false, off10: true, off15: false, off20: true, hybrid: true })
  const [mobPass, setMobPass] = useState(1)
  const shown = ORDER.filter((variant) => show[variant])
  const edgeLabel = (variant: VariantKey) => `${Math.round(edgeMobility(variant, 1) * 100)}%`

  return (
    <Writeup title="The sticky ends" subtitle="Off-centre riffles on 99 cards: what an offset merge gains against sticky ends, and what it costs." backLink={false}>
      <div className="verdict">
        A riffle mixes the middle of a deck far faster than its ends. In the model used here, with packet sizes fitted to a real hand, the outermost cards
        move at about {edgeLabel('mash')} of the pace full randomization would give them after one pass. The practical consequence is worse than that number
        suggests: a card you know is on the bottom is still findable at three times the random rate after five passes, by which point every aggregate
        diagnostic in this project already reads clean. This page tests a correction: riffles whose merge point is deliberately off centre, so the ends are
        forced into the interleave, with the offset swept from 5 to 20 cards in steps of five. The offsets do fix the ends, roughly in proportion to their
        size, but they slow overall mixing, and six or more plain passes fix the ends on their own anyway. The offset is worth using below that budget,
        where most real shuffling happens. Alternating one off-centre pass with one plain pass removes the end-card exploit immediately and costs one extra
        pass on the core diagnostics ({coreClears('hybrid')} versus {coreClears('mash')}). A diagnostic built for this, end retention, shows the gap:
        plain riffling fails it until pass eight, and the alternating schedule clears it by pass four.
      </div>

      <h2>The move</h2>
      <p>
        Cut as normal, then let the two halves merge off centre by <i>g</i> cards. The interleave now skips the inner face of each half: the first g cards
        to fall are the solid block from just below the cut, and the last g are the block from just above it. Both new ends are therefore middle cards,
        delivered in order, while everything else, including both original end cards, lands inside the interleave. One pass looks like this, with every card
        coloured by where it started:
      </p>

      <div className="card">
        <div className="klabel">One pass, coloured by where each card started (dark = near the front, light = near the back)</div>
        <div className="striplbl">
          <span>plain riffle</span>
          <span>ends barely move</span>
        </div>
        <Strip deck={strips.plain} />
        <div className="striplbl">
          <span>off-centre, g = 10</span>
          <span>middle blocks at the ends; old ends inside the mix</span>
        </div>
        <Strip deck={strips.off} />
        <button className="dealbtn" type="button" onClick={() => setStrips(deal())}>
          deal again
        </button>
      </div>

      <h2>Mobility by starting position</h2>
      <p>
        The chart shows how far cards actually travel, grouped by where they start. Each point averages five neighbouring starting positions and is
        expressed as a share of the movement full randomization would produce, so 1.0 means those cards move as though the deck were genuinely being
        randomized. A plain riffle traces a deep U: the middle travels freely while the ends barely move. The offsets lift both arms of the U roughly in
        proportion to g.
      </p>

      <div className="card">
        <div className="klabel">
          share of random-expected movement, by starting position (groups of 5){' '}
          <span className="seg">
            {[1, 3, 6].map((pass) => (
              <button key={pass} type="button" className={mobPass === pass ? 'on' : ''} onClick={() => setMobPass(pass)}>
                after {pass}
              </button>
            ))}
          </span>
        </div>
        <LineChart
          height={220}
          xmin={0}
          xmax={DATA.buckets.length - 1}
          ymin={0}
          ymax={1.15}
          hlines={[{ y: 1, label: 'moves like random' }]}
          ytop="1.0"
          ybot="0"
          xlabL="front of deck"
          xlabR="back of deck"
          series={shown.map((variant) => ({ key: variant, color: META[variant].color, pts: VARIANTS[variant].mob[mobPass - 1].map((y, position) => [position, y] as [number, number]) }))}
        />
        <div className="legend">
          {ORDER.map((variant) => (
            <span
              key={variant}
              className={`lchip${show[variant] ? ' on' : ''}`}
              style={{ borderColor: META[variant].color, color: META[variant].color }}
              onClick={() => setShow((current) => ({ ...current, [variant]: !current[variant] }))}
            >
              {META[variant].name}
            </span>
          ))}
        </div>
      </div>

      <h2>What it buys, what it costs</h2>
      <p>
        The cost of the offset is that every pass leaves 2g cards in two untouched, ordered blocks, and the diagnostics that look for surviving runs register
        them immediately. Position bias also improves only up to a point: always delivering middle cards to the ends is itself a positional signature, and
        at larger offsets it starts to show.
      </p>

      <div className="chartrow">
        <div className="card">
          <div className="klabel">Ordering — descents (random ≈ 50, band shaded)</div>
          <MetricChart metricKey="ordering" shown={shown} />
        </div>
        <div className="card">
          <div className="klabel">Proximity — close pairs (pass ≤ threshold, dashed)</div>
          <MetricChart metricKey="proximity" shown={shown} />
        </div>
        <div className="card">
          <div className="klabel">Longest chain (pass ≤ threshold, dashed)</div>
          <MetricChart metricKey="chain" shown={shown} />
        </div>
        <div className="card">
          <div className="klabel">Position χ², log scale (pass ≤ threshold, dashed)</div>
          <MetricChart metricKey="position" shown={shown} />
        </div>
        <div className="card">
          <div className="klabel">End retention — original end cards still home (random 0.08; band = ±3 SE, dashed)</div>
          <MetricChart metricKey="endret" shown={shown} />
        </div>
      </div>

      <div className="card">
        <div className="klabel">
          Passes needed to clear each diagnostic (12-pass budget; every pass is one riffle — the alternating row simply switches type each pass)
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>method</th>
                <th>edge mobility, 1 pass</th>
                <th>ordering</th>
                <th>proximity</th>
                <th>position</th>
                <th>chain</th>
                <th>end retention</th>
                <th>core three</th>
              </tr>
            </thead>
            <tbody>
              {ORDER.map((variant) => {
                const core = coreClears(variant)
                return (
                  <tr key={variant} className={variant === 'hybrid' ? 'hl' : undefined}>
                    <td>
                      <span style={{ color: META[variant].color }}>■</span> {META[variant].name}
                    </td>
                    <td>{edgeLabel(variant)}</td>
                    {(['ordering', 'proximity', 'position', 'chain', 'endret'] as const).map((key) => (
                      <td key={key}>{clears(variant, key) ?? '>12'}</td>
                    ))}
                    <td>
                      <b>{core ?? '>12'}</b>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <h2>The exploit the diagnostics miss</h2>
      <p>
        One failure does get past the aggregate diagnostics. Position χ² spreads its evidence across all 9,801 card–position pairs, but the exploit that
        matters at a table is a single cell: the card you know is on the bottom, still on the bottom. Measured directly, a plain riffle leaves that card
        findable at three times the random rate after five passes, the same depth at which χ² clears.
      </p>

      <div className="card">
        <div className="klabel">P(original end card still within 3 of its end) — random = 4.0%</div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>method</th>
                <th>3 passes</th>
                <th>5 passes</th>
                <th>6 passes</th>
                <th>8 passes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span style={{ color: '#8fb3d6' }}>■</span> plain riffle
                </td>
                <td>42.0%</td>
                <td>12.3%</td>
                <td>7.6%</td>
                <td>5.0%</td>
              </tr>
              <tr className="hl">
                <td>
                  <span style={{ color: '#c0612a' }}>■</span> alternating (10 / plain)
                </td>
                <td>0.5%</td>
                <td>2.3%</td>
                <td>3.5%</td>
                <td>4.0%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="small" style={{ marginTop: '0.5rem' }}>
          The alternating schedule&rsquo;s 0.5% after three passes is actually <i>below</i> the random rate: early on, the eviction is reliable enough to
          guarantee the card is not at the end. That is a weak signal of its own kind, and it fades to random by eight passes.
        </p>
      </div>

      <p>
        To make this failure count against a method, the page adds a diagnostic built for it. <b>End retention</b> is the expected number of original end
        cards still within three positions of their end: 0.08 for a random deck. Because the exploit is a rare-event rate rather than per-deck structure, it
        is judged on the trial-averaged rate, within three standard errors of random. It is two-sided, since reliably <i>missing</i> from the ends is a
        signature too. Plain riffling fails it until pass eight, three passes after the rest of the battery has gone quiet. The offsets briefly fail low
        while the eviction is still guaranteed, and the larger ones send a card back to the ends around pass three, before clearing between passes three and
        six. The alternating schedule clears from pass four.
      </p>

      <p>
        The two failure modes complement each other, which is why alternating works. The off-centre pass frees the ends but leaves ordered blocks behind;
        the plain pass breaks up those blocks but pins the ends again. In alternation, each pass cleans up after the other.
      </p>

      <p className="foot">
        Model: gaussian cut (σ = 7% of the deck). Packet sizes are fitted to a hand-measured mash: of the first twenty packets, roughly 80% were single
        cards, four were pairs and one was a triple, with a maximum of 4, giving weights of 80 / 15 / 4 / 1. The halves strictly alternate, and each drop is
        scaled by that half&rsquo;s share of the cards still held (with stochastic rounding), so the thicker half releases faster and the two run out
        together, the same feedback a real hand applies. This keeps the accidental solid block at the back of a pass to about 3 cards on average; the older
        model, with chunkier packets and no feedback, averaged 13. The off-centre variant leads with the lower half&rsquo;s top g cards and ends with the
        upper half&rsquo;s bottom g, so both solid blocks come from the middle of the deck. Mobility is the mean absolute displacement of a starting
        position divided by its expected value under a uniformly random permutation. That expectation depends on position: when fully mixed, end cards are{' '}
        <i>expected</i> to travel further than middle cards. {DATA.T} trials per method, measured at every depth to {DEPTH} passes on {DATA.N} cards, with
        positions grouped in fives. End retention counts the original top card within three of the top plus the original bottom card within three of the
        bottom; the random mean is 0.081. Unlike the other diagnostics, whose thresholds scale with per-deck spread, it is judged on the trial-averaged rate
        (within three standard errors of random at 300 trials, a band of 0.03–0.13, two-sided), because a per-deck threshold cannot detect a shift in the
        probability of a rare event. The end-card table measures, over 6,000 trials, whether the original top card sits within 3 of the top or the original
        bottom card within 3 of the bottom (a window of four positions each; random = 4/99). Thresholds come from this run&rsquo;s own random-deck
        calibration and differ slightly from the simulator&rsquo;s, so clearing depths here may read one pass earlier or later.
      </p>
    </Writeup>
  )
}
