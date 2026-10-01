// Parallax on the home page: each layer moves with the page at its own speed, so the slower ones look farther away.
//
// Where the browser has scroll-driven animations, each layer's movement is an animation tied to the scroll. The
// compositor runs it in step with the scroll itself, so the layers hold still relative to each other even while the
// page's own thread is busy. Elsewhere, script moves the layers once a frame after each scroll, which trails the
// scroll by a frame or more on a phone.

/**
 * How far each layer moves for each pixel the page scrolls: 1 moves with the content, 0 stays still. From back to
 * front: the sky, the ridges, the campfire and the content. The embers work out their own.
 */
export const SPEED = {
  sky: 0.1,
  ridges: 0.3,
  campfire: 0.85,
  content: 1,
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** The speed a layer gets: with reduced motion, every layer moves with the content. */
export const layerSpeed = (speed: number) => (reducedMotion() ? 1 : speed)

/** Whether the browser can tie animations to the scroll. */
const scrollDriven = () => typeof ScrollTimeline === 'function' && typeof ViewTimeline === 'function'

/** The page's scroll from top to bottom, for the layers' animations. */
const pageScroll = () => new ScrollTimeline({ source: document.documentElement })

const lift = (y: number) => ({ transform: `translate3d(0,${y.toFixed(1)}px,0)` })

/** How far the page can scroll, px. */
const scrollRange = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight)

/**
 * Keeps an animation of `layer` against the page's scroll, with keyframes from `keyframes`, which are worked out again
 * whenever the page changes size. Returns a function that stops it.
 */
function followScroll(layer: HTMLElement, keyframes: () => Keyframe[]): () => void {
  const animation = layer.animate(keyframes(), { timeline: pageScroll(), fill: 'both', easing: 'linear' })
  const refit = () => (animation.effect as KeyframeEffect).setKeyframes(keyframes())
  const resize = new ResizeObserver(refit)
  resize.observe(document.documentElement)
  window.addEventListener('resize', refit)
  return () => {
    resize.disconnect()
    window.removeEventListener('resize', refit)
    animation.cancel()
  }
}

/** Runs `update` now, then once per frame while the page scrolls or resizes. Returns a function that stops it. */
export function onScrollFrame(update: () => void): () => void {
  let frame = 0
  const schedule = () => {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      update()
    })
  }
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
  update()
  return () => {
    cancelAnimationFrame(frame)
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
  }
}

/**
 * One layer of the night behind the sections below the hero. `strip` holds one panel per section of `world` and one
 * for its footer, in the same order, and slides at `speed`.
 *
 * A slower layer travels less, so the strip is shorter than the sections. It has to cover the screen from the moment
 * the world's top edge comes up from the bottom of the screen until its bottom edge reaches the bottom of the screen,
 * which takes one screen plus `speed` of the world's height. Each panel gets that share of its section's height.
 */
export function startBackdropParallax(world: HTMLElement, strip: HTMLElement, speed: number): () => void {
  const layer = layerSpeed(speed)
  const sections = Array.from(world.querySelectorAll<HTMLElement>(':scope > section, :scope > footer'))
  const panels = Array.from(strip.children) as HTMLElement[]

  const size = () => {
    const worldHeight = world.offsetHeight
    const scale = (window.innerHeight * (1 - layer) + worldHeight * layer) / worldHeight
    sections.forEach((section, index) => (panels[index].style.height = `${(section.offsetHeight * scale).toFixed(1)}px`))
  }
  // The strip's top sits at `layer` of the world's distance from the top of the screen, so the strip moves `layer` px
  // for each px the world does.
  const place = () => {
    const top = world.getBoundingClientRect().top
    strip.style.transform = `translate3d(0,${(top * (layer - 1)).toFixed(1)}px,0)`
  }

  const resize = new ResizeObserver(size)
  resize.observe(world)
  window.addEventListener('resize', size)
  size()
  // The same movement as `place`, from the top of the page to the bottom: (1 - layer) px down for each px scrolled,
  // starting from 0 when the world's top reaches the top of the screen.
  const stop = scrollDriven()
    ? followScroll(strip, () => {
        const worldTop = world.getBoundingClientRect().top + window.scrollY
        return [lift((1 - layer) * -worldTop), lift((1 - layer) * (scrollRange() - worldTop))]
      })
    : onScrollFrame(place)
  return () => {
    stop()
    resize.disconnect()
    window.removeEventListener('resize', size)
  }
}

/** Slides one layer of the hero's scene down as the page scrolls past it, so the layer moves at `speed`. */
export function startHeroParallax(scene: HTMLElement, speed: number): () => void {
  const layer = layerSpeed(speed)
  const hero = scene.parentElement!
  if (scrollDriven()) {
    // From the hero's top reaching the top of the screen to its bottom doing so. The scene fills the hero, so a
    // percentage of the scene's height is the same share of the hero's.
    const animation = scene.animate([{ transform: 'translate3d(0,0,0)' }, { transform: `translate3d(0,${(100 * (1 - layer)).toFixed(1)}%,0)` }], {
      timeline: new ViewTimeline({ subject: hero }),
      rangeStart: 'exit-crossing 0%',
      rangeEnd: 'exit-crossing 100%',
      fill: 'both',
      easing: 'linear',
    })
    return () => animation.cancel()
  }
  return onScrollFrame(() => {
    const scrolled = Math.min(Math.max(-hero.getBoundingClientRect().top, 0), hero.offsetHeight)
    scene.style.transform = `translate3d(0,${(scrolled * (1 - layer)).toFixed(1)}px,0)`
  })
}

/**
 * A layer in `footer`, the last thing on the page, that comes to rest where it is drawn once the page is scrolled to
 * the bottom, and moves at `speed` on the way there. Before then it sits higher than its rest, by (1 - speed) of the
 * distance the footer still has to come up, so it sinks into place as the footer rises. Its foot is lifted with it,
 * but stays below the bottom of the screen until the page reaches the bottom, where the lift is gone.
 */
export function startFooterParallax(layer: HTMLElement, footer: HTMLElement, speed: number): () => void {
  const lag = 1 - layerSpeed(speed)
  if (scrollDriven())
    return followScroll(layer, () => {
      // The scroll at which the footer's bottom reaches the bottom of the screen. Before it, the lift shrinks by `lag`
      // px for each px scrolled; after it, there is none.
      const range = scrollRange()
      const rest = footer.getBoundingClientRect().bottom + window.scrollY - window.innerHeight
      const keyframes: Keyframe[] = [{ ...lift(-lag * Math.max(0, rest)), offset: 0 }]
      if (rest > 0 && rest < range) keyframes.push({ ...lift(0), offset: rest / range })
      keyframes.push({ ...lift(-lag * Math.max(0, rest - range)), offset: 1 })
      return keyframes
    })
  return onScrollFrame(() => {
    const footerHeight = footer.offsetHeight
    // Where the footer's top is when the page is scrolled to the bottom.
    const rest = window.innerHeight - footerHeight
    const lift = lag * Math.max(0, footer.getBoundingClientRect().top - rest)
    layer.style.transform = `translate3d(0,${(-lift).toFixed(1)}px,0)`
  })
}
