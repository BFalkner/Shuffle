// Parallax on the home page: each layer moves with the page at its own speed, so the slower ones look farther away.

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
 * A layer in `footer`, the last thing on the page, that comes to rest where it is drawn once the page is scrolled to
 * the bottom, and moves at `speed` on the way there. Before then it sits higher than its rest, by (1 - speed) of the
 * distance the footer still has to come up, so it sinks into place as the footer rises. Its foot is lifted with it,
 * but stays below the bottom of the screen until the page reaches the bottom, where the lift is gone.
 */
export function startFooterParallax(layer: HTMLElement, footer: HTMLElement, speed: number): () => void {
  const lag = 1 - layerSpeed(speed)
  return onScrollFrame(() => {
    const footerHeight = footer.offsetHeight
    // Where the footer's top is when the page is scrolled to the bottom.
    const rest = window.innerHeight - footerHeight
    const lift = lag * Math.max(0, footer.getBoundingClientRect().top - rest)
    layer.style.transform = `translate3d(0,${(-lift).toFixed(1)}px,0)`
  })
}
