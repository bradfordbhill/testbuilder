// Small seeded random number generator so generated problems are reproducible.

export interface Rng {
  /** Float in [0, 1). */
  next(): number
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number
  /** Integer in [min, max] inclusive, excluding values in `except`. */
  intExcept(min: number, max: number, except: number[]): number
  pick<T>(items: readonly T[]): T
  shuffle<T>(items: readonly T[]): T[]
  bool(p?: number): boolean
  /** Random sign, ±1. */
  sign(): 1 | -1
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeRng(seed: number): Rng {
  const next = mulberry32(seed)
  const rng: Rng = {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1))
    },
    intExcept(min, max, except) {
      const options: number[] = []
      for (let i = min; i <= max; i++) if (!except.includes(i)) options.push(i)
      if (options.length === 0) throw new Error('intExcept: no options')
      return options[Math.floor(next() * options.length)]
    },
    pick(items) {
      return items[Math.floor(next() * items.length)]
    },
    shuffle(items) {
      const out = items.slice()
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[out[i], out[j]] = [out[j], out[i]]
      }
      return out
    },
    bool(p = 0.5) {
      return next() < p
    },
    sign() {
      return next() < 0.5 ? -1 : 1
    },
  }
  return rng
}

/** Deterministically mix a seed with other integers (e.g. version index). */
export function mixSeed(...parts: number[]): number {
  let h = 2166136261 >>> 0
  for (const p of parts) {
    h ^= p >>> 0
    h = Math.imul(h, 16777619) >>> 0
    h ^= h >>> 13
    h = Math.imul(h, 0x5bd1e995) >>> 0
    h ^= h >>> 15
  }
  return h >>> 0
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32) >>> 0
}
