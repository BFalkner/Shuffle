import { useEffect, useRef } from 'react'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Sparks drifting up from the bottom of the canvas, `count` of them at a time. Stops when the canvas is off screen or
 * motion is reduced.
 */
export default function Embers({ count, className }: { count: number; className: string }) {
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
    type Spark = { x: number; y: number; speed: number; size: number; phase: number; life: number }
    const spawn = (anywhere: boolean): Spark => ({
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : height + 10,
      speed: 0.25 + Math.random() * 0.8,
      size: 0.6 + Math.random() * 1.8,
      phase: Math.random() * Math.PI * 2,
      life: 0.4 + Math.random() * 0.6,
    })
    const sparks = Array.from({ length: count }, () => spawn(true))
    let frame = 0
    let running = false
    const draw = (time: number) => {
      context.clearRect(0, 0, width, height)
      context.globalCompositeOperation = 'lighter'
      for (const spark of sparks) {
        spark.y -= spark.speed
        spark.x += Math.sin(time / 900 + spark.phase) * 0.35
        const fade = Math.max(0, Math.min(1, spark.y / height)) * spark.life
        if (spark.y < -10) Object.assign(spark, spawn(false))
        const glow = context.createRadialGradient(spark.x, spark.y, 0, spark.x, spark.y, spark.size * 4)
        glow.addColorStop(0, `rgba(255, 214, 150, ${fade})`)
        glow.addColorStop(0.3, `rgba(255, 150, 60, ${fade * 0.5})`)
        glow.addColorStop(1, 'rgba(255, 120, 40, 0)')
        context.fillStyle = glow
        context.fillRect(spark.x - spark.size * 4, spark.y - spark.size * 4, spark.size * 8, spark.size * 8)
      }
      frame = requestAnimationFrame(draw)
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true
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
  }, [count])
  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
