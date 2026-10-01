import { useEffect, useRef } from 'react'
import { watch, type Side } from './field'

/** A canvas that shows the embers on one `side` of the page's content. It should cover the screen, fixed in place. */
export default function EmberField({ side, className }: { side: Side; className: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => watch(canvas.current!, side), [side])
  return <canvas ref={canvas} className={className} aria-hidden="true" />
}
