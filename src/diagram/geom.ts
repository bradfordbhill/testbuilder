import type { Diagram, DPoint, Shape } from '../model/types'

export interface Vec {
  x: number
  y: number
}

export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y })
export const mul = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k })
export const len = (a: Vec): number => Math.hypot(a.x, a.y)
export const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y)
export const norm = (a: Vec): Vec => {
  const l = len(a) || 1
  return { x: a.x / l, y: a.y / l }
}
export const perp = (a: Vec): Vec => ({ x: -a.y, y: a.x })
export const lerp = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
export const polar = (r: number, deg: number): Vec => ({
  x: r * Math.cos((deg * Math.PI) / 180),
  y: r * Math.sin((deg * Math.PI) / 180),
})
export const angleOf = (v: Vec): number => (Math.atan2(v.y, v.x) * 180) / Math.PI

/** Pixel transform for a diagram. */
export interface Frame {
  scale: number
  width: number
  height: number
  px: (p: Vec) => Vec
  world: (p: Vec) => Vec
}

export function frameOf(d: Diagram): Frame {
  const { xmin, xmax, ymin, ymax } = d.view
  const scale = d.width / (xmax - xmin)
  const height = (ymax - ymin) * scale
  return {
    scale,
    width: d.width,
    height,
    px: (p) => ({ x: (p.x - xmin) * scale, y: (ymax - p.y) * scale }),
    world: (p) => ({ x: p.x / scale + xmin, y: ymax - p.y / scale }),
  }
}

export function pointMap(d: Diagram): Map<string, DPoint> {
  return new Map(d.points.map((p) => [p.id, p]))
}

/** Ids of points a shape depends on. */
export function shapePointIds(s: Shape): string[] {
  switch (s.kind) {
    case 'segment':
    case 'line':
    case 'ray':
      return [s.a, s.b]
    case 'circle':
      return s.through ? [s.center, s.through] : [s.center]
    case 'arc':
      return [s.center, s.a, s.b]
    case 'angle':
      return [s.a, s.vertex, s.b]
    case 'polygon':
      return s.points
    case 'text':
      return []
  }
}

/**
 * Clip the infinite line through p in direction dir to a rectangle,
 * returning the parameter range [t0, t1].
 */
export function clipLine(p: Vec, dir: Vec, xmin: number, ymin: number, xmax: number, ymax: number): [number, number] | null {
  let t0 = -Infinity
  let t1 = Infinity
  const checks: [number, number, number][] = [
    [dir.x, xmin - p.x, xmax - p.x],
    [dir.y, ymin - p.y, ymax - p.y],
  ]
  for (const [d, lo, hi] of checks) {
    if (Math.abs(d) < 1e-12) {
      if (lo > 0 || hi < 0) return null
      continue
    }
    let a = lo / d
    let b = hi / d
    if (a > b) [a, b] = [b, a]
    t0 = Math.max(t0, a)
    t1 = Math.min(t1, b)
  }
  return t0 <= t1 ? [t0, t1] : null
}

/** Intersection of lines p1p2 and p3p4 (infinite lines). */
export function intersectLines(p1: Vec, p2: Vec, p3: Vec, p4: Vec): Vec | null {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x)
  if (Math.abs(d) < 1e-12) return null
  const a = p1.x * p2.y - p1.y * p2.x
  const b = p3.x * p4.y - p3.y * p4.x
  return {
    x: (a * (p3.x - p4.x) - (p1.x - p2.x) * b) / d,
    y: (a * (p3.y - p4.y) - (p1.y - p2.y) * b) / d,
  }
}

/** Foot of the perpendicular from p to line ab. */
export function foot(p: Vec, a: Vec, b: Vec): Vec {
  const ab = sub(b, a)
  const t = ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / (ab.x * ab.x + ab.y * ab.y)
  return lerp(a, b, t)
}

/** Fit the view to the visible points with a margin (world units). */
export function fitView(d: Diagram, marginFrac = 0.15): Diagram['view'] {
  const pts = d.points.filter((p) => !p.hidden)
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  for (const s of d.shapes) {
    if (s.kind === 'circle') {
      const c = d.points.find((p) => p.id === s.center)
      const t = s.through ? d.points.find((p) => p.id === s.through) : undefined
      const r = s.radius ?? (c && t ? dist(c, t) : 0)
      if (c) xs.push(c.x - r, c.x + r), ys.push(c.y - r, c.y + r)
    }
  }
  if (xs.length === 0) return d.view
  let xmin = Math.min(...xs)
  let xmax = Math.max(...xs)
  let ymin = Math.min(...ys)
  let ymax = Math.max(...ys)
  const w = Math.max(xmax - xmin, 1)
  const h = Math.max(ymax - ymin, 1)
  const m = Math.max(w, h) * marginFrac
  xmin -= m
  xmax += m
  ymin -= m
  ymax += m
  return { xmin, xmax, ymin, ymax }
}
