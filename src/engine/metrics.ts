// The thirteen randomness diagnostics. Each lives in its own file in metrics/, with its measure and its description.
// Each per-deck metric takes the deck, its size and the card types and returns one number; neighbour gaps, position
// and classifier are computed across a whole batch of trials instead (measure: null). This file lists them in order.
import type { Metric, MetricGroup, MetricKey } from './metrics/types.ts'
import { ordering } from './metrics/ordering.ts'
import { proximity } from './metrics/proximity.ts'
import { globalProximity } from './metrics/globalProximity.ts'
import { neighbourGaps } from './metrics/neighbourGaps.ts'
import { position } from './metrics/position.ts'
import { endRetention } from './metrics/endRetention.ts'
import { correlation } from './metrics/correlation.ts'
import { distinguishability } from './metrics/distinguishability.ts'
import { longestChain } from './metrics/longestChain.ts'
import { stridedChain } from './metrics/stridedChain.ts'
import { localOrder } from './metrics/localOrder.ts'
import { landSpacing } from './metrics/landSpacing.ts'
import { clumpRate } from './metrics/clumpRate.ts'

export type { Metric, MetricGroup, MetricKey, Side, WriteupRoute } from './metrics/types.ts'
export { mOrdering } from './metrics/ordering.ts'
export { mProximity } from './metrics/proximity.ts'
export { mDrift } from './metrics/globalProximity.ts'
export { addGaps, gapBins, gapChiSquare, type GapBins } from './metrics/neighbourGaps.ts'
export { mEndRetention } from './metrics/endRetention.ts'
export { mCorr } from './metrics/correlation.ts'
export { mChain } from './metrics/longestChain.ts'
export { mStrided } from './metrics/stridedChain.ts'
export { mGradient } from './metrics/localOrder.ts'
export { mSpacing } from './metrics/landSpacing.ts'
export { mClump } from './metrics/clumpRate.ts'

export const METRICS: Metric[] = [
  ordering,
  proximity,
  globalProximity,
  neighbourGaps,
  position,
  endRetention,
  correlation,
  distinguishability,
  longestChain,
  stridedChain,
  localOrder,
  landSpacing,
  clumpRate,
]

export const GROUPS: [MetricGroup, string][] = [
  ['order', 'Residual order'],
  ['structure', 'Placement structure'],
  ['holistic', 'Holistic'],
  ['composition', 'Composition'],
]

export function metricByKey(key: MetricKey): Metric {
  return METRICS.find((metric) => metric.key === key)!
}
