// Compare ways of showing a routine's score: run a set of routines many times from both starting decks, and print how
// each candidate reads. The numbers behind docs/scoring-readability.md.
//
// Usage: npm run readability -- [runs]   (default 200 runs per routine per deck, about 6 minutes)
//
// For each routine and deck it prints:
// - total: the sum of the three categories' levels, as the simulator shows it now
// - clean: the share of runs with every category within the noise of random
// - noise lines: the worst metric's mean level divided by its noise line, so 1 is the edge of random
// - spotted after: about how many shuffled decks an observer would need to see to notice, 1,200 ÷ (noise lines)²,
//   because the noise line is set for 1,200 decks and shrinks with the square root of the number of decks
// - mash equivalent: the number of plain mashes with the same noise lines from the same deck, interpolated on a log
//   scale between whole numbers of mashes
// - classifier: distinguishability's mean accuracy, for reference
import { fisher, type DeckKind } from '../src/engine/decks.ts'
import { METRICS } from '../src/engine/metrics.ts'
import { RUN_DECKS } from '../src/engine/metrics/types.ts'
import { parseRoutine } from '../src/engine/routines.ts'
import { level, noiseLevel } from '../src/engine/scoring.ts'
import { computeResult, scoreResult } from '../src/engine/simulate.ts'
import { ENGINE_VERSION } from '../src/engine/version.ts'

const RUNS = Number(process.argv[2] ?? 200)
const SIZE = 99
const MASH_COUNTS = [3, 4, 5, 6, 7, 8, 9, 10, 12, 14]
const ROUTINES = [...MASH_COUNTS.map((count) => `M×${count}`), 'M×3·OHt·M×2', 'M×2·OHb·OHt·M×3', 'M×4·P·M×4', 'M×5·P·M×5', 'OH×10', 'P']
const SCORED = METRICS.filter((metric) => metric.category !== null)

interface Row {
  routine: string
  deck: DeckKind
  total: number
  clean: number
  noiseLines: number
  worstMetric: string
  classifier: number
}

/** Run a routine RUNS times from `deck`. With `perfect`, every move is a perfect shuffle, for a truly random reference. */
function measure(routine: string, deck: DeckKind, perfect = false): Row {
  const seq = parseRoutine(perfect ? 'M' : routine)
  const apply = perfect ? (cards: number[]) => fisher(cards.length) : undefined
  const levelSums = SCORED.map(() => 0)
  let clean = 0
  let total = 0
  let classifier = 0
  let base: ReturnType<typeof computeResult>['base'] | undefined
  for (let run = 0; run < RUNS; run++) {
    const result = computeResult(deck, SIZE, seq, 'ends', apply)
    const score = scoreResult(result)
    base = result.base
    if (score.clearCount === score.categories.length) clean++
    total += score.total
    classifier += result.avg.classifier[result.moveCount]
    SCORED.forEach((metric, index) => (levelSums[index] += level(metric, result.avg[metric.key][result.moveCount], result.base)))
  }
  const lines = SCORED.map((metric, index) => levelSums[index] / RUNS / noiseLevel(metric, base!))
  const worst = lines.indexOf(Math.max(...lines))
  return {
    routine: perfect ? 'perfect shuffle' : routine,
    deck,
    total: total / RUNS,
    clean: clean / RUNS,
    noiseLines: lines[worst],
    worstMetric: SCORED[worst].key,
    classifier: classifier / RUNS,
  }
}

/**
 * The number of plain mashes from the same deck with the same noise lines, interpolated on a log scale between the
 * measured mash counts. Below the fewest mashes measured, or past the most, it says so instead.
 */
function mashEquivalent(lines: number, mashes: Row[]): string {
  const points = mashes.map((row, index) => ({ count: MASH_COUNTS[index], log: Math.log(Math.max(row.noiseLines, 1e-3)) }))
  const target = Math.log(Math.max(lines, 1e-3))
  if (target >= points[0].log) return `under ${points[0].count}`
  const after = points.findIndex((point) => point.log <= target)
  if (after < 0) return `over ${points[points.length - 1].count}`
  const before = points[after - 1]
  const point = points[after]
  const count = before.count + ((before.log - target) / (before.log - point.log)) * (point.count - before.count)
  return count.toFixed(1)
}

const started = Date.now()
const rows: Row[] = []
for (const deck of ['sorted', 'played'] as DeckKind[]) {
  rows.push(measure('', deck, true))
  for (const routine of ROUTINES) {
    rows.push(measure(routine, deck))
    process.stdout.write(`  ${deck} ${routine} ${Math.round((Date.now() - started) / 1000)}s      \r`)
  }
}

const spotted = (lines: number) => (lines <= 0 ? 'never' : Math.round(RUN_DECKS / lines ** 2).toLocaleString('en'))
console.log(`\nEngine version ${ENGINE_VERSION}, ${SIZE} cards, ${RUNS} runs per routine per deck, ${Math.round((Date.now() - started) / 1000)}s.\n`)
console.log(
  'routine'.padEnd(20) +
    'deck'.padEnd(8) +
    'total'.padStart(8) +
    'clean'.padStart(7) +
    'noise lines'.padStart(13) +
    'worst metric'.padStart(16) +
    'spotted after'.padStart(15) +
    'mash equiv.'.padStart(13) +
    'classifier'.padStart(12),
)
for (const deck of ['sorted', 'played'] as DeckKind[]) {
  const deckRows = rows.filter((row) => row.deck === deck)
  const mashes = MASH_COUNTS.map((count) => deckRows.find((row) => row.routine === `M×${count}`)!)
  for (const row of deckRows) {
    console.log(
      row.routine.padEnd(20) +
        row.deck.padEnd(8) +
        row.total.toFixed(3).padStart(8) +
        `${Math.round(row.clean * 100)}%`.padStart(7) +
        row.noiseLines.toFixed(2).padStart(13) +
        row.worstMetric.padStart(16) +
        spotted(row.noiseLines).padStart(15) +
        (row.routine === 'perfect shuffle' ? '—' : mashEquivalent(row.noiseLines, mashes)).padStart(13) +
        `${(row.classifier * 100).toFixed(1)}%`.padStart(12),
    )
  }
}
