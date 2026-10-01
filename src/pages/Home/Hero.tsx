import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from 'react-aria-components'
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

/** how long the scroll down to the next section takes, ms */
const SCROLL_TIME = 650

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const easeInOut = (progress: number) => (progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2)

/** Scrolls the page until `element`'s top reaches the top of the screen, over SCROLL_TIME, or at once with reduced motion. */
function scrollDownTo(element: HTMLElement) {
  const start = window.scrollY
  const distance = element.getBoundingClientRect().top
  if (reducedMotion()) {
    window.scrollTo(0, start + distance)
    return
  }
  const began = performance.now()
  const step = (now: number) => {
    const progress = Math.min(1, (now - began) / SCROLL_TIME)
    window.scrollTo(0, start + distance * easeInOut(progress))
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

/** the chevron's two tips and the middle of its front, in its picture's units */
const CHEVRON = { left: { x: 8, y: 10 }, front: { x: 60, y: 34 }, right: { x: 112, y: 10 } }
/** how thick the arms are at the front, across them; they narrow to sharp points at the tips */
const CHEVRON_WIDTH = 13.2

/**
 * The chevron as an arrowhead: an outer edge from each tip down to the front point, and an inner edge from each tip up
 * to the notch above it. The front and the notch sit half the arms' thickness either side of the front's middle,
 * measured upright, so the arms are CHEVRON_WIDTH thick across.
 */
function arrowhead(): string {
  const { left, front, right } = CHEVRON
  const slope = Math.atan2(front.y - left.y, front.x - left.x)
  const half = CHEVRON_WIDTH / 2 / Math.cos(slope)
  return `M${left.x},${left.y} L${front.x},${(front.y + half).toFixed(2)} L${right.x},${right.y} L${front.x},${(front.y - half).toFixed(2)} Z`
}

/**
 * A clear glass chevron pointing down, shaped like an arrowhead: thickest at the front and sharp at both tips. Its top
 * is flat and clear, so the background shows through it, and only the bevel round its edges shows. The shape is lit
 * from above: the upper bevels catch a highlight, and the lower edges a dark rim. A lamp just above the front shines
 * on it too, so it glints.
 */
function Chevron() {
  return (
    <svg viewBox="0 0 120 44" aria-hidden="true">
      <defs>
        <filter id="chevron-glass" x="-20%" y="-30%" width="140%" height="170%">
          {/* The shape's height for the light to fall on: it rises from nothing at the edge to full one blur width in,
              then holds level, so the top is flat. Blurred, the edge is at 0.5 and one blur width in is at 0.84; the
              transfer maps those to 0 and 1 and clamps everything past them. */}
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blurred" />
          <feComponentTransfer in="blurred" result="height">
            <feFuncA type="linear" slope="2.94" intercept="-1.47" />
          </feComponentTransfer>
          <feSpecularLighting in="height" surfaceScale="1.6" specularConstant="1.5" specularExponent="10" lightingColor="#fff4d6" result="shine">
            <feDistantLight azimuth="270" elevation="38" />
          </feSpecularLighting>
          {/* Light only on the bevel: the shape less its height, which is full on the flat top and falls off over the
              bevel, so the band fades in smoothly from the top's edge. */}
          <feComposite in="SourceAlpha" in2="height" operator="arithmetic" k2="1" k3="-1" result="bevel" />
          <feComposite in="shine" in2="bevel" operator="in" result="highlight" />
          {/* A lamp shining straight down onto it from just above the front: a glint on the bevel and a soft hotspot on
              the flat top, where its reflection meets the eye. */}
          <feSpecularLighting in="height" surfaceScale="1.6" specularConstant="1.1" specularExponent="22" lightingColor="#fff1d0" result="lamp">
            <fePointLight x="60" y="-24" z="60" />
          </feSpecularLighting>
          <feComposite in="lamp" in2="SourceAlpha" operator="in" result="lit" />
          {/* The lower rim: the part of the shape not covered by itself moved up a little. */}
          <feOffset in="SourceAlpha" dy="-1.8" result="raised" />
          <feComposite in="SourceAlpha" in2="raised" operator="out" result="rim" />
          <feFlood floodColor="#0a0612" floodOpacity="0.6" />
          <feComposite in2="rim" operator="in" result="shade" />
          {/* A faint tint, so the glass reads as a surface. */}
          <feFlood floodColor="#fff6e0" floodOpacity="0.07" />
          <feComposite in2="SourceAlpha" operator="in" result="tint" />
          <feMerge>
            <feMergeNode in="tint" />
            <feMergeNode in="shade" />
            <feMergeNode in="highlight" />
            <feMergeNode in="lit" />
          </feMerge>
        </filter>
      </defs>
      <path d={arrowhead()} filter="url(#chevron-glass)" />
    </svg>
  )
}

/**
 * The top of the page: a night landscape in two layers, the sky and the ridges, with embers rising behind the copy. A
 * chevron near the bottom scrolls down to the section whose id is `next`.
 */
export default function Hero({ children, next }: { children: ReactNode; next: string }) {
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
      <Button className="scroll-cue" aria-label="Scroll down to the two routines" onPress={() => scrollDownTo(document.getElementById(next)!)}>
        <Chevron />
      </Button>
    </header>
  )
}
