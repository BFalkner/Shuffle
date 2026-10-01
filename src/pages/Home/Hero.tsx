import { useEffect, useRef, type ReactNode } from 'react'
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

/** The top of the page: a night landscape in two layers, the sky and the ridges, with embers rising behind the copy. */
export default function Hero({ children }: { children: ReactNode }) {
  const sky = useRef<HTMLDivElement>(null)
  const ridges = useRef<HTMLDivElement>(null)
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
      </div>
    </header>
  )
}
