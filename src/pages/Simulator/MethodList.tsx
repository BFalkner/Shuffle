import { Fragment, useEffect, useState, type ReactNode } from 'react'
import type { Experiment } from '../../engine/experiments'
import { METRICS } from '../../engine/metrics'
import { PencilIcon, PulseIcon } from './icons'
import type { ScoredResult } from './types'

interface Props {
  experiments: Experiment[]
  results: Map<string, ScoredResult>
  pending: number
  /** overlay colour per selected method id */
  colors: Map<string, string>
  openId: string | null
  onOpen: (id: string) => void
  onToggleOverlay: (id: string) => void
  onEdit: (id: string) => void
  onReset: () => void
  /** the animation panel for the open row */
  panel: ReactNode
}

/** Every saved method, ranked by score under the current deck. */
export default function MethodList({ experiments, results, pending, colors, openId, onOpen, onToggleOverlay, onEdit, onReset, panel }: Props) {
  if (pending > 0) {
    const done = experiments.length - pending
    return (
      <div className="cmplist">
        <div className="cmphint">
          {done === 0 ? `scoring ${experiments.length} methods under the current deck…` : `scoring methods… ${done} / ${experiments.length}`}
        </div>
      </div>
    )
  }

  const ranked = experiments
    .map((e) => ({ e, r: results.get(e.id)! }))
    .sort((a, b) => b.r.score - a.r.score)

  return (
    <div className="cmplist">
      {ranked.map(({ e, r }, i) => {
        const color = colors.get(e.id)
        const open = openId === e.id
        return (
          <Fragment key={e.id}>
            <div className={`cmprow${color ? ' sel' : ''}${open ? ' paneled' : ''}`} title="Watch this method shuffle" onClick={() => onOpen(e.id)}>
              <span className="cmprank">#{i + 1}</span>
              <span className="cmpname">
                {color && <i className="cmpsw" style={{ background: color }} />}
                {e.title}
              </span>
              <span className="cmpscore">
                <b>{Math.round(r.score * 100)}%</b> · {r.passCount}/{METRICS.length}
              </span>
              <span
                className={`expov${color ? ' on' : ''}`}
                title="Overlay on charts"
                onClick={(ev) => {
                  ev.stopPropagation()
                  onToggleOverlay(e.id)
                }}
              >
                <PulseIcon />
              </span>
              <span
                className="expmag"
                title="Edit method"
                onClick={(ev) => {
                  ev.stopPropagation()
                  onEdit(e.id)
                }}
              >
                <PencilIcon />
              </span>
            </div>
            {open && panel}
          </Fragment>
        )
      })}
      <ResetLink onReset={onReset} />
    </div>
  )
}

/** Two taps to reset: the first arms it for a few seconds. */
function ResetLink({ onReset }: { onReset: () => void }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3500)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <div
      className="cmpreset"
      onClick={() => {
        if (armed) {
          setArmed(false)
          onReset()
        } else setArmed(true)
      }}
    >
      {armed ? 'tap again to reset — custom methods will be deleted' : 'reset list to defaults'}
    </div>
  )
}
