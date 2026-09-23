import { Fragment } from 'react'
import { METRICS, type Metric } from '../../engine/metrics'
import { displayValue, fmt } from '../../engine/scoring'
import type { Series } from './types'

// Trial counts behind each metric's average, for its standard error.
const TRIALS: Partial<Record<Metric['k'], number>> = { endret: 400, position: 1, classifier: 1 }

/**
 * Side-by-side table of overlaid methods. A method "leads" on a diagnostic
 * only when it's closer to random than the runner-up by more than two
 * standard errors of the difference; anything less is noise.
 */
export default function HeadToHead({ series }: { series: Series[] }) {
  if (series.length < 2) return null

  const rows = METRICS.map((m) => {
    const b = series[0].base[m.k]
    const T = TRIALS[m.k] ?? 200
    const seDiff = (Math.SQRT2 * (b.sd || 1)) / Math.sqrt(T)
    const ds = series.map((e) => ({ e, v: e.avg[m.k][e.L], d: Math.abs(e.avg[m.k][e.L] - b.mean) }))
    const sorted = ds.slice().sort((x, y) => x.d - y.d)
    const win = sorted.length > 1 && sorted[1].d - sorted[0].d > 2 * seDiff ? sorted[0].e : null
    return { m, ds, win }
  })

  const leads = new Map<string, string[]>()
  rows.forEach((r) => {
    if (r.win) leads.set(r.win.name, [...(leads.get(r.win.name) ?? []), r.m.title])
  })

  return (
    <div className="hth-card">
      <div className="hth-lead">
        {leads.size === 0
          ? 'No meaningful differences — every diagnostic is within sampling noise of the others.'
          : [...leads].map(([name, titles], i) => (
              <Fragment key={name}>
                {i > 0 && '; '}
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
              {series.map((e) => (
                <th key={e.id}>
                  <i className="cmpsw" style={{ background: e.color }} />
                  {e.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.m.k}>
                <td className="hth-t">{r.m.title}</td>
                {r.ds.map((x) => {
                  const won = r.win === x.e
                  const val = r.m.raw ? fmt(x.v, r.m.k) : `${Math.round(displayValue(r.m, x.v, x.e.avg, x.e.base))}%`
                  return (
                    <td key={x.e.id} className={won ? 'hth-win' : ''} style={won ? { color: x.e.color } : undefined}>
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
