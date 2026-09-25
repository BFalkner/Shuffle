// The thirteen randomness diagnostics, in display order. Each lives in its own file in metrics/, which says what it
// measures, how many decks it reads, how the engine reads them and how its pass line is calibrated.
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

export type { Metric, MetricGroup, MetricKey, Side } from './metrics/types.ts'

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
