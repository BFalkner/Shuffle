import { Fragment } from 'react'
import { METRICS, type Metric } from '../../engine/metrics'
import { displayValue, fmt } from '../../engine/scoring'
import type { Series } from './types'

// Trial counts behind each metric's average, for its standard error.
const TRIALS: Partial<Record<Metric['key'], number>> = { endret: 400, position: 1, classifier: 1 }

/**
 * Side-by-side table of overlaid methods. A method "leads" on a diagnostic
 * only when it's closer to random than the runner-up by more than two
 * standard errors of the difference; anything less is noise.
 */
export default function HeadToHead({ series }: { series: Series[] }) {
  if (series.length < 2) return null

  const rows = METRICS.map((metric) => {
    const baseline = series[0].base[metric.key]
    const trials = TRIALS[metric.key] ?? 200
    const seDiff = (Math.SQRT2 * (baseline.standardDeviation || 1)) / Math.sqrt(trials)
    const distances = series.map((entry) => ({ entry, value: entry.avg[metric.key][entry.moveCount], distance: Math.abs(entry.avg[metric.key][entry.moveCount] - baseline.mean) }))
    const sorted = distances.slice().sort((x, y) => x.distance - y.distance)
    const win = sorted.length > 1 && sorted[1].distance - sorted[0].distance > 2 * seDiff ? sorted[0].entry : null
    return { metric, distances, win }
  })

  const leads = new Map<string, string[]>()
  rows.forEach((row) => {
    if (row.win) leads.set(row.win.name, [...(leads.get(row.win.name) ?? []), row.metric.title])
  })

  return (
    <div className="hth-card">
      <div className="hth-lead">
        {leads.size === 0
          ? 'No meaningful differences: every diagnostic is within sampling noise.'
          : [...leads].map(([name, titles], index) => (
              <Fragment key={name}>
                {index > 0 && '; '}
                <b>{name}</b> leads on {titles.join(', ')}
              </Fragment>
            ))}
        {leads.size > 0 && '; everything else is within noise.'}
      </div>
      <div className="hth-scroll">
        <table className="hth">
          <thead>
            <tr>
              <th />
              {series.map((entry) => (
                <th key={entry.id}>
                  <i className="cmpsw" style={{ background: entry.color }} />
                  {entry.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.metric.key}>
                <td className="hth-t">{row.metric.title}</td>
                {row.distances.map((x) => {
                  const won = row.win === x.entry
                  const val = row.metric.raw ? fmt(x.value, row.metric.key) : `${Math.round(displayValue(row.metric, x.value, x.entry.avg, x.entry.base))}%`
                  return (
                    <td key={x.entry.id} className={won ? 'hth-win' : ''} style={won ? { color: x.entry.color } : undefined}>
                      {val}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
