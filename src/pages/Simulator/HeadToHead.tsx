import { Fragment } from 'react'
import { METRICS } from '../../engine/metrics'
import { fmtLevel, level } from '../../engine/scoring'
import type { Series } from './types'

/**
 * Side-by-side table of overlaid methods. A method "leads" on a metric only when it's closer to random than the
 * runner-up by more than two standard errors of the difference; anything less is noise.
 */
export default function HeadToHead({ series }: { series: Series[] }) {
  if (series.length < 2) return null

  const rows = METRICS.map((metric) => {
    const baseline = series[0].base[metric.key]
    // A metric's baseline spread is already the spread of one run's reading, here on the level scale.
    const seDiff = (Math.SQRT2 * baseline.standardDeviation) / Math.abs(baseline.sorted - baseline.mean)
    const distances = series.map((entry) => {
      const value = level(metric, entry.avg[metric.key][entry.moveCount], entry.base)
      return { entry, value, distance: Math.abs(value) }
    })
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
          ? 'No meaningful differences: every metric is within sampling noise.'
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
                  return (
                    <td key={x.entry.id} className={won ? 'hth-win' : ''} style={won ? { color: x.entry.color } : undefined}>
                      {fmtLevel(x.value)}
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr>
              <td className="hth-t">Total</td>
              {series.map((entry) => (
                <td key={entry.id}>{fmtLevel(entry.total)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
