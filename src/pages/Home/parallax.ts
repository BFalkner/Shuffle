// Parallax on the home page: each layer moves with the page at its own speed, so the slower ones look farther away.

/**
 * How far each layer moves for each pixel the page scrolls: 1 moves with the content, 0 stays still. From back to
 * front: the sky, the ridges, three sizes of ember, the content, and a few large embers in front of it all.
 */
export const SPEED = {
  sky: 0.1,
  ridges: 0.3,
  smallEmbers: 0.5,
  mediumEmbers: 0.7,
  largeEmbers: 0.85,
  content: 1,
  foreground: 1.3,
}

/** One band of embers: how many of the canvas's sparks it gets, and how they look and move. */
export interface EmberBand {
  /** the band's share of the canvas's sparks, out of 1 */
  share: number
  /** the sparks' smallest and largest radius, px */
  size: [number, number]
  scrollSpeed: number
  /** how far the glow reaches, in radii */
  glow: number
  /**
   * where the bright core gives way to the glow, as a fraction of its reach. An ember in focus has a small core; an
   * ember out of focus, too near or too far, is a soft disc.
   */
  core: number
  /** the brightest the spark gets, out of 1 */
  brightness: number
}

const SMALL: EmberBand = { share: 0.5, size: [0.5, 0.9], scrollSpeed: SPEED.smallEmbers, glow: 3.5, core: 0.3, brightness: 0.7 }
const MEDIUM: EmberBand = { share: 0.33, size: [1.3, 2], scrollSpeed: SPEED.mediumEmbers, glow: 4, core: 0.3, brightness: 0.9 }
const LARGE: EmberBand = { share: 0.17, size: [2.8, 4], scrollSpeed: SPEED.largeEmbers, glow: 3, core: 0.55, brightness: 0.7 }
const NEAR: EmberBand = { share: 1, size: [7, 11], scrollSpeed: SPEED.foreground, glow: 2.2, core: 0.7, brightness: 0.28 }

/** The embers behind the content, in three sizes, the larger ones nearer. */
export const BACK_EMBERS = [SMALL, MEDIUM, LARGE]
/** A few large, soft embers in front of the content, nearer still. */
export const FRONT_EMBERS = [NEAR]

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** The speed a layer gets: with reduced motion, every layer moves with the content. */
export const layerSpeed = (speed: number) => (reducedMotion() ? 1 : speed)

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
 * One layer of the night behind the sections below the hero. `strip` holds one panel per section of `world`, in the
 * same order, and slides at `speed`.
 *
 * A slower layer travels less, so the strip is shorter than the sections. It has to cover the screen from the moment
 * the world's top edge comes up from the bottom of the screen until its bottom edge reaches the bottom of the screen,
 * which takes one screen plus `speed` of the world's height. Each panel gets that share of its section's height.
 */
export function startBackdropParallax(world: HTMLElement, strip: HTMLElement, speed: number): () => void {
  const layer = layerSpeed(speed)
  const sections = Array.from(world.querySelectorAll<HTMLElement>(':scope > section'))
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
  const stop = onScrollFrame(place)
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
  return onScrollFrame(() => {
    const scrolled = Math.min(Math.max(-hero.getBoundingClientRect().top, 0), hero.offsetHeight)
    scene.style.transform = `translate3d(0,${(scrolled * (1 - layer)).toFixed(1)}px,0)`
  })
}

/**
 * A layer that comes to rest on top of `footer` once the page is scrolled to the bottom, and moves at `speed` on the
 * way there. Before then it sits higher than its rest, by (1 - speed) of the distance the footer still has to come
 * up, so it sinks onto the footer as the footer rises. The layer reaches down behind the footer by at least the most
 * it is ever lifted while the footer is in view, so its foot never shows.
 */
export function startFooterParallax(layer: HTMLElement, footer: HTMLElement, speed: number): () => void {
  const lag = 1 - layerSpeed(speed)
  return onScrollFrame(() => {
    const footerHeight = footer.offsetHeight
    // Where the footer's top is when the page is scrolled to the bottom.
    const rest = window.innerHeight - footerHeight
    const lift = lag * Math.max(0, footer.getBoundingClientRect().top - rest)
    layer.style.setProperty('--reach', `${(lag * footerHeight + 24).toFixed(0)}px`)
    layer.style.transform = `translate3d(0,${(-lift).toFixed(1)}px,0)`
  })
}
