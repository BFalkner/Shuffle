// The metrics, in display order, and the categories they belong to. Each metric lives in its own file in metrics/, which
// says what it measures, how many decks it reads and how it reads them.
import type { Category, Metric, MetricKey } from './metrics/types.ts'
import { sequence } from './metrics/sequence.ts'
import { proximity } from './metrics/proximity.ts'
import { spread } from './metrics/spread.ts'
import { ends } from './metrics/ends.ts'
import { lands } from './metrics/lands.ts'
import { distinguishability } from './metrics/distinguishability.ts'

export type { Category, Metric, MetricKey } from './metrics/types.ts'

export const METRICS: Metric[] = [sequence, proximity, spread, ends, lands, distinguishability]

export const CATEGORIES: { key: Category; title: string }[] = [
  { key: 'sequence', title: 'Sequence' },
  { key: 'proximity', title: 'Proximity' },
  { key: 'position', title: 'Position' },
  { key: 'lands', title: 'Lands' },
]

export function metricByKey(key: MetricKey): Metric {
  return METRICS.find((metric) => metric.key === key)!
}

export function metricsIn(category: Category): Metric[] {
  return METRICS.filter((metric) => metric.category === category)
}
