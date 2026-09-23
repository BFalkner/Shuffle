import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { DECK_KINDS, DECK_SIZES, colorFor, startDeck, type DeckKind } from '../../engine/decks'
import { defaultExperiments, loadExperiments, saveExperiments, uid, type Experiment } from '../../engine/experiments'
import type { MetricKey } from '../../engine/metrics'
import type { OpKey } from '../../engine/moves'
import { emptySlots, type TrackSlots } from '../../engine/tracking'
import { useAnimationSetting } from '../../hooks/useAnimationSetting'
import { useTitle } from '../../hooks/useTitle'
import DiagnosticGrid from './DiagnosticGrid'
import HeadToHead from './HeadToHead'
import MethodBuilder from './MethodBuilder'
import MethodList from './MethodList'
import MethodPanel from './MethodPanel'
import SummaryPanel from './SummaryPanel'
import { SERIES_COLORS, type Series } from './types'
import { useMethodResults } from './useMethodResults'
import './simulator.css'

export default function Simulator() {
  useTitle('Shuffle Simulator — explore the data')
  const anim = useAnimationSetting()

  // Deck condition
  const [kind, setKind] = useState<DeckKind>('sorted')
  const [n, setN] = useState(99)
  // One fixed starting deck per condition, shared by every animation panel and the builder.
  const start = useMemo(() => startDeck(kind, n), [kind, n])

  // Saved methods
  const [experiments, setExperiments] = useState<Experiment[]>(loadExperiments)
  useEffect(() => saveExperiments(experiments), [experiments])

  // Which methods are overlaid on the charts (in order: the first sets the summary and colours).
  const [overlaid, setOverlaid] = useState<string[]>(() => experiments.slice(0, 2).map((e) => e.id))
  const [metric, setMetric] = useState<MetricKey | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [tracked, setTracked] = useState<TrackSlots>(emptySlots)
  const [builder, setBuilder] = useState<{ editId: string | null } | null>(null)
  const returnY = useRef(0)

  const { results, pending } = useMethodResults(experiments, kind, n, overlaid)

  const colors = new Map<string, string>()
  const series: Series[] = []
  overlaid
    .filter((id) => experiments.some((e) => e.id === id))
    .forEach((id, i) => {
      const color = SERIES_COLORS[i % SERIES_COLORS.length]
      colors.set(id, color)
      const r = results.get(id)
      if (r) series.push({ ...r, id, name: experiments.find((e) => e.id === id)!.title, color })
    })

  const toggleOverlay = (id: string) => setOverlaid((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]))
  const openExp = openId ? experiments.find((e) => e.id === openId) : undefined
  const chartStep = openExp ? step : null

  const openBuilder = (editId: string | null) => {
    returnY.current = window.scrollY
    window.scrollTo({ top: 0 })
    setBuilder({ editId })
  }
  const closeBuilder = () => {
    setBuilder(null)
    const y = returnY.current
    setTimeout(() => window.scrollTo({ top: y }), 40)
  }

  const saveMethod = (title: string, seq: OpKey[]) => {
    const id = builder?.editId ?? uid()
    setExperiments((list) => (list.some((e) => e.id === id) ? list.map((e) => (e.id === id ? { id, title, seq } : e)) : [...list, { id, title, seq }]))
    setOverlaid((o) => (o.includes(id) ? o : [...o, id]))
    closeBuilder()
  }
  const deleteMethod = () => {
    const id = builder?.editId
    if (!id) return
    setExperiments((list) => list.filter((e) => e.id !== id))
    setOverlaid((o) => o.filter((x) => x !== id))
    closeBuilder()
  }
  const resetMethods = () => {
    const fresh = defaultExperiments()
    setExperiments(fresh)
    setOverlaid(fresh.slice(0, 2).map((e) => e.id))
    setOpenId(null)
  }

  return (
    <div className="sim">
      <div className="widget">
        <div className="header">
          <h1>
            Shuffle <em>Simulator</em>
          </h1>
          <div style={{ marginTop: '0.3rem' }}>
            <Link className="sim-backlink" to="/">
              ← back to the conclusion
            </Link>
          </div>
        </div>

        {builder ? (
          <MethodBuilder
            editing={builder.editId ? (experiments.find((e) => e.id === builder.editId) ?? null) : null}
            start={start}
            tracked={tracked}
            onTracked={setTracked}
            animate={anim.on}
            speed={anim.speed}
            onSave={saveMethod}
            onCancel={closeBuilder}
            onDelete={deleteMethod}
          />
        ) : (
          <>
            <div className="runbar">
              <span className="condlbl">Deck</span>
              <select value={kind} onChange={(e) => setKind(e.target.value as DeckKind)}>
                {DECK_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
              <select value={n} onChange={(e) => setN(Number(e.target.value))}>
                {DECK_SIZES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <span className="status">{pending > 0 ? 'Scoring…' : 'Ready.'}</span>
              <button className="animtoggle" type="button" onClick={() => openBuilder(null)}>
                + New method
              </button>
              <button className="animtoggle anim-setting" type="button" onClick={anim.cycle}>
                Animation: {anim.label}
              </button>
            </div>

            <div className="bigsticky">
              <div className="bigwrap">
                <SummaryPanel series={series} selected={metric} step={chartStep} onClearComparison={() => setOverlaid([])} />
              </div>
            </div>

            <div className="diagh">Randomness diagnostics</div>
            {series.length > 0 && <DiagnosticGrid series={series} selected={metric} onSelect={setMetric} step={chartStep} />}

            <div className="diagh" style={{ marginTop: '1rem' }}>
              Compare methods
            </div>
            <HeadToHead series={series} />
            <MethodList
              experiments={experiments}
              results={results}
              pending={pending}
              colors={colors}
              openId={openId}
              onOpen={(id) => setOpenId((cur) => (cur === id ? null : id))}
              onToggleOverlay={toggleOverlay}
              onEdit={openBuilder}
              onReset={resetMethods}
              panel={
                openExp && (
                  <MethodPanel
                    exp={openExp}
                    result={results.get(openExp.id)}
                    start={start}
                    startLabel={kind}
                    step={step}
                    onStep={setStep}
                    tracked={tracked}
                    onTracked={setTracked}
                    animate={anim.on}
                    speed={anim.speed}
                  />
                )
              }
            />

            <div className="keyline">
              <div className="kg">
                <span className="kg-sw" style={{ background: `linear-gradient(to right,${colorFor(0, n)},${colorFor(n - 1, n)})` }} />
                original order
              </div>
              <div className="kg">
                <span className="kg-dash" />
                random baseline
              </div>
            </div>
            <div className="desc">
              Each chart line is one overlaid method, averaged over many trials. Click a diagnostic to see it large. Click a method to watch it
              shuffle an example deck; the dots on the charts follow the step you&rsquo;re on, and tapping a card follows it through the shuffle.
            </div>
          </>
        )}
      </div>

      <div className="simfoot">
        <b>Units.</b> Ordering, Proximity, Position, Neighbor correlation and Land spacing are shown as <b>% of the way from a fresh deck to random</b>,
        because their raw scales depend on deck size or are bare statistics; a percentage reads cleanly and compares fairly across 52/60/99-card decks. The
        rest keep natural units: <b>Longest chain</b> and <b>Strided chain</b> are the length in cards of the longest in-order run (random ≈ 4–5),{' '}
        <b>Local order</b> is the density of three-plus consecutive cards, <b>End retention</b> is the expected count of original end cards still at
        their end (0–2, random ≈ 0.08), <b>Global proximity</b> is the average distance originally-adjacent pairs now sit apart (random ≈ 32 on 99
        cards), and <b>Clump rate</b> is how much the deck clumps by card type, averaged over trials, against the rate a random deck clumps at.{' '}
        <b>Direction.</b> Most tests fail high — too much surviving structure. Ordering, Neighbor correlation, Land spacing, Proximity, End retention and
        Global proximity also fail <i>low</i>, because a deck can differ from random in the other direction: mana-weaving spaces lands too regularly, a
        strict riffle spreads neighbours too evenly, and an off-centre pass reliably evicts the end cards. Too regular is as detectable as too clumped.{' '}
        <b>Distinguishability</b> is the holistic backstop: a classifier trained live on gap-spacing features to separate this deck from true random,
        scored as held-out accuracy, where 50% is a coin flip. It exists to catch <i>joint</i> structure the single-property tests each miss, and it is
        deliberately simple, so read it as a lower bound on detectability — a pass is necessary evidence, not proof, and readings under about 53% are
        inside its own training noise. <b>The composite score</b> normalizes every diagnostic to the same percentage and averages them,{' '}
        <b>capped at the lowest-scoring failing test</b> — a deck cannot read as 90% randomized while a test sits unresolved. Clump rate counts toward
        the tally like any other test, but it is kept out of the score cap: it can fail from an unshuffled start simply because the fresh deck&rsquo;s
        lands were placed by the decklist, which is not the shuffle&rsquo;s doing.
      </div>
    </div>
  )
}
