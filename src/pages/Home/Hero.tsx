import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from 'react-aria-components'
import { startBridge, type Bridge } from './bridge'
import Embers from './Embers'
import Landscape, { type Palette } from './Landscape'
import { BACK_EMBERS, SPEED, startHeroParallax } from './parallax'

const NIGHT: Palette = {
  sky: ['#0d0a20', '#231a4a', '#5a2f5c', '#d9824a'],
  ridges: ['#4b3468', '#34254f', '#241a3a', '#150f25'],
  glow: '#f0a24a',
  starCount: 170,
  keep: { x: 1440, y: 600, scale: 0.55 },
}

/**
 * The top of the page: a night landscape, embers rising, and a deck that tries to bridge and flies all over the
 * ground instead. The deck's place is `spot`, in the layout; the cards fly on `stage`, which covers the whole hero.
 */
export default function Hero({ children }: { children: ReactNode }) {
  const sky = useRef<HTMLDivElement>(null)
  const ridges = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const spot = useRef<HTMLDivElement>(null)
  const bridge = useRef<Bridge>(null)
  const [landed, setLanded] = useState(false)
  useEffect(() => {
    bridge.current = startBridge(stage.current!, spot.current!, () => setLanded(true))
    return bridge.current.stop
  }, [])
  useEffect(() => {
    const stopSky = startHeroParallax(sky.current!, SPEED.sky)
    const stopRidges = startHeroParallax(ridges.current!, SPEED.ridges)
    return () => {
      stopSky()
      stopRidges()
    }
  }, [])

  return (
    <header className="hero">
      <div className="hero-layer sky" ref={sky}>
        <Landscape seed={7} palette={NIGHT} layer="sky" />
      </div>
      <div className="hero-layer" ref={ridges}>
        <Landscape seed={7} palette={NIGHT} layer="ridges" />
      </div>
      <Embers count={70} bands={BACK_EMBERS} className="embers" />
      <div className="hero-inner">
        <div className="hero-copy">{children}</div>
        <div className="bridge-spot" ref={spot}>
          {landed && (
            <Button
              className="bridge-again"
              onPress={() => {
                setLanded(false)
                bridge.current!.replay()
              }}
            >
              Shuffle again
            </Button>
          )}
        </div>
      </div>
      <div className="bridge-stage" ref={stage} aria-hidden="true" />
    </header>
  )
}
