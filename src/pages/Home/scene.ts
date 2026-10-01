// Painted-looking landscapes for the home page, drawn as SVG paths from a seed so they come out the same on every load.

/** mulberry32: a small seeded generator that leaves Math.random alone. */
export function rng(state: number): () => number {
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * A mountain ridge by midpoint displacement: heights across `width`, starting near `base` and wandering by up to
 * `amplitude`, with each halving of the step keeping `roughness` of the previous wander.
 */
export function ridge(random: () => number, width: number, height: number, base: number, amplitude: number, roughness = 0.52, depth = 7): string {
  const count = 2 ** depth
  const heights = new Array<number>(count + 1)
  heights[0] = base + (random() - 0.5) * amplitude
  heights[count] = base + (random() - 0.5) * amplitude
  let spread = amplitude
  for (let step = count; step > 1; step /= 2) {
    for (let start = 0; start < count; start += step) {
      const middle = start + step / 2
      heights[middle] = (heights[start] + heights[start + step]) / 2 + (random() - 0.5) * spread
    }
    spread *= roughness
  }
  let path = `M0,${height} `
  for (let index = 0; index <= count; index++) path += `L${((index / count) * width).toFixed(1)},${heights[index].toFixed(1)} `
  return `${path}L${width},${height} Z`
}

export interface Star {
  x: number
  y: number
  r: number
  opacity: number
}

export function stars(random: () => number, count: number, width: number, height: number): Star[] {
  const list: Star[] = []
  for (let index = 0; index < count; index++) {
    const big = random() < 0.08
    list.push({ x: random() * width, y: random() ** 1.6 * height, r: big ? 1.4 + random() : 0.4 + random() * 0.8, opacity: 0.25 + random() * 0.75 })
  }
  return list
}
