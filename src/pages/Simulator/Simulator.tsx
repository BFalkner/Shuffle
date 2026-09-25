import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { LAND_COLOR, OTHER_COLOR, colorFor } from '../../components/deckColors'
import { DECK_KINDS, DECK_SIZES, startDeck, type DeckKind } from '../../engine/decks'
import { defaultExperiments, loadExperiments, saveExperiments, uid, type Experiment } from './experiments'
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
  const starting = useMemo(() => startDeck(kind, deckSize), [kind, deckSize])
  const start = starting.deck
  const types = starting.byType ? starting.types : undefined

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
          <p className="sim-intro">
            Pick a starting deck, then choose a routine from the list or build your own. The simulator runs each routine many times and shows, for
            every test, how close the deck gets to random after each step. Click a test to read what it checks.
          </p>
          <div style={{ marginTop: '0.3rem' }}>
            <Link className="sim-backlink" to="/">
              ← back to home
            </Link>
          </div>
        </div>

        {builder ? (
          <MethodBuilder
            editing={builder.editId ? (experiments.find((experiment) => experiment.id === builder.editId) ?? null) : null}
            start={start}
            types={types}
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
                    types={types}
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
              {types ? (
                <>
                  <div className="kg">
                    <span className="kg-sw" style={{ background: LAND_COLOR }} />
                    land
                  </div>
                  <div className="kg">
                    <span className="kg-sw" style={{ background: OTHER_COLOR }} />
                    other card
                  </div>
                </>
              ) : (
                <div className="kg">
                  <span className="kg-sw" style={{ background: `linear-gradient(to right,${colorFor(0, deckSize)},${colorFor(deckSize - 1, deckSize)})` }} />
                  original order
                </div>
              )}
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
          Four tests are shown as a percentage of the way from the starting deck to random: ordering, proximity, position and land spacing. Their raw
          numbers depend on deck size, so a percentage compares fairly across 52-, 60- and 99-card decks. The other tests keep their own units, and
          clicking one shows its random value.
        </p>
        <p>
          Most tests fail when too much order survives. Seven also fail when a deck misses random in the other direction: ordering, proximity, global
          proximity, neighbour correlation, end retention, land spacing and clump rate. A pile deal or an early mash spreads neighbours too evenly, mana
          weaving spaces lands too evenly, and an off-centre riffle moves the end cards away from the ends too reliably.
        </p>
        <p>
          The headline score puts every test on the same percentage scale and averages them. The four core tests (ordering, proximity, position and
          neighbour correlation) count double. The score is capped at the lowest-scoring test that fails, so a deck can&rsquo;t read 90% randomized while a
          test is still failing. Clump rate is left out of the cap, because a fresh deck can fail it just because of where the decklist put the lands.
        </p>
      </div>
    </div>
  )
}
