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
const V = DATA.variants as Record<VariantKey, Variant>
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
function clears(v: VariantKey, k: MetricKey): number | null {
  const t = THR[k]
  const arr = V[v][k]
  for (let i = 0; i < arr.length; i++) {
    const val = arr[i]
    const ok = t.side === 'low' ? val <= t.thr : t.side === 'high' ? val >= t.thr : Math.abs(val - t.mean) <= t.thr
    if (ok) return i + 1
  }
  return null
}

/** Passes to clear ordering, proximity and position together. */
function coreClears(v: VariantKey): number | null {
  const c = (['ordering', 'proximity', 'position'] as const).map((k) => clears(v, k))
  return c.every((x) => x !== null) ? Math.max(...(c as number[])) : null
}

/** Average mobility of the two end buckets after `pass` passes. */
function edgeMobility(v: VariantKey, pass: number): number {
  const m = V[v].mob[pass - 1]
  return (m[0] + m[m.length - 1]) / 2
}

// This page shades its strips a little darker at the top than the simulator does.
function stripColor(id: number, n: number) {
  const t = id / (n - 1)
  return `hsl(${(150 + (t - 0.5) * 30).toFixed(0)},42%,${(24 + t * 56).toFixed(0)}%)`
}

function Strip({ deck }: { deck: Deck }) {
  return (
    <div className="strip">
      {deck.map((v, i) => (
        <i key={i} style={{ background: stripColor(v, deck.length) }} />
      ))}
    </div>
  )
}

const deal = () => {
  const base = sortedDeck(DATA.N)
  return { plain: mash(base), off: offCentreRiffle(base, 10) }
}

function MetricChart({ k, shown }: { k: MetricKey; shown: VariantKey[] }) {
  const log = k === 'position'
  const tr = (x: number) => (log ? Math.log10(x) : x)
  let ymin = Infinity
  let ymax = -Infinity
  shown.forEach((v) =>
    V[v][k].forEach((x) => {
      ymin = Math.min(ymin, tr(x))
      ymax = Math.max(ymax, tr(x))
    }),
  )
  const t = THR[k]
  const hl = []
  if (t.side === 'two') {
    hl.push({ y: t.mean - t.thr, label: 'band' }, { y: t.mean + t.thr })
    ymin = Math.min(ymin, t.mean - t.thr)
    ymax = Math.max(ymax, t.mean + t.thr)
  } else {
    hl.push({ y: tr(t.thr), label: 'pass' })
    ymin = Math.min(ymin, tr(t.thr))
    ymax = Math.max(ymax, tr(t.thr))
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
      hlines={hl}
      series={shown.map((v) => ({ key: v, color: META[v].color, pts: V[v][k].map((y, i) => [i + 1, tr(y)] as [number, number]) }))}
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
  const shown = ORDER.filter((v) => show[v])
  const em = (v: VariantKey) => `${Math.round(edgeMobility(v, 1) * 100)}%`

  return (
    <Writeup title="The sticky ends" subtitle="Off-centre riffles on 99 cards: what an offset merge buys against sticky ends, and what it costs." backLink={false}>
      <div className="verdict">
        A riffle shuffle mixes the middle of a deck far faster than its ends. In the model used here — packet sizes fitted to a real hand — the outermost
        cards move at about {em('mash')} of the pace full randomization would give them after one pass, and the practical consequence is sharper than that
        number sounds: a card you know to be on the bottom is still findable at three times the random rate after five passes, by which point every
        aggregate diagnostic in this project already reads clean. This page tests a correction: riffles whose merge point is deliberately off centre, so
        that the sticky ends are forced into the interleave, with the offset swept from 5 to 20 cards in steps of five. The offsets do fix the ends, roughly
        in proportion to their size, but they slow overall mixing — and six or more plain passes dissolve the problem on their own. The offset earns its
        place below that budget, where most real shuffling happens: alternating one off-centre pass with one plain pass removes the end-card exploit
        immediately and costs a single extra pass on the core diagnostics ({coreClears('hybrid')} versus {coreClears('mash')}). A purpose-built
        end-retention diagnostic makes the gap visible: plain riffling fails it until pass eight, the alternating schedule clears it by four.
      </div>

      <h2>The move</h2>
      <p>
        Cut as normal, then let the two halves merge off centre by <b>g</b> cards. The interleave now misses the inner face of each half: the first g cards
        to fall are the solid block from just below the cut, and the last g are the block from just above it. Both new ends are therefore middle cards,
        delivered in order, while everything else — including both original end cards — lands inside the interleave. One pass looks like this, with every
        card coloured by where it started:
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
        The chart shows how far cards actually travel, grouped by where they start. Each point averages five neighbouring starting positions, expressed as a
        share of the movement full randomization would produce — 1.0 means those cards move as though the deck were genuinely being randomized. A plain
        riffle traces a deep U: the middle travels freely while the ends barely move. The offsets lift the two arms of the U roughly in proportion to g.
      </p>

      <div className="card">
        <div className="klabel">
          share of random-expected movement, by starting position (groups of 5){' '}
          <span className="seg">
            {[1, 3, 6].map((p) => (
              <button key={p} type="button" className={mobPass === p ? 'on' : ''} onClick={() => setMobPass(p)}>
                after {p}
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
          series={shown.map((v) => ({ key: v, color: META[v].color, pts: V[v].mob[mobPass - 1].map((y, i) => [i, y] as [number, number]) }))}
        />
        <div className="legend">
          {ORDER.map((v) => (
            <span
              key={v}
              className={`lchip${show[v] ? ' on' : ''}`}
              style={{ borderColor: META[v].color, color: META[v].color }}
              onClick={() => setShow((s) => ({ ...s, [v]: !s[v] }))}
            >
              {META[v].name}
            </span>
          ))}
        </div>
      </div>

      <h2>What it buys, what it costs</h2>
      <p>
        The cost of the offset is that every pass leaves 2g cards in two pristine, ordered blocks, and the diagnostics that look for surviving runs register
        it immediately. Even position bias only improves up to a point: always delivering middle cards to the ends is itself a positional signature, and at
        larger offsets it starts to show.
      </p>

      <div className="chartrow">
        <div className="card">
          <div className="klabel">Ordering — descents (random ≈ 50, band shaded)</div>
          <MetricChart k="ordering" shown={shown} />
        </div>
        <div className="card">
          <div className="klabel">Proximity — close pairs (pass ≤ threshold, dashed)</div>
          <MetricChart k="proximity" shown={shown} />
        </div>
        <div className="card">
          <div className="klabel">Longest chain (pass ≤ threshold, dashed)</div>
          <MetricChart k="chain" shown={shown} />
        </div>
        <div className="card">
          <div className="klabel">Position χ², log scale (pass ≤ threshold, dashed)</div>
          <MetricChart k="position" shown={shown} />
        </div>
        <div className="card">
          <div className="klabel">End retention — original end cards still home (random 0.08; band = ±3 SE, dashed)</div>
          <MetricChart k="endret" shown={shown} />
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
              {ORDER.map((v) => {
                const core = coreClears(v)
                return (
                  <tr key={v} className={v === 'hybrid' ? 'hl' : undefined}>
                    <td>
                      <span style={{ color: META[v].color }}>■</span> {META[v].name}
                    </td>
                    <td>{em(v)}</td>
                    {(['ordering', 'proximity', 'position', 'chain', 'endret'] as const).map((k) => (
                      <td key={k}>{clears(v, k) ?? '>12'}</td>
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
        One failure does slip past the aggregate diagnostics. Position χ² spreads its evidence across all 9,801 card–position pairs, but the exploit that
        matters at a table is a single cell — the card you know is on the bottom, still being on the bottom. Measured directly, a plain riffle leaves that
        card findable at <b>three times</b> the random rate after five passes, the same depth at which χ² clears.
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
          guarantee the card is not at the end. That is weak information of its own kind, and it fades to random by eight passes.
        </p>
      </div>

      <p>
        To make this failure count against a method, the page adds a diagnostic built for it. <b>End retention</b> is the expected number of original end
        cards still within three positions of their end — 0.08 for a random deck. Because the exploit is a rare-event rate rather than per-deck structure,
        it is judged on the trial-averaged rate, within three standard errors of random and two-sided, since reliably <i>missing</i> from the ends is a
        signature as well. Plain riffling fails it until pass eight, three passes after the rest of the suite has gone quiet. The offsets briefly fail low
        while the eviction is still guaranteed — and the larger ones echo a card back to the ends around pass three — before clearing between three and
        six; the alternating schedule clears from pass four.
      </p>

      <p>
        The two failure modes complement each other, which is why alternating works: the off-centre pass frees the ends but leaves tails, and the plain
        pass shreds the tails but re-pins the ends. Run in alternation, each pass cleans up after the other.
      </p>

      <p className="foot">
        Model: gaussian cut (σ = 7% of deck); packet sizes fitted to a hand-measured mash (of the first twenty packets, roughly 80% were single cards, four
        were pairs, one a triple; max 4 → weights 80 / 15 / 4 / 1). Halves strictly alternate, and each drop is scaled by that side&rsquo;s share of the
        cards still held (with stochastic rounding), so the thicker half releases faster and the two deplete together — the spatial feedback a real hand
        applies. This keeps the accidental solid block at the back of a pass to ≈3 cards on average (the older chunky-packet model without feedback
        averaged 13). The off-centre variant leads with the lower half&rsquo;s top g cards and trails with the upper half&rsquo;s bottom g, so both solid
        tails come from the middle of the deck. Mobility = mean |displacement| of a starting position divided by its expectation under a uniformly random
        permutation (position-dependent: end cards are <i>expected</i> to travel further than middle cards when fully mixed). {DATA.T} trials per method,
        measured at every depth to {DEPTH} passes on {DATA.N} cards; positions bucketed in groups of five. End retention counts the original top card
        within three of the top plus the original bottom card within three of the bottom; random mean 0.081. Unlike the other diagnostics, whose
        thresholds scale with per-deck spread, it is judged on the trial-averaged rate — within three standard errors of random at 300 trials, band
        0.03–0.13, two-sided — because a per-deck threshold cannot detect a shifted probability of a rare event. The end-card table measures, over 6,000
        trials, whether the original top card sits within 3 of the top or the original bottom card within 3 of the bottom (window of four positions each;
        random = 4/99). Thresholds come from this run&rsquo;s own random-deck calibration and differ fractionally from the main page&rsquo;s (clearing
        depths here may read one pass earlier or later).
      </p>
    </Writeup>
  )
}
