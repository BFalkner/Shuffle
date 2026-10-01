import { useEffect, useRef, useState, type AnimationEvent, type ReactNode } from 'react'
import { Button } from 'react-aria-components'
import Embers from './Embers'
import Landscape, { type Palette } from './Landscape'
import { BACK_EMBERS, SPEED, onScrollFrame, startHeroParallax } from './parallax'

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
 * to the notch above it. The front point and the notch sit half the arms' thickness either side of the front's middle,
 * measured upright, so the arms are CHEVRON_WIDTH thick across.
 */
function arrowhead() {
  const { left, front, right } = CHEVRON
  const slope = Math.atan2(front.y - left.y, front.x - left.x)
  const half = CHEVRON_WIDTH / 2 / Math.cos(slope)
  const point = `${front.x},${(front.y + half).toFixed(2)}`
  const notch = `${front.x},${(front.y - half).toFixed(2)}`
  const tips = { left: `${left.x},${left.y}`, right: `${right.x},${right.y}` }
  return {
    outline: `M${tips.left} L${point} L${tips.right} L${notch} Z`,
    /** the two outer edges, from the tips to the front point */
    front: `M${tips.left} L${point} L${tips.right}`,
  }
}

/**
 * A clear glass chevron pointing down, shaped like an arrowhead: thickest at the front and sharp at both tips. Nothing
 * fills it, so the background shows through clearly. A thin pale line marks its outline, and the front edge, the two
 * outer edges that meet at the point, is brighter and thicker, with a soft glow under it. A faint second line just
 * inside the front edge is the far side of the glass.
 */
function Chevron() {
  const { outline, front } = arrowhead()
  return (
    <svg viewBox="0 0 120 44" aria-hidden="true">
      <defs>
        <clipPath id="chevron-inside">
          <path d={outline} />
        </clipPath>
        <filter id="chevron-soft" x="-10%" y="-40%" width="120%" height="180%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      <g fill="none" strokeLinejoin="miter" strokeLinecap="round">
        <path d={front} stroke="rgba(255, 214, 150, 0.45)" strokeWidth="4" filter="url(#chevron-soft)" />
        <path d={front} stroke="rgba(255, 246, 226, 0.35)" strokeWidth="1" transform="translate(0 -2.6)" clipPath="url(#chevron-inside)" />
        <path d={outline} stroke="rgba(255, 246, 226, 0.6)" strokeWidth="0.9" />
        <path d={front} stroke="#fffaf0" strokeWidth="1.7" />
      </g>
    </svg>
  )
}

/**
 * `showing` near the bottom of the screen; `landing` while it plays its exit on the heading; `gone` once that is over,
 * for as long as the page is open.
 */
type CueState = 'showing' | 'landing' | 'gone'

/**
 * The chevron that scrolls down to the section whose id is `next`. It stays near the bottom of the screen as the page
 * scrolls, past the hero, until the middle of the section's heading comes up to it. Then it lets go of the screen and
 * stays on the heading, moving with the page, while a quick flash of light swallows it and the heading glows for a
 * moment. So the flash goes off on the heading however far the page keeps scrolling. After that it doesn't come back,
 * even if the page scrolls back up. If the heading is already above it when the page loads, as on a tall screen, it
 * starts gone, and with reduced motion it goes without the show.
 */
function ScrollCue({ next }: { next: string }) {
  const dock = useRef<HTMLDivElement>(null)
  // The state is read in the scroll handler as well as rendered, so it is kept in a ref too.
  const phase = useRef<CueState>('showing')
  const [state, setState] = useState<CueState>('showing')
  const move = (to: CueState) => {
    phase.current = to
    setState(to)
  }
  useEffect(() => {
    const section = document.getElementById(next)!
    const heading = section.querySelector('h2') ?? section
    const middle = (box: DOMRect) => box.top + box.height / 2
    let firstFrame = true
    const stop = onScrollFrame(() => {
      const element = dock.current!
      // Where the dock sits on the screen when it isn't on the heading.
      element.style.transform = ''
      const resting = middle(element.getBoundingClientRect())
      const headingMiddle = middle(heading.getBoundingClientRect())
      const reached = headingMiddle <= resting
      if (phase.current === 'showing' && reached) move(firstFrame || reducedMotion() ? 'gone' : 'landing')
      // While it lands, it stays on the heading's middle line, moving with the page.
      if (phase.current === 'landing') element.style.transform = `translateY(${(headingMiddle - resting).toFixed(1)}px)`
      firstFrame = false
    })
    return stop
  }, [next])
  // The flash lights the heading as it goes off. The class comes off when the glow is over, so the next flash can light
  // it again.
  useEffect(() => {
    if (state !== 'landing') return
    const heading = document.getElementById(next)!.querySelector('h2')
    if (!heading) return
    heading.classList.add('lit')
    const done = () => heading.classList.remove('lit')
    heading.addEventListener('animationend', done, { once: true })
  }, [state, next])
  const landed = (event: AnimationEvent) => {
    if (event.animationName === 'cue-flash') move('gone')
  }

  return (
    <div className="scroll-cue-dock" ref={dock} data-state={state} onAnimationEnd={landed}>
      <Button className="scroll-cue" aria-label="Scroll down to the two routines" isDisabled={state !== 'showing'} onPress={() => scrollDownTo(document.getElementById(next)!)}>
        <Chevron />
      </Button>
    </div>
  )
}

/**
 * The top of the page: a night landscape in two layers, the sky and the ridges, with embers rising behind the copy. A
 * chevron near the bottom of the screen scrolls down to the section whose id is `next`.
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
      <ScrollCue next={next} />
    </header>
  )
}
