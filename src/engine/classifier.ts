// Distinguishability: a small logistic-regression classifier trained to tell a
// method's decks from genuinely random ones. Held-out accuracy of 50% means it
// cannot tell them apart.
import { fisher } from './decks.ts'
import type { Deck } from './moves.ts'

/** Correlation between each card and the next: +1 sorted, −1 reversed, 0 random. */
export function mCorr(deck: Deck, deckSize: number): number {
  let sumCurrent = 0
  let sumNext = 0
  let sumProduct = 0
  let sumCurrentSquared = 0
  let sumNextSquared = 0
  const pairCount = deckSize - 1
  for (let position = 0; position < deckSize - 1; position++) {
    const current = deck[position]
    const next = deck[position + 1]
    sumCurrent += current
    sumNext += next
    sumProduct += current * next
    sumCurrentSquared += current * current
    sumNextSquared += next * next
  }
  const covariance = sumProduct / pairCount - (sumCurrent / pairCount) * (sumNext / pairCount)
  const varianceCurrent = sumCurrentSquared / pairCount - (sumCurrent / pairCount) * (sumCurrent / pairCount)
  const varianceNext = sumNextSquared / pairCount - (sumNext / pairCount) * (sumNext / pairCount)
  return varianceCurrent > 0 && varianceNext > 0 ? covariance / Math.sqrt(varianceCurrent * varianceNext) : 0
}

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

// Training runs at every step of every routine, so it is written for speed: samples live in flat Float64Arrays
// (row-major, featureCount values per sample), and the training rows are copied into one block in training order so
// the 250 passes read memory straight through. Every sum is taken in the same order as the plain version, so results
// are identical to the bit.

const ITERATIONS = 250
const LEARNING_RATE = 0.3
const TRAIN_SHARE = 0.7

/** Shift and scale each feature to mean 0 and standard deviation 1 over all samples (a constant feature keeps scale 1). */
function standardize(samples: number[][], featureCount: number): Float64Array {
  const sampleCount = samples.length
  const means = new Float64Array(featureCount)
  const standardDeviations = new Float64Array(featureCount)
  for (const sample of samples) for (let feature = 0; feature < featureCount; feature++) means[feature] += sample[feature]
  for (let feature = 0; feature < featureCount; feature++) means[feature] /= sampleCount
  for (const sample of samples) {
    for (let feature = 0; feature < featureCount; feature++) {
      const offset = sample[feature] - means[feature]
      standardDeviations[feature] += offset * offset
    }
  }
  for (let feature = 0; feature < featureCount; feature++) standardDeviations[feature] = Math.sqrt(standardDeviations[feature] / sampleCount) || 1
  const standardized = new Float64Array(sampleCount * featureCount)
  samples.forEach((sample, index) => {
    for (let feature = 0; feature < featureCount; feature++) standardized[index * featureCount + feature] = (sample[feature] - means[feature]) / standardDeviations[feature]
  })
  return standardized
}

/** Sample indices in a random order (Fisher–Yates). The first TRAIN_SHARE train the model and the rest test it. */
function shuffledOrder(sampleCount: number): Int32Array {
  const order = Int32Array.from({ length: sampleCount }, (_, index) => index)
  for (let position = sampleCount - 1; position > 0; position--) {
    const swapWith = Math.floor(Math.random() * (position + 1))
    const held = order[position]
    order[position] = order[swapWith]
    order[swapWith] = held
  }
  return order
}

/** Copy the chosen samples' rows into one contiguous block, in the order given. */
function gatherRows(standardized: Float64Array, featureCount: number, indices: Int32Array): Float64Array {
  const rows = new Float64Array(indices.length * featureCount)
  indices.forEach((sample, row) => rows.set(standardized.subarray(sample * featureCount, (sample + 1) * featureCount), row * featureCount))
  return rows
}

/** The model's score for one row: bias plus the weighted features. Positive means it guesses "not random". */
function score(weights: Float64Array, bias: number, rows: Float64Array, start: number): number {
  let total = bias
  for (let feature = 0; feature < weights.length; feature++) total += weights[feature] * rows[start + feature]
  return total
}

/**
 * Logistic regression by batch gradient descent: ITERATIONS passes over the training rows, each moving the weights and
 * bias against the average gradient of the log loss.
 */
function train(rows: Float64Array, labels: Float64Array, featureCount: number): { weights: Float64Array; bias: number } {
  if (featureCount === 5) return trainFive(rows, labels)
  const rowCount = labels.length
  const weights = new Float64Array(featureCount)
  const weightGradients = new Float64Array(featureCount)
  let bias = 0
  for (let iteration = 0; iteration < ITERATIONS; iteration++) {
    weightGradients.fill(0)
    let biasGradient = 0
    for (let row = 0, start = 0; row < rowCount; row++, start += featureCount) {
      const error = 1 / (1 + Math.exp(-score(weights, bias, rows, start))) - labels[row]
      for (let feature = 0; feature < featureCount; feature++) weightGradients[feature] += error * rows[start + feature]
      biasGradient += error
    }
    for (let feature = 0; feature < featureCount; feature++) weights[feature] -= (LEARNING_RATE * weightGradients[feature]) / rowCount
    bias -= (LEARNING_RATE * biasGradient) / rowCount
  }
  return { weights, bias }
}

/**
 * `train` for exactly five features, which is what deckFeatures produces. The weights and gradients live in locals and
 * each row's score is written out term by term, in the same order as `score`, so the results match `train` to the bit.
 * Half the remaining time is Math.exp, which no rewrite can skip without changing results.
 */
function trainFive(rows: Float64Array, labels: Float64Array): { weights: Float64Array; bias: number } {
  const rowCount = labels.length
  let [w0, w1, w2, w3, w4, bias] = [0, 0, 0, 0, 0, 0]
  for (let iteration = 0; iteration < ITERATIONS; iteration++) {
    let [g0, g1, g2, g3, g4, biasGradient] = [0, 0, 0, 0, 0, 0]
    for (let row = 0, start = 0; row < rowCount; row++, start += 5) {
      const x0 = rows[start]
      const x1 = rows[start + 1]
      const x2 = rows[start + 2]
      const x3 = rows[start + 3]
      const x4 = rows[start + 4]
      const total = bias + w0 * x0 + w1 * x1 + w2 * x2 + w3 * x3 + w4 * x4
      const error = 1 / (1 + Math.exp(-total)) - labels[row]
      g0 += error * x0
      g1 += error * x1
      g2 += error * x2
      g3 += error * x3
      g4 += error * x4
      biasGradient += error
    }
    w0 -= (LEARNING_RATE * g0) / rowCount
    w1 -= (LEARNING_RATE * g1) / rowCount
    w2 -= (LEARNING_RATE * g2) / rowCount
    w3 -= (LEARNING_RATE * g3) / rowCount
    w4 -= (LEARNING_RATE * g4) / rowCount
    bias -= (LEARNING_RATE * biasGradient) / rowCount
  }
  return { weights: Float64Array.of(w0, w1, w2, w3, w4), bias }
}

/**
 * Train on 70% of (positive ∪ negative), return accuracy on the other 30%,
 * floored at 0.5 (below-chance accuracy is noise, not signal).
 */
export function classifierAccuracy(positive: number[][], negative: number[][]): number {
  const featureCount = positive[0].length
  const samples = positive.concat(negative)
  const sampleCount = samples.length
  // Positive samples come first, so a sample is labelled 1 exactly when its index is below positive.length.
  const labelOf = (sample: number) => (sample < positive.length ? 1 : 0)

  const standardized = standardize(samples, featureCount)
  const order = shuffledOrder(sampleCount)
  const trainCount = Math.floor(sampleCount * TRAIN_SHARE)
  const trainIndices = order.subarray(0, trainCount)
  const testIndices = order.subarray(trainCount)

  const { weights, bias } = train(gatherRows(standardized, featureCount, trainIndices), Float64Array.from(trainIndices, labelOf), featureCount)

  const testRows = gatherRows(standardized, featureCount, testIndices)
  const correct = testIndices.reduce((total, sample, row) => total + ((score(weights, bias, testRows, row * featureCount) >= 0 ? 1 : 0) === labelOf(sample) ? 1 : 0), 0)
  return Math.max(0.5, correct / testIndices.length)
}
