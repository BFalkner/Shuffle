// Claims check: reruns the routines behind the step-by-step claims in docs/claims.md and prints each category's level
// after every move. Each line is one run of 1,200 decks, so --runs sets how many runs to show per routine.
//
// Usage: npm run claims -- [--runs 3] [--size 99]
//
// A level is how far a category sits from random: 0 is a random deck, and 1 is an unshuffled sorted deck. A * marks a
// category within the noise of random. dist. is distinguishability, the classifier's accuracy (50% is a coin flip).
// It ends with the distinguishability checks: 10 × --runs runs of random decks, and of routines near its 56% line.
import { parseArgs } from 'node:util'
import { fisher, type DeckKind } from '../src/engine/decks.ts'
import { CATEGORIES } from '../src/engine/metrics.ts'
import type { OpKey } from '../src/engine/moves.ts'
import { compressSeq, parseRoutine } from '../src/engine/routines.ts'
import { categoryReadings, fmtLevel } from '../src/engine/scoring.ts'
import { computeResult } from '../src/engine/simulate.ts'

const { values } = parseArgs({
  options: {
    runs: { type: 'string', default: '3' },
    size: { type: 'string', default: '99' },
  },
})
const runs = Number(values.runs)
const deckSize = Number(values.size)

/** The routines behind the claims, each with the claim it checks. */
const CHECKS: { claim: string; kind: DeckKind; routine: string }[] = [
  { claim: 'Mash step: from sorted, order looks random only after about six mashes', kind: 'sorted', routine: 'M×8' },
  { claim: 'Overhand step: old neighbours never spread out, however long you go', kind: 'sorted', routine: 'OH×8' },
  { claim: 'Half overhand step: four rounds break up order about as well as six mashes', kind: 'sorted', routine: 'OHt·M·OHt·M·OHt·M·OHt·M' },
  { claim: 'Pile step: a pile deal leaves neighbours spread too evenly; one pile adds nothing random', kind: 'sorted', routine: 'P' },
  { claim: 'Starting decks: how far the played deck sits from random before shuffling', kind: 'played', routine: 'M' },
  { claim: 'Global tests: three mashes from played, then a pile', kind: 'played', routine: 'M×3·P' },
]

const started = Date.now()
for (const { claim, kind, routine } of CHECKS) {
  const seq = parseRoutine(routine)
  console.log(`\n${claim}\n  ${compressSeq(seq)} from ${kind}, ${deckSize} cards`)
  console.log(`  ${'step'.padEnd(6)}${CATEGORIES.map(({ title }) => title.padEnd(12)).join('')}dist.`)
  for (let run = 0; run < runs; run++) {
    const result = computeResult(kind, deckSize, seq)
    for (let step = 0; step <= seq.length; step++) {
      const readings = categoryReadings(result.avg, result.base, step)
      const cells = readings.map(({ level, clear }) => `${fmtLevel(level)}${clear ? '*' : ' '}`.padEnd(12)).join('')
      console.log(`  ${String(step).padEnd(6)}${cells}${(result.avg.classifier[step] * 100).toFixed(1)}%`)
    }
    if (run < runs - 1) console.log('')
  }
}
// Distinguishability: how far the classifier reads by luck, and how much its reading varies between runs of one routine.
const distinguishabilityRuns = 10 * runs
const accuracy = (kind: DeckKind, seq: OpKey[], apply?: Parameters<typeof computeResult>[4]) =>
  Array.from({ length: distinguishabilityRuns }, () => computeResult(kind, deckSize, seq, 'ends', apply).avg.classifier[seq.length] * 100)
const summary = (readings: number[]) => {
  const sorted = readings.toSorted((a, b) => a - b)
  const mean = readings.reduce((a, b) => a + b, 0) / readings.length
  const sd = Math.sqrt(readings.reduce((a, x) => a + (x - mean) ** 2, 0) / (readings.length - 1))
  const over = readings.filter((reading) => reading > 56).length
  return `mean ${mean.toFixed(1)}%, sd ${sd.toFixed(1)}, 95th percentile ${sorted[Math.floor(0.95 * (sorted.length - 1))].toFixed(1)}%, max ${sorted.at(-1)!.toFixed(1)}%, over 56%: ${over}/${readings.length}`
}
console.log(`\nGlobal tests: the classifier on random decks, ${distinguishabilityRuns} runs`)
console.log(`  ${summary(accuracy('sorted', ['mash'], (deck) => fisher(deck.length)))}`)
console.log(`\nGlobal tests: how much the classifier's reading varies near its 56% line, ${distinguishabilityRuns} runs each from played`)
for (const routine of ['M×3', 'M×4', 'M×5', 'M×3·OHt·M', 'M×2·OHt·M×2']) console.log(`  ${routine.padEnd(14)}${summary(accuracy('played', parseRoutine(routine)))}`)

console.log(`\nFinished in ${Math.round((Date.now() - started) / 1000)}s.`)
