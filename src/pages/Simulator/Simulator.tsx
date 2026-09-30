import { useEffect, useMemo, useState } from 'react'
import { ToggleButton, ToggleButtonGroup } from 'react-aria-components'
import { Link } from 'react-router'
import { emptySlots, type TrackSlots } from '../../components/tracking'
import { DECK_KINDS, DECK_SIZES, startDeck, type DeckKind } from '../../engine/decks'
import type { MetricKey } from '../../engine/metrics'
import type { OpKey } from '../../engine/moves'
import { ANIMATION_SETTINGS, useAnimationSetting } from '../../hooks/useAnimationSetting'
import { useTitle } from '../../hooks/useTitle'
import DeckView from './DeckView'
import DiagnosticGrid from './DiagnosticGrid'
import { defaultExperiments, loadExperiments, methodName, saveExperiments, uid, type Experiment } from './experiments'
import HeadToHead from './HeadToHead'
import MethodList, { type MethodRow } from './MethodList'
import MetricDetail from './MetricDetail'
import Picker from './Picker'
import RoutineEditor from './RoutineEditor'
import ScoreCard from './ScoreCard'
import { scoreJob, useScores } from './scorer'
import { SERIES_COLORS, type Series } from './types'
import { useRoutineEditor } from './useRoutineEditor'
import './simulator.css'

const DECK_OPTIONS = DECK_KINDS.map(({ value }) => ({ value, label: value === 'sorted' ? 'Sorted' : 'Played' }))
const SIZE_OPTIONS = DECK_SIZES.map(({ value }) => ({ value, label: `${value} cards` }))
const ANIMATION_OPTIONS = ANIMATION_SETTINGS.map(({ label }) => ({ value: label, label }))

export default function Simulator() {
  useTitle('Shuffle Simulator')
  const animation = useAnimationSetting()

  const [kind, setKind] = useState<DeckKind>('sorted')
  const [deckSize, setDeckSize] = useState(99)
  // One fixed starting deck per condition, for the example deck.
  const start = useMemo(() => startDeck(kind, deckSize), [kind, deckSize])
  const otherKind: DeckKind = kind === 'sorted' ? 'played' : 'sorted'

  const [experiments, setExperiments] = useState<Experiment[]>(loadExperiments)
  useEffect(() => saveExperiments(experiments), [experiments])
  const [activeId, setActiveId] = useState<string | undefined>(() => experiments[0]?.id)
  const active = experiments.find((experiment) => experiment.id === activeId) ?? experiments[0]
  // Methods drawn on the charts beside the active one, which is always drawn.
  const [shownIds, setShownIds] = useState<string[]>(() => experiments.map((experiment) => experiment.id))
  const [metric, setMetric] = useState<MetricKey | null>(null)
  const [tracked, setTracked] = useState<TrackSlots>(emptySlots)

  const setSeq = (id: string, seq: OpKey[]) => setExperiments((list) => list.map((experiment) => (experiment.id === id ? { ...experiment, seq } : experiment)))
  const editor = useRoutineEditor(active, setSeq)

  // Score the active method first, then what the charts show, then the rest, all from the current starting deck; then
  // the same again from the other one.
  const byPriority = [...(active ? [active] : []), ...experiments.filter((experiment) => shownIds.includes(experiment.id)), ...experiments]
  const jobFor = (experiment: Experiment, deck: DeckKind) => scoreJob(experiment.id, deck, deckSize, experiment.seq)
  const scores = useScores([kind, otherKind].flatMap((deck) => byPriority.map((experiment) => jobFor(experiment, deck))))
  // While an edit is scored, each method keeps showing its last score, marked stale.
  const scoredFor = (experiment: Experiment, deck: DeckKind) => scores(jobFor(experiment, deck))

  // Colours follow the order methods were made (ids start with their creation time), so reordering the list keeps them.
  const byCreation = experiments.map((experiment) => experiment.id).sort()
  const colorOf = (experiment: Experiment) => SERIES_COLORS[byCreation.indexOf(experiment.id) % SERIES_COLORS.length]
  const rows: MethodRow[] = experiments.map((experiment) => ({
    experiment,
    color: colorOf(experiment),
    totals: { sorted: scoredFor(experiment, 'sorted'), played: scoredFor(experiment, 'played') },
  }))

  // The charts: the active method first, then the others that are ticked.
  const series: Series[] = experiments
    .filter((experiment) => experiment === active || shownIds.includes(experiment.id))
    .sort((left, right) => Number(right === active) - Number(left === active))
    .flatMap((experiment) => {
      const scored = scoredFor(experiment, kind)
      return scored ? [{ ...scored.result, id: experiment.id, name: methodName(experiment), color: colorOf(experiment), stale: scored.stale }] : []
    })
  const activeSeries = active && series[0]?.id === active.id ? series : []

  const activate = (id: string) => setActiveId(id)
  const addMethod = (experiment: Experiment, after?: Experiment) => {
    setExperiments((list) => {
      const at = after ? list.indexOf(after) + 1 : list.length
      return [...list.slice(0, at), experiment, ...list.slice(at)]
    })
    setActiveId(experiment.id)
  }
  const deleteActive = () => {
    if (!active) return
    const index = experiments.indexOf(active)
    const remaining = experiments.filter((experiment) => experiment !== active)
    setExperiments(remaining)
    setShownIds((ids) => ids.filter((id) => id !== active.id))
    setActiveId(remaining[Math.min(index, remaining.length - 1)]?.id)
  }
  const reset = () => {
    const fresh = defaultExperiments()
    setExperiments(fresh)
    setShownIds(fresh.map((experiment) => experiment.id))
    setActiveId(fresh[0]?.id)
  }

  return (
    <div className="sim">
      <header className="sim-top">
        <div className="sim-title">
          <h1>Shuffle Simulator</h1>
          <p>Build a shuffling routine and see how close to random it leaves the deck. Scores update as you edit.</p>
          <Link className="backlink" to="/">
            Back to home
          </Link>
        </div>
        <div className="sim-controls">
          <div className="deckswitch">
            <span className="deckswitch-label" id="deckswitch-label">
              Starting deck
            </span>
            <ToggleButtonGroup
              aria-labelledby="deckswitch-label"
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[kind]}
              onSelectionChange={(keys) => setKind([...keys][0] as DeckKind)}
            >
              {DECK_OPTIONS.map((option) => (
                <ToggleButton key={option.value} id={option.value} className="segment">
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>
          <Picker label="Deck size" value={deckSize} options={SIZE_OPTIONS} onChange={setDeckSize} />
          <Picker label="Animation" value={animation.label} options={ANIMATION_OPTIONS} onChange={animation.choose} />
        </div>
      </header>

      <div className="sim-body">
        <MethodList
          rows={rows}
          kind={kind}
          activeId={active?.id}
          shownIds={shownIds}
          onActivate={activate}
          onShownChange={setShownIds}
          onReorder={(ids, targetId, position) =>
            setExperiments((list) => {
              const moving = list.filter((experiment) => ids.includes(experiment.id))
              const staying = list.filter((experiment) => !ids.includes(experiment.id))
              const at = staying.findIndex((experiment) => experiment.id === targetId) + (position === 'after' ? 1 : 0)
              return [...staying.slice(0, at), ...moving, ...staying.slice(at)]
            })
          }
          onNew={() => addMethod({ id: uid(), seq: [] })}
          onReset={reset}
        />

        <main className="workbench">
          {active ? (
            <>
              <RoutineEditor
                method={active}
                editor={editor}
                onRename={(name) => setExperiments((list) => list.map((experiment) => (experiment === active ? { ...experiment, name: name.trim() ? name : undefined } : experiment)))}
                onDuplicate={() => addMethod({ id: uid(), name: active.name && `${active.name} copy`, seq: active.seq.slice() }, active)}
                onDelete={deleteActive}
              />
              <div className="workbench-pair">
                <DeckView
                  start={start}
                  seq={active.seq}
                  startLabel={kind}
                  step={editor.caret}
                  onStep={editor.setCaret}
                  tracked={tracked}
                  onTracked={setTracked}
                  animate={animation.enabled}
                  speed={animation.speed}
                />
                <ScoreCard kind={kind} current={scoredFor(active, kind)} other={scoredFor(active, otherKind)} onSwitchDeck={() => setKind(otherKind)} />
              </div>
              {activeSeries.length > 0 && (
                <section className="diagnostics" aria-label="Diagnostics">
                  <h2>Diagnostics</h2>
                  <p className="diagnostics-hint">Each chart follows one metric from the starting deck to the last move. The dashed line is a random deck, and the dots mark the step at the caret.</p>
                  {metric && <MetricDetail metricKey={metric} series={activeSeries} step={editor.caret} onClose={() => setMetric(null)} />}
                  <DiagnosticGrid series={activeSeries} selected={metric} onSelect={setMetric} step={editor.caret} />
                  <HeadToHead series={activeSeries} />
                </section>
              )}
            </>
          ) : (
            <p className="workbench-empty">No method is open. Make one with New method, or reset to the default methods.</p>
          )}
        </main>
      </div>
    </div>
  )
}
