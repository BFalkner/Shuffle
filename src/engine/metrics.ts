// The metrics, in display order, and the categories they belong to. Each metric lives in its own file in metrics/, which
// says what it measures, how many decks it reads and how it reads them.
import type { Category, Metric, MetricKey } from './metrics/types.ts'
import { neighbourOrder } from './metrics/neighbourOrder.ts'
import { pairOrder } from './metrics/pairOrder.ts'
import { proximity } from './metrics/proximity.ts'
import { position } from './metrics/position.ts'
import { distinguishability } from './metrics/distinguishability.ts'

export type { Category, Metric, MetricKey } from './metrics/types.ts'

export const METRICS: Metric[] = [neighbourOrder, pairOrder, proximity, position, distinguishability]

export const CATEGORIES: { key: Category; title: string }[] = [
  { key: 'order', title: 'Order' },
  { key: 'proximity', title: 'Proximity' },
  { key: 'position', title: 'Position' },
]

export function metricByKey(key: MetricKey): Metric {
  return METRICS.find((metric) => metric.key === key)!
}

export function metricsIn(category: Category): Metric[] {
  return METRICS.filter((metric) => metric.category === category)
}
