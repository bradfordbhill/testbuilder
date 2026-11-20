import { diagram } from '../diagram/build'
import { add, polar } from '../diagram/geom'
import { degLabel, lin } from '../lib/mathfmt'
import type { Rng } from '../lib/rng'
import type { ProofRow, TFItem } from '../model/types'
import { rot, triangleFromAngles } from './helpers'
import { ans, type GenOption, type Generator, letters, linearFor, numericDistractors, twoLinearFor } from './types'

const seg = (a: string, b: string) => `\\overline{${a}${b}}`
const ang = (a: string) => `\\angle ${a}`

// ---------------------------------------------------------------- isosceles triangles

export const isoscelesTriangle: Generator = {
  id: 'isosceles-triangle',
  types: ['ALG.QUAD_EQUATION', 'ANG.CHASE'],
  title: 'Isosceles triangle: base angles and sides',
  lessons: ['2A.4'],
  description: 'Base angles of an isosceles triangle are congruent. Variants use base-angle expressions, the vertex angle, or side expressions.',
  options: [
    {
      key: 'variant',
      label: 'Variant',
      default: 'any',
      choices: [
        { value: 'any', label: 'Any' },
        { value: 'base', label: 'Base angles are expressions' },
        { value: 'vertex', label: 'Vertex angle given, base angle is an expression' },
        { value: 'sides', label: 'Congruent legs are expressions' },
      ],
    },
  ],
  generate(rng, opts) {
    const variant = !opts.variant || opts.variant === 'any' ? rng.pick(['base', 'vertex', 'sides']) : opts.variant
    const [A, B, C] = letters(rng, 3)
    const base = rng.int(32, 74)
    const vertex = 180 - 2 * base
    const x = rng.int(3, 15)
    // B and C are base vertices, A is the apex.
    const t = triangleFromAngles(base, base, 4)
    const d = diagram().pt(B, t.A.x, t.A.y).pt(C, t.B.x, t.B.y).pt(A, t.C.x, t.C.y)
    if (variant === 'sides') {
      const len = rng.int(9, 40)
      const [e1, e2] = twoLinearFor(rng, x, len, { maxB: 30 })
      d.seg(A, B, { label: lin(e1.a, e1.b) }).seg(A, C, { label: lin(e2.a, e2.b) }).seg(B, C)
      d.angle(C, B, A, { arcs: 1 }).angle(A, C, B, { arcs: 1 })
      return {
        type: 'short',
        prompt: `In $\\triangle ${A}${B}${C}$, $${ang(B)} \\cong ${ang(C)}$. Find the value of $x$ and the length of $${seg(A, B)}$.`,
        diagram: d.build(230),
        answers: [ans('x', x), ans(`${A}${B}`, len)],
        distractors: numericDistractors(rng, x, [x + 2, x - 1, len]),
        solution: `If two angles of a triangle are congruent, the sides opposite them are congruent: $${lin(e1.a, e1.b)} = ${lin(e2.a, e2.b)}$, so $x = ${x}$ and $${A}${B} = ${len}$.`,
        workLines: 4,
      }
    }
    d.seg(A, B, { ticks: 1 }).seg(A, C, { ticks: 1 }).seg(B, C)
    if (variant === 'base') {
      const [e1, e2] = twoLinearFor(rng, x, base)
      d.angle(C, B, A, { label: degLabel(lin(e1.a, e1.b)) }).angle(A, C, B, { label: degLabel(lin(e2.a, e2.b)) })
      return {
        type: 'short',
        prompt: `Find the value of $x$. Then find $m${ang(A)}$.`,
        diagram: d.build(230),
        answers: [ans('x', x), ans(`m${ang(A)}`, `${vertex}^\\circ`, vertex)],
        distractors: numericDistractors(rng, x, [x + 3, x - 2, (180 - e1.b - e2.b) / (e1.a + e2.a)]),
        solution: `Base angles of an isosceles triangle are congruent: $${lin(e1.a, e1.b)} = ${lin(e2.a, e2.b)}$, so $x = ${x}$. Each base angle is $${base}^\\circ$, so $m${ang(A)} = 180 - 2(${base}) = ${vertex}^\\circ$.`,
        workLines: 4,
      }
    }
    const e = linearFor(rng, x, base)
    d.angle(B, A, C, { label: degLabel(vertex) }).angle(C, B, A, { label: degLabel(lin(e.a, e.b)) })
    return {
      type: 'short',
      prompt: `Find the value of $x$.`,
      diagram: d.build(230),
      answers: [ans('x', x)],
      distractors: numericDistractors(rng, x, [(180 - vertex - e.b) / e.a, (vertex - e.b) / e.a, x + 2]),
      solution: `Base angles are congruent, so each is $\\frac{180 - ${vertex}}{2} = ${base}^\\circ$. $${lin(e.a, e.b)} = ${base}$, so $x = ${x}$.`,
      workLines: 4,
    }
  },
}

// ---------------------------------------------------------------- quadrilaterals

function parallelogramPts(theta: number, w = 5, h = 3) {
  const D = polar(h, theta)
  return { A: { x: 0, y: 0 }, B: { x: w, y: 0 }, C: add({ x: w, y: 0 }, D), D }
}

export const parallelogramAngles: Generator = {
  id: 'parallelogram-angles',
  types: ['ALG.QUAD_EQUATION'],
  title: 'Parallelogram: angle equations',
  lessons: ['2C.13'],
  description: 'Opposite angles are congruent; consecutive angles are supplementary.',
  generate(rng) {
    const [A, B, C, D] = letters(rng, 4)
    const theta = rng.intExcept(50, 130, [88, 89, 90, 91, 92])
    const p = parallelogramPts(theta)
    const x = rng.int(3, 20)
    const opposite = rng.bool()
    const d = diagram().pt(A, p.A.x, p.A.y).pt(B, p.B.x, p.B.y).pt(C, p.C.x, p.C.y).pt(D, p.D.x, p.D.y)
    d.poly([A, B, C, D])
    const mA = theta
    const mB = 180 - theta
    let sol: string
    let e1, e2
    if (opposite) {
      ;[e1, e2] = twoLinearFor(rng, x, mA)
      d.angle(B, A, D, { label: degLabel(lin(e1.a, e1.b)) }).angle(D, C, B, { label: degLabel(lin(e2.a, e2.b)) })
      sol = `Opposite angles of a parallelogram are congruent: $${lin(e1.a, e1.b)} = ${lin(e2.a, e2.b)}$, so $x = ${x}$.`
    } else {
      e1 = linearFor(rng, x, mA)
      e2 = linearFor(rng, x, mB, { avoid: [e1.a] })
      d.angle(B, A, D, { label: degLabel(lin(e1.a, e1.b)) }).angle(C, B, A, { label: degLabel(lin(e2.a, e2.b)) })
      sol = `Consecutive angles of a parallelogram are supplementary: $(${lin(e1.a, e1.b)}) + (${lin(e2.a, e2.b)}) = 180$, so $x = ${x}$.`
    }
    return {
      type: 'short',
      prompt: `$${A}${B}${C}${D}$ is a parallelogram. Find the value of $x$. Then find $m${ang(A)}$ and $m${ang(B)}$.`,
      diagram: d.build(260),
      answers: [ans('x', x), ans(`m${ang(A)}`, `${mA}^\\circ`, mA), ans(`m${ang(B)}`, `${mB}^\\circ`, mB)],
      distractors: numericDistractors(rng, x, [x + 2, x - 3, opposite ? (180 - e1.b - e2.b) / (e1.a + e2.a) : (e2.b - e1.b) / (e1.a - e2.a)]),
      solution: sol + ` $m${ang(A)} = ${mA}^\\circ$, $m${ang(B)} = ${mB}^\\circ$.`,
      workLines: 4,
    }
  },
}

export const quadDiagonals: Generator = {
  id: 'quad-diagonals',
  types: ['ALG.QUAD_EQUATION'],
  title: 'Diagonals of parallelograms, rectangles, rhombuses',
  lessons: ['2C.13', '2C.14'],
  description:
    'Parallelogram diagonals bisect each other; rectangle diagonals are congruent; rhombus diagonals are perpendicular and bisect the angles.',
  options: [
    {
      key: 'shape',
      label: 'Shape',
      default: 'any',
      choices: [
        { value: 'any', label: 'Any' },
        { value: 'parallelogram', label: 'Parallelogram (bisect each other)' },
        { value: 'rectangle', label: 'Rectangle (congruent diagonals)' },
        { value: 'rhombus-perp', label: 'Rhombus (perpendicular diagonals)' },
        { value: 'rhombus-bisect', label: 'Rhombus (diagonal bisects angle)' },
      ],
    },
  ],
  generate(rng, opts) {
    const shape =
      !opts.shape || opts.shape === 'any' ? rng.pick(['parallelogram', 'rectangle', 'rhombus-perp', 'rhombus-bisect']) : opts.shape
    const [A, B, C, D, E] = letters(rng, 5)
    const x = rng.int(3, 16)
    const d = diagram()
    let pts
    if (shape === 'rectangle') pts = { A: { x: 0, y: 0 }, B: { x: 5.5, y: 0 }, C: { x: 5.5, y: 3 }, D: { x: 0, y: 3 } }
    else if (shape.startsWith('rhombus')) {
      pts = parallelogramPts(2 * rng.int(28, 37), 4, 4)
    } else pts = parallelogramPts(rng.int(55, 75), 5.5, 3)
    const Ept = { x: (pts.A.x + pts.C.x) / 2, y: (pts.A.y + pts.C.y) / 2 }
    d.pt(A, pts.A.x, pts.A.y).pt(B, pts.B.x, pts.B.y).pt(C, pts.C.x, pts.C.y).pt(D, pts.D.x, pts.D.y).pt(E, Ept.x, Ept.y)
    d.poly([A, B, C, D])
    if (shape === 'parallelogram') {
      const half = rng.int(6, 30)
      const [e1, e2] = twoLinearFor(rng, x, half, { maxB: 25 })
      d.seg(A, E, { label: lin(e1.a, e1.b), labelSide: -1 }).seg(E, C, { label: lin(e2.a, e2.b), labelSide: -1 }).seg(B, D)
      return {
        type: 'short',
        prompt: `$${A}${B}${C}${D}$ is a parallelogram with diagonals intersecting at $${E}$. Find $x$ and $${A}${C}$.`,
        diagram: d.build(260),
        answers: [ans('x', x), ans(`${A}${C}`, 2 * half)],
        distractors: numericDistractors(rng, x, [x + 1, x - 2, half]),
        solution: `Diagonals of a parallelogram bisect each other: $${lin(e1.a, e1.b)} = ${lin(e2.a, e2.b)}$, so $x = ${x}$. $${A}${C} = 2(${half}) = ${2 * half}$.`,
        workLines: 4,
      }
    }
    if (shape === 'rectangle') {
      const half = rng.int(5, 25)
      const useHalf = rng.bool()
      const e1 = linearFor(rng, x, useHalf ? half : 2 * half, { maxB: 30 })
      const e2 = linearFor(rng, x, 2 * half, { maxB: 40, avoid: [e1.a] })
      d.seg(A, C)
      d.seg(B, D)
      const p1 = useHalf ? `${A}${E} = ${lin(e1.a, e1.b)}` : `${A}${C} = ${lin(e1.a, e1.b)}`
      const p2 = `${B}${D} = ${lin(e2.a, e2.b)}`
      const eq = useHalf ? `2(${lin(e1.a, e1.b)}) = ${lin(e2.a, e2.b)}` : `${lin(e1.a, e1.b)} = ${lin(e2.a, e2.b)}`
      return {
        type: 'short',
        prompt: `$${A}${B}${C}${D}$ is a rectangle with diagonals intersecting at $${E}$. If $${p1}$ and $${p2}$, find $x$ and $${B}${D}$.`,
        diagram: d.build(250),
        answers: [ans('x', x), ans(`${B}${D}`, 2 * half)],
        distractors: numericDistractors(rng, x, [x + 1, x - 2, half]),
        solution: `Diagonals of a rectangle are congruent${useHalf ? ' and bisect each other' : ''}: $${eq}$, so $x = ${x}$ and $${B}${D} = ${2 * half}$.`,
        workLines: 4,
      }
    }
    d.seg(A, C).seg(B, D)
    if (shape === 'rhombus-perp') {
      const e = linearFor(rng, x, 90, { aMax: 9, maxB: 50 })
      d.angle(B, E, C, { label: degLabel(lin(e.a, e.b)) })
      return {
        type: 'short',
        prompt: `$${A}${B}${C}${D}$ is a rhombus with diagonals intersecting at $${E}$. Find the value of $x$.`,
        diagram: d.build(300),
        answers: [ans('x', x)],
        distractors: numericDistractors(rng, x, [(180 - e.b) / e.a, (45 - e.b) / e.a, x + 1]),
        solution: `Diagonals of a rhombus are perpendicular, so $${lin(e.a, e.b)} = 90$ and $x = ${x}$.`,
        workLines: 3,
      }
    }
    // rhombus-bisect: diagonal AC bisects angle A
    const angA = Math.round((Math.atan2(pts.D.y, pts.D.x) * 180) / Math.PI)
    const halfInt = angA / 2
    const [e1, e2] = twoLinearFor(rng, x, halfInt)
    d.angle(B, A, C, { label: degLabel(lin(e1.a, e1.b)) }).angle(C, A, D, { label: degLabel(lin(e2.a, e2.b)), arcs: 1, size: 30 })
    return {
      type: 'short',
      prompt: `$${A}${B}${C}${D}$ is a rhombus. Find the value of $x$ and $m${ang(`${B}${A}${D}`)}$.`,
      diagram: d.build(300),
      answers: [ans('x', x), ans(`m${ang(`${B}${A}${D}`)}`, `${2 * halfInt}^\\circ`, 2 * halfInt)],
      distractors: numericDistractors(rng, x, [x + 2, x - 1, (90 - e1.b - e2.b) / (e1.a + e2.a)]),
      solution: `Each diagonal of a rhombus bisects a pair of opposite angles: $${lin(e1.a, e1.b)} = ${lin(e2.a, e2.b)}$, so $x = ${x}$ and $m${ang(`${B}${A}${D}`)} = 2(${halfInt}) = ${2 * halfInt}^\\circ$.`,
      workLines: 4,
    }
  },
}

export const kiteTrapezoid: Generator = {
  id: 'kite-trapezoid',
  types: ['ALG.QUAD_EQUATION', 'ANG.CHASE'],
  title: 'Kites and isosceles trapezoids: angle equations',
  lessons: ['2C.12'],
  description: 'Kite: non-vertex angles congruent, angle sum 360°. Isosceles trapezoid: base angles congruent, angles along a leg supplementary.',
  options: [
    {
      key: 'shape',
      label: 'Shape',
      default: 'any',
      choices: [
        { value: 'any', label: 'Either' },
        { value: 'kite', label: 'Kite' },
        { value: 'trapezoid', label: 'Isosceles trapezoid' },
      ],
    },
  ],
  generate(rng, opts) {
    const shape = !opts.shape || opts.shape === 'any' ? rng.pick(['kite', 'trapezoid']) : opts.shape
    const [A, B, C, D] = letters(rng, 4)
    const x = rng.int(3, 18)
    const d = diagram()
    if (shape === 'kite') {
      // A top vertex, C bottom vertex, B left, D right. AB = AD, CB = CD.
      const a = rng.int(20, 35) / 10
      const c = rng.int(40, 60) / 10
      const w = 2.4
      d.pt(A, 0, a).pt(B, -w, 0).pt(C, 0, -c).pt(D, w, 0)
      d.seg(A, B, { ticks: 1 }).seg(A, D, { ticks: 1 }).seg(B, C, { ticks: 2 }).seg(D, C, { ticks: 2 })
      const angA = Math.round((2 * Math.atan(w / a) * 180) / Math.PI)
      const angC = Math.round((2 * Math.atan(w / c) * 180) / Math.PI)
      const angB = (360 - angA - angC) / 2
      if (!Number.isInteger(angB)) return kiteTrapezoid.generate(rng, opts)
      const e = linearFor(rng, x, angB)
      d.angle(D, A, B, { label: degLabel(angA) })
        .angle(B, C, D, { label: degLabel(angC) })
        .angle(C, B, A, { label: degLabel(lin(e.a, e.b)) })
      return {
        type: 'short',
        prompt: `$${A}${B}${C}${D}$ is a kite. Find the value of $x$ and $m${ang(D)}$.`,
        diagram: d.build(200),
        answers: [ans('x', x), ans(`m${ang(D)}`, `${angB}^\\circ`, angB)],
        distractors: numericDistractors(rng, x, [(360 - angA - angC - e.b) / e.a, (180 - angA - e.b) / e.a, x + 2]),
        solution: `The angles between the non-congruent sides of a kite are congruent, so $m${ang(B)} = m${ang(D)}$. $${angA} + ${angC} + 2(${lin(e.a, e.b)}) = 360$, so $x = ${x}$ and $m${ang(D)} = ${angB}^\\circ$.`,
        workLines: 4,
      }
    }
    const base = rng.int(50, 75)
    const h = 2.6
    const t = h / Math.tan((base * Math.PI) / 180)
    const w = 6
    d.pt(A, 0, 0).pt(B, w, 0).pt(C, w - t, h).pt(D, t, h)
    d.seg(A, B, { arrows: 1 }).seg(B, C, { ticks: 1 }).seg(D, C, { arrows: 1 }).seg(D, A, { ticks: 1 })
    const leg = rng.bool()
    if (leg) {
      const e1 = linearFor(rng, x, base)
      const e2 = linearFor(rng, x, 180 - base, { avoid: [e1.a] })
      d.angle(B, A, D, { label: degLabel(lin(e1.a, e1.b)) }).angle(A, D, C, { label: degLabel(lin(e2.a, e2.b)) })
      return {
        type: 'short',
        prompt: `$${A}${B}${C}${D}$ is an isosceles trapezoid. Find the value of $x$ and $m${ang(C)}$.`,
        diagram: d.build(260),
        answers: [ans('x', x), ans(`m${ang(C)}`, `${180 - base}^\\circ`, 180 - base)],
        distractors: numericDistractors(rng, x, [(e2.b - e1.b) / (e1.a - e2.a), x + 3, x - 1]),
        solution: `$\\overline{${A}${B}} \\parallel \\overline{${D}${C}}$, so same-side interior angles $${ang(A)}$ and $${ang(D)}$ are supplementary: $(${lin(e1.a, e1.b)}) + (${lin(e2.a, e2.b)}) = 180$, so $x = ${x}$. $m${ang(C)} = m${ang(D)} = ${180 - base}^\\circ$.`,
        workLines: 4,
      }
    }
    const [e1, e2] = twoLinearFor(rng, x, base)
    d.angle(B, A, D, { label: degLabel(lin(e1.a, e1.b)) }).angle(C, B, A, { label: degLabel(lin(e2.a, e2.b)) })
    return {
      type: 'short',
      prompt: `$${A}${B}${C}${D}$ is an isosceles trapezoid. Find the value of $x$ and $m${ang(D)}$.`,
      diagram: d.build(260),
      answers: [ans('x', x), ans(`m${ang(D)}`, `${180 - base}^\\circ`, 180 - base)],
      distractors: numericDistractors(rng, x, [(180 - e1.b - e2.b) / (e1.a + e2.a), x + 2, x - 2]),
      solution: `Base angles of an isosceles trapezoid are congruent: $${lin(e1.a, e1.b)} = ${lin(e2.a, e2.b)}$, so $x = ${x}$. $m${ang(A)} = ${base}^\\circ$, so $m${ang(D)} = 180 - ${base} = ${180 - base}^\\circ$.`,
      workLines: 4,
    }
  },
}

export const perpendicularBisector: Generator = {
  id: 'perpendicular-bisector',
  types: ['LOC.EQUIDISTANT', 'PRF.ISOSCELES_PERPBIS'],
  title: 'Perpendicular Bisector Theorem: solve for x',
  lessons: ['2B.8'],
  description: 'A point on the perpendicular bisector of a segment is equidistant from its endpoints.',
  generate(rng) {
    const [A, B, M, P] = letters(rng, 4)
    const x = rng.int(2, 14)
    const len = rng.int(8, 35)
    const [e1, e2] = twoLinearFor(rng, x, len, { maxB: 25 })
    const hgt = rng.int(25, 40) / 10
    const d = diagram()
      .pt(A, -2.5, 0)
      .pt(B, 2.5, 0)
      .pt(M, 0, 0)
      .pt(P, 0, hgt)
      .hp('Mlow', 0, -1)
      .seg(A, M, { ticks: 1 })
      .seg(M, B, { ticks: 1 })
      .line('Mlow', P)
      .right(B, M, P)
      .seg(P, A, { label: lin(e1.a, e1.b) })
      .seg(P, B, { label: lin(e2.a, e2.b) })
    return {
      type: 'short',
      prompt: `Find the value of $x$ and $${P}${A}$.`,
      diagram: d.build(230),
      answers: [ans('x', x), ans(`${P}${A}`, len)],
      distractors: numericDistractors(rng, x, [x + 1, x - 2, len]),
      solution: `$${P}$ is on the perpendicular bisector of $${seg(A, B)}$, so $${P}${A} = ${P}${B}$ (Perpendicular Bisector Theorem). $${lin(e1.a, e1.b)} = ${lin(e2.a, e2.b)}$, so $x = ${x}$ and $${P}${A} = ${len}$.`,
      workLines: 4,
    }
  },
}

// ---------------------------------------------------------------- congruence criteria (MC)

const CRITERIA = ['SSS', 'SAS', 'ASA', 'not enough information'] as const

export const congruenceCriteria: Generator = {
  id: 'congruence-criteria',
  types: ['CRIT.WHICH_CONGRUENCE'],
  title: 'Which triangle congruence criterion applies?',
  lessons: ['2B.6', '2B.7', '2B.9', '2B.11'],
  description: 'Two marked triangles; students choose SSS, SAS, ASA, or not enough information (SSA, AAA).',
  generate(rng) {
    const kind = rng.pick(['SSS', 'SAS', 'ASA', 'SSA', 'AAA'])
    const angs = [rng.int(40, 80), rng.int(35, 70)]
    const t = triangleFromAngles(angs[0], angs[1], 3)
    const L1 = letters(rng, 6)
    const [A, B, C] = L1.slice(0, 3)
    const [D, E, F] = L1.slice(3, 6)
    const d = diagram()
    d.pt(A, t.A.x, t.A.y).pt(B, t.B.x, t.B.y).pt(C, t.C.x, t.C.y)
    // Second triangle: rotate + optionally reflect, translate right.
    const reflect = rng.bool()
    const turn = rng.int(-60, 60)
    const map = (p: { x: number; y: number }) => {
      const q = reflect ? { x: -p.x, y: p.y } : p
      const r = rot(q, turn)
      return { x: r.x + 7.5, y: r.y }
    }
    const [dA, dB, dC] = [map(t.A), map(t.B), map(t.C)]
    d.pt(D, dA.x, dA.y).pt(E, dB.x, dB.y).pt(F, dC.x, dC.y)
    // Side marks: AB ~ DE (1 tick), BC ~ EF (2), CA ~ FD (3); angles A~D (1 arc), B~E (2), C~F (3)
    const sides: [string, string, string, string, number][] = [
      [A, B, D, E, 1],
      [B, C, E, F, 2],
      [C, A, F, D, 3],
    ]
    const angles: [string[], string[], number][] = [
      [[B, A, C], [E, D, F], 1],
      [[C, B, A], [F, E, D], 2],
      [[A, C, B], [D, F, E], 3],
    ]
    const markedSides = new Set<number>()
    const markedAngles = new Set<number>()
    // Choose which parts to mark for each case (indices into sides/angles).
    // Side i is between vertex i and i+1. Included angle between sides i and i+1 is angle i+1.
    const i = rng.int(0, 2)
    if (kind === 'SSS') [0, 1, 2].forEach((k) => markedSides.add(k))
    if (kind === 'SAS') {
      markedSides.add(i)
      markedSides.add((i + 1) % 3)
      markedAngles.add((i + 1) % 3)
    }
    if (kind === 'ASA') {
      markedAngles.add(i)
      markedAngles.add((i + 1) % 3)
      markedSides.add(i)
    }
    if (kind === 'SSA') {
      markedSides.add(i)
      markedSides.add((i + 1) % 3)
      markedAngles.add((i + 2) % 3)
    }
    if (kind === 'AAA') [0, 1, 2].forEach((k) => markedAngles.add(k))
    for (const [k, [p, q, r, s, ticks]] of sides.entries()) {
      const o = markedSides.has(k) ? { ticks: kind === 'SSS' ? ticks : [...markedSides].indexOf(k) + 1 } : {}
      d.seg(p, q, o).seg(r, s, o)
    }
    let n = 0
    for (const [k, [a1, a2]] of angles.entries()) {
      if (!markedAngles.has(k)) continue
      n++
      d.angle(a1[0], a1[1], a1[2], { arcs: n }).angle(a2[0], a2[1], a2[2], { arcs: n })
    }
    const answer = kind === 'SSA' || kind === 'AAA' ? 'not enough information' : kind
    const choices = CRITERIA.map((c) => (c === 'not enough information' ? '\\text{Not enough information}' : `\\text{${c}}`))
    const correct = CRITERIA.indexOf(answer as (typeof CRITERIA)[number])
    return {
      type: 'mc',
      prompt: `Based on the markings, which criterion (if any) shows that $\\triangle ${A}${B}${C} \\cong \\triangle ${D}${E}${F}$?`,
      diagram: d.build(380, 0.08),
      diagramPos: 'below',
      choices,
      correct,
      solution:
        answer === 'not enough information'
          ? `The markings show ${kind}, which is not a triangle congruence criterion.`
          : `The marked parts are ${kind === 'SSS' ? 'three pairs of sides' : kind === 'SAS' ? 'two sides and the included angle' : 'two angles and the included side'}, so ${kind} applies: $\\triangle ${A}${B}${C} \\cong \\triangle ${D}${E}${F}$.`,
    }
  },
}

// ---------------------------------------------------------------- corresponding parts (matching)

export const correspondingParts: Generator = {
  id: 'corresponding-parts',
  types: ['CRIT.CORRESPONDENCE'],
  title: 'Corresponding parts from a congruence statement',
  lessons: ['2A.1', '2A.3'],
  description: 'Matching: given a congruence statement, match each part with its corresponding part.',
  generate(rng) {
    const L = letters(rng, 6)
    const [A, B, C, D, E, F] = L
    // Write the second triangle in a scrambled but consistent order in the statement.
    const perm = rng.shuffle([0, 1, 2])
    const first = [A, B, C]
    const second = [D, E, F]
    const s1 = perm.map((k) => first[k]).join('')
    const s2 = perm.map((k) => second[k]).join('')
    const pairs = [
      { left: `$\\angle ${A}$`, right: `$\\angle ${D}$` },
      { left: `$\\angle ${B}$`, right: `$\\angle ${E}$` },
      { left: `$\\angle ${C}$`, right: `$\\angle ${F}$` },
      { left: `$\\overline{${A}${B}}$`, right: `$\\overline{${D}${E}}$` },
      { left: `$\\overline{${B}${C}}$`, right: `$\\overline{${E}${F}}$` },
      { left: `$\\overline{${A}${C}}$`, right: `$\\overline{${D}${F}}$` },
    ]
    return {
      type: 'matching',
      prompt: `$\\triangle ${s1} \\cong \\triangle ${s2}$. Match each part of $\\triangle ${A}${B}${C}$ with its corresponding part.`,
      pairs: rng.shuffle(pairs),
    }
  },
}

// ---------------------------------------------------------------- quadrilateral hierarchy (ASN / TF)

const QUAD_FACTS: TFItem[] = [
  { text: 'A square is a rectangle.', answer: 'A' },
  { text: 'A square is a rhombus.', answer: 'A' },
  { text: 'A rectangle is a square.', answer: 'S' },
  { text: 'A rhombus is a square.', answer: 'S' },
  { text: 'A rhombus is a kite.', answer: 'A' },
  { text: 'A kite is a rhombus.', answer: 'S' },
  { text: 'A trapezoid is a parallelogram.', answer: 'N', explanation: 'A trapezoid has exactly one pair of parallel sides.' },
  { text: 'A parallelogram is a trapezoid.', answer: 'N', explanation: 'Trapezoids have exactly one pair of parallel sides.' },
  { text: 'A rectangle is a parallelogram.', answer: 'A' },
  { text: 'A parallelogram is a rectangle.', answer: 'S' },
  { text: 'The diagonals of a parallelogram are congruent.', answer: 'S', explanation: 'Only when it is a rectangle.' },
  { text: 'The diagonals of a parallelogram bisect each other.', answer: 'A' },
  { text: 'The diagonals of a rhombus are perpendicular.', answer: 'A' },
  { text: 'The diagonals of a rectangle are perpendicular.', answer: 'S', explanation: 'Only when it is a square.' },
  { text: 'The diagonals of a kite bisect each other.', answer: 'S', explanation: 'Only when the kite is a rhombus.' },
  { text: 'The diagonals of an isosceles trapezoid are congruent.', answer: 'A' },
  { text: 'The diagonals of a trapezoid bisect each other.', answer: 'N', explanation: 'Then it would be a parallelogram.' },
  { text: 'Consecutive angles of a parallelogram are supplementary.', answer: 'A' },
  { text: 'Opposite angles of a parallelogram are supplementary.', answer: 'S', explanation: 'Only when they are right angles (a rectangle).' },
  { text: 'A quadrilateral with four congruent sides is a rhombus.', answer: 'A' },
  { text: 'A quadrilateral with congruent diagonals is a rectangle.', answer: 'S', explanation: 'An isosceles trapezoid also has congruent diagonals.' },
  { text: 'A parallelogram with a right angle is a rectangle.', answer: 'A' },
  { text: 'A kite has two pairs of congruent opposite sides.', answer: 'S', explanation: 'Only when it is a rhombus.' },
  { text: 'An isosceles trapezoid has congruent base angles.', answer: 'A' },
  { text: 'A rectangle is a kite.', answer: 'S', explanation: 'Only when it is a square.' },
  { text: 'A trapezoid has two pairs of parallel sides.', answer: 'N' },
]

const asnOption: GenOption = {
  key: 'mode',
  label: 'Format',
  default: 'asn',
  choices: [
    { value: 'asn', label: 'Always / Sometimes / Never' },
    { value: 'tf', label: 'True / False' },
  ],
}

export const quadHierarchy: Generator = {
  id: 'quad-hierarchy',
  types: ['QUAD.ASN'],
  title: 'Quadrilateral hierarchy: Always / Sometimes / Never',
  lessons: ['2C.12', '2C.13', '2C.14'],
  description: 'Statements about parallelograms, rectangles, rhombuses, squares, kites, and (exclusive) trapezoids.',
  options: [
    asnOption,
    {
      key: 'count',
      label: 'Statements',
      default: '6',
      choices: ['4', '6', '8', '10'].map((v) => ({ value: v, label: v })),
    },
  ],
  generate(rng, opts) {
    const count = Number(opts.count || 6)
    const mode = (opts.mode as 'asn' | 'tf') || 'asn'
    const picked = rng.shuffle(QUAD_FACTS).slice(0, count)
    if (mode === 'asn') {
      return {
        type: 'tf',
        mode: 'asn',
        prompt: 'Write A if the statement is always true, S if it is sometimes true, or N if it is never true.',
        items: picked,
        requireJustification: false,
      }
    }
    // TF: "always" statements are true; "never" statements false; "sometimes" statements are false as universal claims.
    return {
      type: 'tf',
      mode: 'tf',
      prompt: 'Write T if the statement is always true. Otherwise write F and give a counterexample or correction.',
      items: picked.map((f) => ({ ...f, answer: f.answer === 'A' ? 'T' : 'F' })),
      requireJustification: true,
    }
  },
}

// ---------------------------------------------------------------- two-column proofs

const proofModeOption: GenOption = {
  key: 'blanks',
  label: 'Student copy',
  default: 'reasons',
  choices: [
    { value: 'none', label: 'Blank table (students write everything)' },
    { value: 'reasons', label: 'Statements given, reasons blank' },
    { value: 'mixed', label: 'Some statements and reasons blank' },
  ],
}

function applyBlanks(rng: Rng, rows: ProofRow[], mode: string): ProofRow[] {
  return rows.map((r, i) => {
    if (mode === 'none') return { ...r, showStatement: false, showReason: false }
    if (mode === 'reasons') return { ...r, showStatement: true, showReason: i === 0 }
    // mixed: first row given; others hide one or the other at random
    if (i === 0) return { ...r, showStatement: true, showReason: true }
    const hideStatement = rng.bool(0.4)
    return { ...r, showStatement: !hideStatement, showReason: hideStatement }
  })
}

export const unit2Generators: Generator[] = [
  isoscelesTriangle,
  parallelogramAngles,
  quadDiagonals,
  kiteTrapezoid,
  perpendicularBisector,
  congruenceCriteria,
  correspondingParts,
  quadHierarchy,
]

export { applyBlanks, proofModeOption }
