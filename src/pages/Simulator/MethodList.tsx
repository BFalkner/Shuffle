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
    .map((experiment) => ({ experiment, result: results.get(experiment.id)! }))
    .sort((left, right) => right.result.score - left.result.score)

  return (
    <div className="cmplist">
      {ranked.map(({ experiment, result }, rank) => {
        const color = colors.get(experiment.id)
        const open = openId === experiment.id
        return (
          <Fragment key={experiment.id}>
            <div className={`cmprow${color ? ' sel' : ''}${open ? ' paneled' : ''}`} title="Watch this method shuffle" onClick={() => onOpen(experiment.id)}>
              <span className="cmprank">#{rank + 1}</span>
              <span className="cmpname">
                {color && <i className="cmpsw" style={{ background: color }} />}
                {experiment.title}
              </span>
              <span className="cmpscore">
                <b>{Math.round(result.score * 100)}%</b> · {result.passCount}/{METRICS.length}
              </span>
              <span
                className={`expov${color ? ' on' : ''}`}
                title="Overlay on charts"
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleOverlay(experiment.id)
                }}
              >
                <PulseIcon />
              </span>
              <span
                className="expmag"
                title="Edit method"
                onClick={(event) => {
                  event.stopPropagation()
                  onEdit(experiment.id)
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
    const timer = setTimeout(() => setArmed(false), 3500)
    return () => clearTimeout(timer)
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
      {armed ? 'tap again to reset (deletes your custom methods)' : 'reset list to defaults'}
    </div>
  )
}
