import { type ReactNode } from 'react'
import Embers from './Embers'
import Landscape, { type Palette } from './Landscape'

const NIGHT: Palette = {
  sky: ['#0d0a20', '#231a4a', '#5a2f5c', '#d9824a'],
  ridges: ['#4b3468', '#34254f', '#241a3a', '#150f25'],
  glow: '#f0a24a',
  starCount: 170,
  keep: { x: 1440, y: 600, scale: 0.55 },
}

/** The top of the page: a night landscape with embers rising behind the copy. */
export default function Hero({ children }: { children: ReactNode }) {
  return (
    <header className="hero">
      <Landscape className="hero-sky" seed={7} palette={NIGHT} />
      <Embers />
      <div className="hero-inner">
        <div className="hero-copy">{children}</div>
      </div>
    </header>
  )
}
