import { toRad } from '../lib/mathfmt'
import type { Vec } from '../diagram/geom'
import type { Rng } from '../lib/rng'

/** Triangle with angle A at the origin, B on the positive x-axis, given angles (deg) at A and B. */
export function triangleFromAngles(A: number, B: number, base = 5): { A: Vec; B: Vec; C: Vec; a: number; b: number; c: number } {
  const C = 180 - A - B
  const c = base
  const b = (c * Math.sin(toRad(B))) / Math.sin(toRad(C))
  const a = (c * Math.sin(toRad(A))) / Math.sin(toRad(C))
  return {
    A: { x: 0, y: 0 },
    B: { x: c, y: 0 },
    C: { x: b * Math.cos(toRad(A)), y: b * Math.sin(toRad(A)) },
    a,
    b,
    c,
  }
}

/** Triangle from three side lengths a = BC, b = CA, c = AB. */
export function triangleFromSides(a: number, b: number, c: number): { A: Vec; B: Vec; C: Vec } {
  const cosA = (b * b + c * c - a * a) / (2 * b * c)
  const angA = Math.acos(Math.max(-1, Math.min(1, cosA)))
  return {
    A: { x: 0, y: 0 },
    B: { x: c, y: 0 },
    C: { x: b * Math.cos(angA), y: b * Math.sin(angA) },
  }
}

/** Rotate a point about the origin by deg. */
export function rot(p: Vec, deg: number, about: Vec = { x: 0, y: 0 }): Vec {
  const r = toRad(deg)
  const x = p.x - about.x
  const y = p.y - about.y
  return { x: about.x + x * Math.cos(r) - y * Math.sin(r), y: about.y + x * Math.sin(r) + y * Math.cos(r) }
}

/** Random three angles of a triangle (integers, each in [min, max]). */
export function triangleAngles(rng: Rng, min = 30, max = 100): [number, number, number] {
  for (;;) {
    const A = rng.int(min, max)
    const B = rng.int(min, max)
    const C = 180 - A - B
    if (C >= min && C <= max) return [A, B, C]
  }
}

/** Pythagorean triples (primitive, scaled later). */
export const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [9, 40, 41],
]

/** "nearest tenth" style phrase. */
export const PLACE_NAMES: Record<number, string> = { 0: 'whole number', 1: 'tenth', 2: 'hundredth' }

/** Ordinals like "1st". */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
