// The home page's move charts: each move repeated up to ten times from a sorted deck, with the share of order, proximity
// and position left after each repeat (100% is the sorted deck, 0% is random). Writes src/pages/Home/charts.json.
//
// Usage: npm run home-charts -- [--runs 10]
import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { CATEGORIES } from '../src/engine/metrics.ts'
import type { OpKey } from '../src/engine/moves.ts'
import { categoryReadings } from '../src/engine/scoring.ts'
import { seed } from '../src/engine/seeded.ts'
import { computeResult } from '../src/engine/simulate.ts'
import { ENGINE_VERSION } from '../src/engine/version.ts'

const { values } = parseArgs({ options: { runs: { type: 'string', default: '10' } } })
const runs = Number(values.runs)
const REPEATS = 10
const DECK_SIZE = 99
const MOVES: OpKey[] = ['mash', 'overhand', 'pile']

seed(DECK_SIZE)
const series: Record<string, Record<string, number[]>> = {}
for (const op of MOVES) {
  const sums = CATEGORIES.map(() => new Array<number>(REPEATS + 1).fill(0))
  for (let run = 0; run < runs; run++) {
    const result = computeResult('sorted', DECK_SIZE, new Array<OpKey>(REPEATS).fill(op))
    for (let step = 0; step <= REPEATS; step++) {
      categoryReadings(result.avg, result.base, step).forEach(({ level }, index) => (sums[index][step] += level / runs))
    }
  }
  // Percent left, clamped at 0: a reading a little below random is noise.
  series[op] = Object.fromEntries(CATEGORIES.map(({ key }, index) => [key, sums[index].map((level) => Math.max(0, Math.round(1000 * level) / 10))]))
  console.log(op, JSON.stringify(series[op]))
}

writeFileSync('src/pages/Home/charts.json', JSON.stringify({ engineVersion: ENGINE_VERSION, runs, series }, null, 2) + '\n')
console.log('Wrote src/pages/Home/charts.json.')
