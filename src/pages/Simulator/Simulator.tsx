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
  const [deckSize, setDeckSize] = useState(99)
  // One fixed starting deck per condition, shared by every animation panel and the builder.
  const start = useMemo(() => startDeck(kind, deckSize), [kind, deckSize])

  // Saved methods
  const [experiments, setExperiments] = useState<Experiment[]>(loadExperiments)
  useEffect(() => saveExperiments(experiments), [experiments])

  // Which methods are overlaid on the charts (in order: the first sets the summary and colours).
  const [overlaid, setOverlaid] = useState<string[]>(() => experiments.slice(0, 2).map((experiment) => experiment.id))
  const [metric, setMetric] = useState<MetricKey | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [tracked, setTracked] = useState<TrackSlots>(emptySlots)
  const [builder, setBuilder] = useState<{ editId: string | null } | null>(null)
  const returnY = useRef(0)

  const { results, pending } = useMethodResults(experiments, kind, deckSize, overlaid)

  const colors = new Map<string, string>()
  const series: Series[] = []
  overlaid
    .filter((id) => experiments.some((experiment) => experiment.id === id))
    .forEach((id, index) => {
      const color = SERIES_COLORS[index % SERIES_COLORS.length]
      colors.set(id, color)
      const result = results.get(id)
      if (result) series.push({ ...result, id, name: experiments.find((experiment) => experiment.id === id)!.title, color })
    })

  const toggleOverlay = (id: string) => setOverlaid((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))
  const openExp = openId ? experiments.find((experiment) => experiment.id === openId) : undefined
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
    setExperiments((list) => (list.some((experiment) => experiment.id === id) ? list.map((experiment) => (experiment.id === id ? { id, title, seq } : experiment)) : [...list, { id, title, seq }]))
    setOverlaid((current) => (current.includes(id) ? current : [...current, id]))
    closeBuilder()
  }
  const deleteMethod = () => {
    const id = builder?.editId
    if (!id) return
    setExperiments((list) => list.filter((experiment) => experiment.id !== id))
    setOverlaid((current) => current.filter((x) => x !== id))
    closeBuilder()
  }
  const resetMethods = () => {
    const fresh = defaultExperiments()
    setExperiments(fresh)
    setOverlaid(fresh.slice(0, 2).map((experiment) => experiment.id))
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
            editing={builder.editId ? (experiments.find((experiment) => experiment.id === builder.editId) ?? null) : null}
            start={start}
            tracked={tracked}
            onTracked={setTracked}
            animate={anim.enabled}
            speed={anim.speed}
            onSave={saveMethod}
            onCancel={closeBuilder}
            onDelete={deleteMethod}
          />
        ) : (
          <>
            <div className="runbar">
              <span className="condlbl">Deck</span>
              <select value={kind} onChange={(event) => setKind(event.target.value as DeckKind)}>
                {DECK_KINDS.map((deckKind) => (
                  <option key={deckKind.value} value={deckKind.value}>
                    {deckKind.label}
                  </option>
                ))}
              </select>
              <select value={deckSize} onChange={(event) => setDeckSize(Number(event.target.value))}>
                {DECK_SIZES.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
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
                    animate={anim.enabled}
                    speed={anim.speed}
                  />
                )
              }
            />

            <div className="keyline">
              <div className="kg">
                <span className="kg-sw" style={{ background: `linear-gradient(to right,${colorFor(0, deckSize)},${colorFor(deckSize - 1, deckSize)})` }} />
                original order
              </div>
              <div className="kg">
                <span className="kg-dash" />
                random baseline
              </div>
            </div>
            <div className="desc">
              Each chart line is one overlaid method, averaged over many trials. Click a diagnostic to see it full size. Click a method to watch it
              shuffle an example deck: the dots on the charts mark the step you&rsquo;re viewing, and you can tap a card to follow it through the
              shuffle.
            </div>
          </>
        )}
      </div>

      <div className="simfoot">
        <p>
          Ordering, Proximity, Position, Neighbour correlation and Land spacing are shown as a percentage of the way from a fresh deck to random,
          because their raw scales depend on deck size or are bare statistics. A percentage reads cleanly and compares fairly across 52-, 60- and 99-card
          decks. The other tests keep natural units. Longest chain and Strided chain give the length in cards of the longest in-order run (random ≈ 4–5).
          Local order is the density of three or more consecutive cards. End retention is the expected number of original end cards still at their end
          (0–2; random ≈ 0.08). Global proximity is the average distance, in the original order, between cards that now sit side by side (random ≈ 32 on
          99 cards). Clump rate is how much the deck clumps by card type, averaged over trials, against the rate a random deck clumps at.
        </p>
        <p>
          Most tests fail high, meaning too much structure survived. Ordering, Neighbour correlation, Land spacing, Proximity, End retention and Global
          proximity can also fail <i>low</i>, because a deck can differ from random in the other direction: mana-weaving spaces lands too regularly, a
          strict riffle spreads neighbours too evenly, and an off-centre pass reliably moves the end cards away from the ends. Too regular is as detectable
          as too clumped.
        </p>
        <p>
          Distinguishability is the backstop for everything else. It is a classifier trained live on gap-spacing features to separate this deck from true
          random, scored as held-out accuracy, where 50% is a coin flip. It exists to catch <i>joint</i> structure that each single-property test misses. It
          is deliberately simple, so treat it as a lower bound on how detectable the deck is: a pass is necessary evidence, not proof, and readings under
          about 53% are within its own training noise.
        </p>
        <p>
          The composite score converts every diagnostic to the same percentage scale and averages them, capped at the lowest-scoring failing test, so a
          deck cannot read as 90% randomized while any test is still failing. Clump rate counts toward the tally like any other test but is left out of
          the cap: it can fail from an unshuffled start simply because the decklist placed the fresh deck&rsquo;s lands, which is not the shuffle&rsquo;s
          doing.
        </p>
      </div>
    </div>
  )
}
