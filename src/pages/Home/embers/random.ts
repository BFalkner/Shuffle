// Seeded random numbers and smooth noise, so every ember can be worked out again at any moment without keeping state.

/** A repeatable random number in [0, 1) for the pair (a, b). */
export function hash(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35)
  h ^= h >>> 13
  h = Math.imul(h, 0x27d4eb2f)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** A repeatable stream of random numbers in [0, 1). */
export function stream(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A normally distributed number, mean 0 and spread 1, from a stream. */
export const gaussian = (next: () => number) => Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next())

/** Smooth random noise in [-1, 1]: random values at whole numbers of x, eased between. It never repeats. */
export function noise(id: number, x: number): number {
  const i = Math.floor(x)
  const f = x - i
  const a = hash(id, i) * 2 - 1
  const b = hash(id, i + 1) * 2 - 1
  return a + (b - a) * f * f * (3 - 2 * f)
}
