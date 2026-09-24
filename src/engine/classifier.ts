// Distinguishability: a small logistic-regression classifier trained to tell a
// method's decks from genuinely random ones. Held-out accuracy of 50% means it
// cannot tell them apart.
import { fisher } from './decks'
import { mCorr } from './metrics'
import type { Deck } from './moves'

/** Gap-spacing features plus neighbour correlation. */
export function deckFeatures(deck: Deck, deckSize: number): number[] {
  let gapSum = 0
  let gapSquareSum = 0
  let absoluteGapSum = 0
  let nearCount = 0
  let adjacentCount = 0
  const gapCount = deckSize - 1
  for (let position = 0; position < deckSize - 1; position++) {
    const gap = deck[position + 1] - deck[position]
    const absoluteGap = Math.abs(gap)
    gapSum += gap
    gapSquareSum += gap * gap
    absoluteGapSum += absoluteGap
    if (absoluteGap <= 6) nearCount++
    if (absoluteGap === 1) adjacentCount++
  }
  const meanGap = gapSum / gapCount
  const gapVariance = gapSquareSum / gapCount - meanGap * meanGap
  return [absoluteGapSum / gapCount, Math.sqrt(Math.max(0, gapVariance)), nearCount / gapCount, adjacentCount / gapCount, mCorr(deck, deckSize)]
}

const RANDOM_FEATURES = new Map<number, number[][]>()

/** Features of 1000 random decks of size deckSize, cached. */
export function randomFeatures(deckSize: number): number[][] {
  let features = RANDOM_FEATURES.get(deckSize)
  if (!features) {
    features = []
    for (let deckNumber = 0; deckNumber < 1000; deckNumber++) features.push(deckFeatures(fisher(deckSize), deckSize))
    RANDOM_FEATURES.set(deckSize, features)
  }
  return features
}

/**
 * Train on 70% of (positive ∪ negative), return accuracy on the other 30%,
 * floored at 0.5 (below-chance accuracy is noise, not signal).
 */
export function classifierAccuracy(positive: number[][], negative: number[][]): number {
  const featureCount = positive[0].length
  const samples = positive.concat(negative)
  const sampleCount = samples.length
  const labels: number[] = []
  for (let sample = 0; sample < positive.length; sample++) labels.push(1)
  for (let sample = 0; sample < negative.length; sample++) labels.push(0)

  // standardize
  const means = new Array<number>(featureCount).fill(0)
  const standardDeviations = new Array<number>(featureCount).fill(0)
  samples.forEach((sample) => sample.forEach((value, feature) => (means[feature] += value)))
  for (let feature = 0; feature < featureCount; feature++) means[feature] /= sampleCount
  samples.forEach((sample) => sample.forEach((value, feature) => (standardDeviations[feature] += (value - means[feature]) * (value - means[feature]))))
  for (let feature = 0; feature < featureCount; feature++) standardDeviations[feature] = Math.sqrt(standardDeviations[feature] / sampleCount) || 1
  const standardized = samples.map((sample) => sample.map((value, feature) => (value - means[feature]) / standardDeviations[feature]))

  // shuffled train/test split
  const order = [...Array(sampleCount).keys()]
  for (let position = sampleCount - 1; position > 0; position--) {
    const swapWith = Math.floor(Math.random() * (position + 1))
    const held = order[position]
    order[position] = order[swapWith]
    order[swapWith] = held
  }
  const trainCount = Math.floor(sampleCount * 0.7)
  const trainSet = order.slice(0, trainCount)
  const testSet = order.slice(trainCount)

  // gradient descent
  const weights = new Array<number>(featureCount).fill(0)
  let bias = 0
  const learningRate = 0.3
  for (let iteration = 0; iteration < 250; iteration++) {
    const weightGradients = new Array<number>(featureCount).fill(0)
    let biasGradient = 0
    trainSet.forEach((sampleIndex) => {
      const row = standardized[sampleIndex]
      let score = bias
      for (let feature = 0; feature < featureCount; feature++) score += weights[feature] * row[feature]
      const probability = 1 / (1 + Math.exp(-score))
      const error = probability - labels[sampleIndex]
      for (let feature = 0; feature < featureCount; feature++) weightGradients[feature] += error * row[feature]
      biasGradient += error
    })
    for (let feature = 0; feature < featureCount; feature++) weights[feature] -= (learningRate * weightGradients[feature]) / trainSet.length
    bias -= (learningRate * biasGradient) / trainSet.length
  }

  let correct = 0
  testSet.forEach((sampleIndex) => {
    const row = standardized[sampleIndex]
    let score = bias
    for (let feature = 0; feature < featureCount; feature++) score += weights[feature] * row[feature]
    if ((score >= 0 ? 1 : 0) === labels[sampleIndex]) correct++
  })
  return Math.max(0.5, correct / testSet.length)
}
