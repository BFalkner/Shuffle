// Drawing one ember: a bright point with no halo, a streak where it moves fast, and glare where it is bright.

import { heatAt, heatColour, type Ember } from './ember'
import { noise, stream } from './random'

/** An ember as it looks on the screen at one moment. */
export interface Sighting {
  ember: Ember
  age: number
  life: number
  /** its scale: 1 is the page's own distance */
  depth: number
  /** where it is on the screen, px */
  x: number
  y: number
  /** how fast it moves on the screen, px a second */
  vx: number
  vy: number
}

/** How the light is shown. */
export interface Look {
  /** how bright the screen shows the embers' light before it reaches white */
  exposure: number
  /** how strong the glare round a bright ember is; 0 turns it off */
  flare: number
}

/** How far a sighting's drawing reaches past its centre, px, so a canvas can skip the ones too far off its edges. */
export const REACH = 40

/** The glare sprite's drawn size, px. */
const GLARE_SIZE = 44

/**
 * Glare: the eye's or lens's own scatter round a bright light, as a soft bloom with fine radial streaks. One sprite for
 * each of 10 heats, from a fixed seed so every visit looks the same. Made the first time an ember needs one.
 */
let glare: HTMLCanvasElement[] | null = null
function makeGlare(): HTMLCanvasElement[] {
  const size = 128
  const half = size / 2
  const next = stream(20241)
  const bins = 1440
  const streak = new Float32Array(bins)
  const reachAt = new Float32Array(bins)
  for (let i = 0; i < 70; i++) {
    const at = next() * bins
    const width = 1.5 + 3.5 * next()
    const amp = Math.pow(next(), 2) * 0.9 + 0.1
    const reach = 0.25 + 0.75 * next()
    for (let d = -12; d <= 12; d++) {
      const k = (((Math.round(at) + d) % bins) + bins) % bins
      const w = Math.exp(-(d * d) / (width * width))
      streak[k] += amp * w
      reachAt[k] = Math.max(reachAt[k], reach * w)
    }
  }
  return Array.from({ length: 10 }, (_, n) => {
    const tint = heatColour(0.15 + (0.85 * n) / 9)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const context = canvas.getContext('2d')!
    const image = context.createImageData(size, size)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x + 0.5 - half) / half
        const dy = (y + 0.5 - half) / half
        const r = Math.hypot(dx, dy)
        if (r >= 1) continue
        const bin = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * bins) % bins
        const bloom = Math.pow(1 + (r / 0.035) ** 2, -1.3)
        const fade = (1 - r * r) ** 2
        const rays = streak[bin] * Math.exp(-r / (0.12 + 0.5 * reachAt[bin])) * Math.min(1, r / 0.04) * (0.8 + 0.4 * next())
        const intensity = Math.min(1, (0.55 * bloom + 0.35 * rays) * fade)
        const white = Math.min(1, intensity * 1.2) * 0.6
        const i = (y * size + x) * 4
        image.data[i] = Math.round(tint[0] + (255 - tint[0]) * white)
        image.data[i + 1] = Math.round(tint[1] + (255 - tint[1]) * white)
        image.data[i + 2] = Math.round(tint[2] + (255 - tint[2]) * white)
        image.data[i + 3] = Math.round(255 * intensity)
      }
    }
    context.putImageData(image, 0, 0)
    return canvas
  })
}

/** How the core's light falls off from its centre: a bell, so it has no visible edge. */
const FLOOR = Math.exp(-5)
const FALLOFF = Array.from({ length: 13 }, (_, i) => {
  const at = i / 12
  return [at, (Math.exp(-5 * at * at) - FLOOR) / (1 - FLOOR)] as const
})

/**
 * Draws one ember at (x, y) on `context`, which should add light ('lighter'). Its light is worked out from its own
 * size, heat and flicker, dimmed by the inverse square of its distance, then shared over the area it is drawn on, so a
 * streak spreads the same light thinner instead of adding more.
 */
export function drawEmber(context: CanvasRenderingContext2D, sighting: Sighting, x: number, y: number, time: number, look: Look) {
  const { ember, age, life, depth, vx, vy } = sighting
  const heat = heatAt(ember, age, life)
  if (heat < 0.03) return
  const [f1, f2, p1, p2] = ember.flick
  const flare = Math.max(0, noise(ember.id + 3e6, time * 2.5) - 0.75) * 2.8
  const flicker = 1 + 0.18 * Math.sin(time * f1 + p1) * Math.sin(time * f2 + p2) + 0.7 * flare
  const radius = ember.size * (0.75 + (0.25 * heat) / ember.heat0)
  const total = Math.PI * radius * radius * Math.pow(heat, 2.5) * flicker
  const received = total * depth * depth
  const core = Math.max(0.6, radius * depth)
  const speed = Math.hypot(vx, vy)
  const trail = Math.min(26, speed * 0.05)
  const area = Math.PI * core * core + (trail > core ? 2 * core * trail : 0)
  const light = Math.min(1, (look.exposure * received) / area)
  const [r, g, b] = heatColour(Math.min(1, heat + 0.12 * flare))

  if (trail > core) {
    const tx = x - (vx / speed) * trail
    const ty = y - (vy / speed) * trail
    const streak = context.createLinearGradient(x, y, tx, ty)
    streak.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${light * 0.85})`)
    streak.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
    context.strokeStyle = streak
    context.lineWidth = core * 1.5
    context.lineCap = 'round'
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(tx, ty)
    context.stroke()
  }

  // The core is whiter at its centre.
  const reach = core * 1.6
  const glow = context.createRadialGradient(x, y, 0, x, y, reach)
  const hot = [255, Math.min(255, g + 40), Math.min(255, b + 60)]
  const edge = [r, g, b]
  for (const [at, strength] of FALLOFF) {
    const mix = Math.min(1, at * 2.5)
    const c = hot.map((h, k) => Math.round(h + (edge[k] - h) * mix))
    glow.addColorStop(at, `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${light * strength})`)
  }
  context.fillStyle = glow
  context.fillRect(x - reach, y - reach, reach * 2, reach * 2)

  if (look.flare > 0) {
    const strength = Math.min(1, (look.flare * look.exposure * received) / 10)
    if (strength > 0.02) {
      glare ??= makeGlare()
      const sprite = glare[Math.min(glare.length - 1, Math.round(heat * (glare.length - 1)))]
      context.globalAlpha = strength
      context.drawImage(sprite, x - GLARE_SIZE / 2, y - GLARE_SIZE / 2, GLARE_SIZE, GLARE_SIZE)
      context.globalAlpha = 1
    }
  }
}
