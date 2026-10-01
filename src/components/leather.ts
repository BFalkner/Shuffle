// A leather texture for card backs, fine like the grain of a leather-bound book, and lit: its crinkles catch the
// light and cast short shadows away from it. It's drawn once, on first use, into a tileable grey image meant to be
// laid over a card's colour with soft-light blending. There, 50% grey leaves the colour as it is, lighter grey lifts
// it and darker grey deepens it, so the texture never changes which colour a card reads as.
//
// Drawing it is a hot path: every pixel needs nine cell distances, two noise sums and a shadow trace. At 384 px
// square, written with array chains, it took 2.0 to 2.1s in Chrome, because every pixel built and sorted small arrays.
// The per-pixel steps below are plain loops that allocate nothing, and gave the same image, byte for byte, in 0.35 to
// 0.54s. The texture is now 256 px square, and MiniDeck draws it once the browser is idle.

/** the texture's side, device px; it tiles */
export const LEATHER_SIZE = 256
/** how many device px the texture spends on each CSS px, so it stays sharp on a high-density screen */
export const LEATHER_DENSITY = 2

/** grain cells across the texture, each about 2.7 device px, so the grain is fine, like a book cover's */
const CELLS = 96
/** how deep the relief is, device px: how far a crinkle's floor sits below the grain around it */
const DEPTH = 1.4
/** how far a shadow is traced toward the light, device px; the relief is shallow, so its shadows are short */
const SHADOW_REACH = 4

const wrap = (value: number, period: number) => ((value % period) + period) % period
const smoothstep = (low: number, high: number, value: number) => {
  const amount = Math.min(1, Math.max(0, (value - low) / (high - low)))
  return amount * amount * (3 - 2 * amount)
}

/** a repeatable random number in [0, 1) for a lattice point */
function hash(x: number, y: number, seed: number): number {
  let mixed = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1274126177)
  mixed = Math.imul(mixed ^ (mixed >>> 13), 1103515245)
  return ((mixed ^ (mixed >>> 16)) >>> 0) / 4294967296
}

/**
 * smooth value noise in [0, 1) that repeats every `period` lattice units. Its four corners are read one by one, so it
 * allocates nothing.
 */
function valueNoise(x: number, y: number, period: number, seed: number): number {
  const left = Math.floor(x)
  const top = Math.floor(y)
  const across = smoothstep(0, 1, x - left)
  const down = smoothstep(0, 1, y - top)
  const right = wrap(left + 1, period)
  const bottom = wrap(top + 1, period)
  const topLeft = hash(wrap(left, period), wrap(top, period), seed)
  const topRight = hash(right, wrap(top, period), seed)
  const bottomLeft = hash(wrap(left, period), bottom, seed)
  const bottomRight = hash(right, bottom, seed)
  const upper = topLeft + (topRight - topLeft) * across
  const lower = bottomLeft + (bottomRight - bottomLeft) * across
  return upper + (lower - upper) * down
}

/** the octaves the fractal noise sums: each twice as fine and half as strong as the last */
const OCTAVES = [1, 2, 4]
const OCTAVE_WEIGHT = OCTAVES.reduce((sum, scale) => sum + 1 / scale, 0)

/** value noise summed over OCTAVES, in [0, 1). A loop, because it runs twice for every pixel. */
function fractalNoise(x: number, y: number, period: number, seed: number): number {
  let total = 0
  for (const scale of OCTAVES) total += valueNoise(x * scale, y * scale, period * scale, seed + scale) / scale
  return total / OCTAVE_WEIGHT
}

/** the nearest and second-nearest distances `cellular` found last; reused, so a pixel allocates nothing */
const found = { nearest: 0, second: 0 }

/**
 * Cellular noise: the distances, in cell units, from (x, y) to the nearest and the second-nearest of one jittered
 * point per cell. Where the two are close, the point is near a border between cells. A loop over the nine cells
 * around (x, y), keeping only the two smallest distances, because it runs for every pixel.
 */
function cellular(x: number, y: number): typeof found {
  const cellX = Math.floor(x)
  const cellY = Math.floor(y)
  found.nearest = Infinity
  found.second = Infinity
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const pointCellX = cellX + dx
      const pointCellY = cellY + dy
      const pointX = pointCellX + hash(wrap(pointCellX, CELLS), wrap(pointCellY, CELLS), 11)
      const pointY = pointCellY + hash(wrap(pointCellX, CELLS), wrap(pointCellY, CELLS), 23)
      // Math.sqrt rather than Math.hypot, which is several times slower in V8.
      const distance = Math.sqrt((pointX - x) * (pointX - x) + (pointY - y) * (pointY - y))
      if (distance < found.nearest) {
        found.second = found.nearest
        found.nearest = distance
      } else if (distance < found.second) found.second = distance
    }
  }
  return found
}

/**
 * The leather's height at a pixel, roughly 0 to 1: a fine pebbled grain, each tiny cell softly domed with shallow
 * seams between them; thin crinkle lines across it, along the ridges of finer noise, as on a pebble-grain book cover;
 * and a gentle broad mottle.
 */
function heightAt(x: number, y: number): number {
  const { nearest, second } = cellular((x / LEATHER_SIZE) * CELLS, (y / LEATHER_SIZE) * CELLS)
  const pebble = 0.5 * (1 - Math.min(1, nearest * nearest)) + 0.5 * smoothstep(0, 0.35, second - nearest)
  const ridges = 1 - Math.abs(2 * fractalNoise((x / LEATHER_SIZE) * 20, (y / LEATHER_SIZE) * 20, 20, 7) - 1)
  const crinkle = smoothstep(0.9, 0.985, ridges)
  const mottle = fractalNoise((x / LEATHER_SIZE) * 3, (y / LEATHER_SIZE) * 3, 3, 3)
  return 0.4 * pebble + 0.35 * mottle - 0.45 * crinkle
}

/**
 * The texture lit from `lightFrom` degrees clockwise from the top of the screen and `elevation` degrees above the
 * card, as a PNG data URL. Each pixel is grey: 50% where the leather is flat, lighter where a slope faces the light or
 * the grain catches a glint, darker where a slope faces away or a crease is in shadow.
 */
function drawLeather(lightFrom: number, elevation: number): string {
  const heights = Float32Array.from({ length: LEATHER_SIZE * LEATHER_SIZE }, (_, index) => heightAt(index % LEATHER_SIZE, Math.floor(index / LEATHER_SIZE)))
  const heightOf = (x: number, y: number) => heights[wrap(Math.round(y), LEATHER_SIZE) * LEATHER_SIZE + wrap(Math.round(x), LEATHER_SIZE)]

  const azimuth = (lightFrom * Math.PI) / 180
  const rise = (elevation * Math.PI) / 180
  // Toward the light across the screen, where y grows downward, and the light's direction in 3D.
  const toward = { x: Math.sin(azimuth), y: -Math.cos(azimuth) }
  const light = { x: toward.x * Math.cos(rise), y: toward.y * Math.cos(rise), z: Math.sin(rise) }
  const half = (() => {
    const z = light.z + 1
    const length = Math.hypot(light.x, light.y, z)
    return { x: light.x / length, y: light.y / length, z: z / length }
  })()
  const climb = Math.tan(rise)

  // How far the leather rises above the line from (x, y) to the light, at its highest within SHADOW_REACH; above 0,
  // (x, y) is in shadow. A loop, because it runs for every pixel.
  const blockedAt = (x: number, y: number, height: number) => {
    let most = 0
    for (let step = 1; step <= SHADOW_REACH; step++) {
      most = Math.max(most, (heightOf(x + toward.x * step, y + toward.y * step) - height) * DEPTH - step * climb)
    }
    return most
  }

  const greys = Uint8ClampedArray.from({ length: LEATHER_SIZE * LEATHER_SIZE }, (_, index) => {
    const x = index % LEATHER_SIZE
    const y = Math.floor(index / LEATHER_SIZE)
    const height = heights[index]
    // The surface's slope, from its neighbours, and the normal it gives.
    const slopeX = ((heightOf(x + 1, y) - heightOf(x - 1, y)) / 2) * DEPTH
    const slopeY = ((heightOf(x, y + 1) - heightOf(x, y - 1)) / 2) * DEPTH
    const length = Math.sqrt(slopeX * slopeX + slopeY * slopeY + 1)
    const normal = { x: -slopeX / length, y: -slopeY / length, z: 1 / length }
    const facing = normal.x * light.x + normal.y * light.y + normal.z * light.z
    const glint = Math.max(0, normal.x * half.x + normal.y * half.y + normal.z * half.z) ** 30
    const shadow = Math.min(1, blockedAt(x, y, height) / DEPTH)
    const grey = 0.5 + (facing - light.z) * 0.8 - 0.16 * shadow + 0.13 * glint
    return Math.round(Math.min(1, Math.max(0, grey)) * 255)
  })

  const canvas = document.createElement('canvas')
  canvas.width = LEATHER_SIZE
  canvas.height = LEATHER_SIZE
  const context = canvas.getContext('2d')!
  const image = context.createImageData(LEATHER_SIZE, LEATHER_SIZE)
  // Written straight into the pixels, because an array for each of them would cost as much as drawing it.
  for (let index = 0; index < greys.length; index++) {
    image.data[index * 4] = greys[index]
    image.data[index * 4 + 1] = greys[index]
    image.data[index * 4 + 2] = greys[index]
    image.data[index * 4 + 3] = 255
  }
  context.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png')
}

const drawn = new Map<string, string>()

/** The lit leather texture as a PNG data URL, drawn the first time it's asked for with this light and kept after. */
export function leatherTexture(lightFrom: number, elevation: number): string {
  const key = `${lightFrom},${elevation}`
  if (!drawn.has(key)) drawn.set(key, drawLeather(lightFrom, elevation))
  return drawn.get(key)!
}
