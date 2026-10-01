import { useEffect, useRef } from 'react'
import { SPEED, type EmberBand } from './parallax'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** how far off the canvas a spark goes before it comes back at the other edge, px */
const EDGE = 10
/**
 * Sparks drifting up from the bottom of the canvas, `count` of them at a time, shared out among `bands`. Stops when
 * the canvas is off screen or motion is reduced.
 *
 * Each band is a layer: its sparks move its `scrollSpeed` of the scroll, and rise faster the nearer the layer is. That
 * holds whether the canvas itself scrolls with the page or stays put on the screen, because each frame takes out
 * however far the canvas moved.
 */
export default function Embers({ count, bands, className }: { count: number; bands: EmberBand[]; className: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current!
    if (reducedMotion()) return
    const context = canvas.getContext('2d')!
    const scale = Math.min(2, window.devicePixelRatio || 1)
    let width = 0
    let height = 0
    const resize = () => {
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = width * scale
      canvas.height = height * scale
      context.setTransform(scale, 0, 0, scale, 0, 0)
    }
    resize()
    /** `speed`: how fast it rises, px a frame */
    type Spark = { band: EmberBand; x: number; y: number; speed: number; size: number; phase: number; life: number }
    // A spark keeps its band when it comes back, so each band keeps its share.
    const spawn = (band: EmberBand): Spark => ({
      band,
      x: Math.random() * width,
      y: Math.random() * height,
      speed: (0.25 + Math.random() * 0.8) * (band.scrollSpeed / SPEED.mediumEmbers),
      size: band.size[0] + Math.random() * (band.size[1] - band.size[0]),
      phase: Math.random() * Math.PI * 2,
      life: 0.4 + Math.random() * 0.6,
    })
    const sparks = bands.flatMap((band) => Array.from({ length: Math.round(count * band.share) }, () => spawn(band)))
    // Where the page and the canvas were on the last frame.
    let lastScroll = 0
    let lastTop = 0
    const remember = () => {
      lastScroll = window.scrollY
      lastTop = canvas.getBoundingClientRect().top
    }
    let frame = 0
    let running = false
    const draw = (time: number) => {
      const scrolled = window.scrollY - lastScroll
      const canvasMoved = canvas.getBoundingClientRect().top - lastTop
      remember()
      // A jump of more than a screen, such as following a link down the page, deals the sparks out afresh.
      if (Math.abs(scrolled) > height) sparks.forEach((spark) => Object.assign(spark, spawn(spark.band)))
      context.clearRect(0, 0, width, height)
      context.globalCompositeOperation = 'lighter'
      for (const spark of sparks) {
        // On the screen the spark moves its band's scrollSpeed of the scroll. In the canvas, that is less however far the
        // canvas moved.
        spark.y -= spark.speed + scrolled * spark.band.scrollSpeed + canvasMoved
        spark.x += Math.sin(time / 900 + spark.phase) * 0.35
        const fade = Math.max(0, Math.min(1, spark.y / height)) * spark.life
        // A spark that leaves one edge comes back as a new spark at the other, as far past it as it went past the first.
        // Many sparks can leave in one scroll, and this keeps them spread out instead of all starting on one line.
        if (spark.y < -EDGE || spark.y > height + EDGE) {
          const span = height + 2 * EDGE
          Object.assign(spark, spawn(spark.band), { y: ((((spark.y + EDGE) % span) + span) % span) - EDGE })
        }
        const { glow, core, brightness } = spark.band
        const reach = spark.size * glow
        const light = fade * brightness
        const gradient = context.createRadialGradient(spark.x, spark.y, 0, spark.x, spark.y, reach)
        gradient.addColorStop(0, `rgba(255, 214, 150, ${light})`)
        gradient.addColorStop(core, `rgba(255, 150, 60, ${light * 0.5})`)
        gradient.addColorStop(1, 'rgba(255, 120, 40, 0)')
        context.fillStyle = gradient
        context.fillRect(spark.x - reach, spark.y - reach, reach * 2, reach * 2)
      }
      frame = requestAnimationFrame(draw)
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true
        remember()
        frame = requestAnimationFrame(draw)
      } else if (!entry.isIntersecting && running) {
        running = false
        cancelAnimationFrame(frame)
      }
    })
    observer.observe(canvas)
    window.addEventListener('resize', resize)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [count, bands])
  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
