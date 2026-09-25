// Seeded randomness and a short hash, for tests and generated data that must come out identical on every run.

/** Replace Math.random with a seeded generator (mulberry32), so every run draws the same numbers. */
export function seed(state: number): void {
  Math.random = () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a: a short, stable hash of some text. */
export function hash(text: string): string {
  let result = 0x811c9dc5
  for (let i = 0; i < text.length; i++) result = Math.imul(result ^ text.charCodeAt(i), 0x01000193)
  return (result >>> 0).toString(16).padStart(8, '0')
}
