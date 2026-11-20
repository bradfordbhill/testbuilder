import { diagram } from '../diagram/build'
import { fixed, fmt, fracLatex, gcd, lin, radicalLatex } from '../lib/mathfmt'
import type { ProofRow } from '../model/types'
import { rot, triangleFromAngles, triangleFromSides } from './helpers'
import { ans, type Generator, letters, linearFor, numericDistractors } from './types'
import { applyBlanks, proofModeOption } from './unit2'

const seg = (a: string, b: string) => `\\overline{${a}${b}}`

// ---------------------------------------------------------------- dilations on the grid

const SCALES: [number, number][] = [
  [2, 1],
  [3, 1],
  [1, 2],
  [3, 2],
  [1, 3],
  [5, 2],
]

export const dilationGrid: Generator = {
  id: 'dilation-grid',
  title: 'Dilate a figure on the grid',
  lessons: ['3A.1', '3A.3', '3A.4'],
  description: 'Dilate a triangle with a given center and scale factor; or find the scale factor from a figure and its image.',
  options: [
    {
      key: 'variant',
      label: 'Variant',
      default: 'image',
      choices: [
        { value: 'image', label: 'Find the image' },
        { value: 'factor', label: 'Find the scale factor' },
      ],
    },
  ],
  generate(rng, opts) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const [p, q] = rng.pick(SCALES)
      const k = p / q
      const P = { x: rng.int(-4, 2), y: rng.int(-4, 2) }
      const pts: { x: number; y: number }[] = []
      for (let i = 0; i < 3; i++) {
        const dx = q * rng.int(-3, 3)
        const dy = q * rng.int(-3, 3)
        pts.push({ x: P.x + dx, y: P.y + dy })
      }
      const imgs = pts.map((a) => ({ x: P.x + k * (a.x - P.x), y: P.y + k * (a.y - P.y) }))
      const all = [...pts, ...imgs, P]
      if (all.some((a) => Math.abs(a.x) > 9 || Math.abs(a.y) > 9)) continue
      const area = Math.abs((pts[1].x - pts[0].x) * (pts[2].y - pts[0].y) - (pts[2].x - pts[0].x) * (pts[1].y - pts[0].y))
      // Avoid thin or tiny triangles.
      const sides = [0, 1, 2].map((i) => Math.hypot(pts[i].x - pts[(i + 1) % 3].x, pts[i].y - pts[(i + 1) % 3].y))
      if (area < 6 || Math.min(...sides) < 2 || area / Math.max(...sides) ** 2 < 0.2) continue
      if (pts.some((a) => a.x === P.x && a.y === P.y)) continue
      const [A, B, C] = letters(rng, 3, 'IOQP')
      const d = diagram().withGrid({ xmin: -9.5, xmax: 9.5, ymin: -9.5, ymax: 9.5 }, { numberEvery: 2 })
      d.pt('P', P.x, P.y)
      ;[A, B, C].forEach((id, i) => d.pt(id, pts[i].x, pts[i].y))
      d.poly([A, B, C])
      const kLatex = fracLatex(p, q)
      if (opts.variant === 'factor') {
        ;[A, B, C].forEach((id, i) => d.pt(`${id}'`, imgs[i].x, imgs[i].y))
        d.poly([`${A}'`, `${B}'`, `${C}'`])
        return {
          type: 'short',
          prompt: `Triangle $${A}'${B}'${C}'$ is the image of triangle $${A}${B}${C}$ under a dilation with center $P$. What is the scale factor? Explain how you know.`,
          diagram: d.build(260),
          diagramPos: 'right',
          answers: [ans('k', kLatex, k)],
          distractors: [fracLatex(q, p), String(p), String(p + q)].filter((s) => s !== kLatex),
          solution: `$k = \\frac{P${A}'}{P${A}} = \\frac{${A}'${B}'}{${A}${B}} = ${kLatex}$.`,
          workLines: 2,
        }
      }
      return {
        type: 'short',
        prompt: `Dilate triangle $${A}${B}${C}$ using center $P$ and scale factor $${kLatex}$. Give the coordinates of $${A}'$, $${B}'$, and $${C}'$ and draw the image.`,
        diagram: d.build(260),
        diagramPos: 'right',
        answers: [A, B, C].map((id, i) => ans(`${id}'`, `(${fmt(imgs[i].x)}, ${fmt(imgs[i].y)})`)),
        solution: `Each image point is on the ray from $P$ through the original point, $${kLatex}$ times as far from $P$.`,
        workLines: 2,
      }
    }
    throw new Error('dilation-grid: could not generate')
  },
}

// ---------------------------------------------------------------- midsegment

export const midsegment: Generator = {
  id: 'midsegment',
  title: 'Triangle midsegment: solve for x',
  lessons: ['3A.5'],
  description: 'The segment joining midpoints of two sides is parallel to the third side and half as long.',
  generate(rng) {
    const [A, B, C, D, E] = letters(rng, 5)
    const x = rng.int(2, 12)
    const half = rng.int(4, 20)
    const e1 = linearFor(rng, x, half, { maxB: 20 })
    const e2 = linearFor(rng, x, 2 * half, { maxB: 40, avoid: [e1.a, 2 * e1.a] })
    const t = triangleFromAngles(rng.int(50, 70), rng.int(45, 65), 6)
    const Dp = { x: (t.A.x + t.C.x) / 2, y: (t.A.y + t.C.y) / 2 }
    const Ep = { x: (t.B.x + t.C.x) / 2, y: (t.B.y + t.C.y) / 2 }
    const d = diagram()
      .pt(A, t.A.x, t.A.y)
      .pt(B, t.B.x, t.B.y)
      .pt(C, t.C.x, t.C.y)
      .pt(D, Dp.x, Dp.y)
      .pt(E, Ep.x, Ep.y)
      .seg(A, D, { ticks: 1 })
      .seg(D, C, { ticks: 1 })
      .seg(C, E, { ticks: 2 })
      .seg(E, B, { ticks: 2 })
      .seg(A, B, { label: lin(e2.a, e2.b) })
      .seg(D, E, { label: lin(e1.a, e1.b) })
    return {
      type: 'short',
      prompt: `$${D}$ and $${E}$ are midpoints. Find the value of $x$ and $${A}${B}$.`,
      diagram: d.build(250),
      answers: [ans('x', x), ans(`${A}${B}`, 2 * half)],
      distractors: numericDistractors(rng, x, [(e2.b - e1.b) / (e1.a - e2.a), (e2.b - 0.5 * e1.b) / (0.5 * e1.a - e2.a), x + 2]),
      solution: `Midsegment: $${A}${B} = 2 \\cdot ${D}${E}$, so $${lin(e2.a, e2.b)} = 2(${lin(e1.a, e1.b)})$ and $x = ${x}$. $${A}${B} = ${2 * half}$.`,
      workLines: 4,
    }
  },
}

// ---------------------------------------------------------------- triangle proportionality (side splitter)

/** Triangle with apex A, base BC; D on AB and E on AC with AD/AB = AE/AC = t. Side lengths AB, AC set the shape. */
function splitterFigure(A: string, B: string, C: string, D: string, E: string, t: number, ab = 6, ac = 6) {
  const bc = ((ab + ac) / 2) * 0.95
  const Bp = { x: 0, y: 0 }
  const Cp = { x: bc, y: 0 }
  // Apex: distance ab from B and ac from C.
  const cosB = (ab * ab + bc * bc - ac * ac) / (2 * ab * bc)
  const Ap = { x: ab * cosB, y: ab * Math.sqrt(Math.max(0, 1 - cosB * cosB)) }
  const Dp = { x: Ap.x + (Bp.x - Ap.x) * t, y: Ap.y + (Bp.y - Ap.y) * t }
  const Ep = { x: Ap.x + (Cp.x - Ap.x) * t, y: Ap.y + (Cp.y - Ap.y) * t }
  return diagram().pt(A, Ap.x, Ap.y).pt(B, Bp.x, Bp.y).pt(C, Cp.x, Cp.y).pt(D, Dp.x, Dp.y).pt(E, Ep.x, Ep.y)
}

export const sideSplitter: Generator = {
  id: 'side-splitter',
  title: 'Triangle proportionality (side splitter)',
  lessons: ['3B.11', '3A.5'],
  description:
    'A line parallel to one side divides the other two sides proportionally. Linear version, or honors quadratic version (reject the negative root).',
  options: [
    {
      key: 'variant',
      label: 'Algebra',
      default: 'numeric',
      choices: [
        { value: 'numeric', label: 'Find a missing length' },
        { value: 'linear', label: 'Linear expression in x' },
        { value: 'quadratic', label: 'Quadratic (honors)' },
      ],
    },
  ],
  generate(rng, opts) {
    const [A, B, C, D, E] = letters(rng, 5)
    const variant = opts.variant || 'numeric'
    if (variant === 'quadratic') {
      for (;;) {
        const X = rng.int(2, 9)
        const p = rng.int(0, 5)
        const s = rng.int(1, 6)
        const N = (X + p) * (X + s)
        const divisors: number[] = []
        for (let k = 3; k <= Math.sqrt(N) * 2 && k < N; k++) if (N % k === 0 && N / k >= 3 && N / k <= 24 && k <= 24) divisors.push(k)
        if (!divisors.length) continue
        const q = rng.pick(divisors)
        const r = N / q
        const AD = X + p
        const d = splitterFigure(A, B, C, D, E, AD / (AD + q), AD + q, r + X + s)
        d.seg(A, D, { label: lin(1, p) }).seg(D, B, { label: String(q) }).seg(A, E, { label: String(r) }).seg(E, C, { label: lin(1, s) })
        d.seg(D, E, { arrows: 1 }).seg(B, C, { arrows: 1 })
        const other = -(p + s) - X
        return {
          type: 'short',
          prompt: `In the figure, $${seg(D, E)} \\parallel ${seg(B, C)}$. Find the value of $x$. Explain why only one solution of your equation works.`,
          diagram: d.noScale().build(250),
          answers: [ans('x', X)],
          solution: `$\\frac{${lin(1, p)}}{${q}} = \\frac{${r}}{${lin(1, s)}}$, so $(${lin(1, p)})(${lin(1, s)}) = ${N}$, i.e. $x^2 + ${p + s}x + ${p * s - N} = 0$, giving $x = ${X}$ or $x = ${other}$. A negative value would give a negative length, so $x = ${X}$.`,
          workLines: 6,
        }
      }
    }
    // numeric or linear: AD/DB = AE/EC with AD:DB = a:b, scaled by different multipliers on each side.
    const [ra, rb] = rng.pick([
      [3, 2],
      [2, 3],
      [4, 3],
      [3, 4],
      [5, 2],
      [2, 5],
      [5, 3],
      [3, 5],
      [2, 1],
      [1, 2],
      [5, 4],
      [4, 5],
    ])
    const m1 = rng.int(1, 4)
    let m2 = rng.int(1, 4)
    if (m2 === m1) m2 = m1 === 4 ? 3 : m1 + 1
    const p = ra * m1
    const q = rb * m1
    const r = ra * m2
    const ec = rb * m2
    const t = p / (p + q)
    const d = splitterFigure(A, B, C, D, E, t, p + q, r + ec)
    d.seg(D, E, { arrows: 1 }).seg(B, C, { arrows: 1 })
    if (variant === 'linear') {
      const x = rng.int(2, 9)
      const e = linearFor(rng, x, ec, { maxB: 15, allowOne: true })
      if (ec - e.b <= 0) return sideSplitter.generate(rng, opts)
      d.seg(A, D, { label: String(p) }).seg(D, B, { label: String(q) }).seg(A, E, { label: String(r) }).seg(E, C, { label: lin(e.a, e.b) })
      return {
        type: 'short',
        prompt: `$${seg(D, E)} \\parallel ${seg(B, C)}$. Find the value of $x$ and $${E}${C}$.`,
        diagram: d.build(250),
        answers: [ans('x', x), ans(`${E}${C}`, ec)],
        distractors: numericDistractors(rng, x, [((p * r) / q - e.b) / e.a, ((q * p) / r - e.b) / e.a, x + 1]),
        solution: `$\\frac{${A}${D}}{${D}${B}} = \\frac{${A}${E}}{${E}${C}}$: $\\frac{${p}}{${q}} = \\frac{${r}}{${lin(e.a, e.b)}}$, so $${p}(${lin(e.a, e.b)}) = ${q * r}$ and $x = ${x}$. $${E}${C} = ${ec}$.`,
        workLines: 5,
      }
    }
    d.seg(A, D, { label: String(p) }).seg(D, B, { label: String(q) }).seg(A, E, { label: String(r) }).seg(E, C, { label: 'x' })
    return {
      type: 'short',
      prompt: `$${seg(D, E)} \\parallel ${seg(B, C)}$. Find $x$.`,
      diagram: d.build(250),
      answers: [ans('x', fmt(ec))],
      distractors: numericDistractors(rng, ec, [(p * r) / q, (r * (p + q)) / p - r + q, ec + 1]),
      solution: `$\\frac{${p}}{${q}} = \\frac{${r}}{x}$, so $${p}x = ${q * r}$ and $x = ${fmt(ec)}$.`,
      workLines: 4,
    }
  },
}

// ---------------------------------------------------------------- similar triangles

export const similarTriangles: Generator = {
  id: 'similar-triangles',
  title: 'Similar triangles: find missing sides',
  lessons: ['3B.6', '3B.7', '3B.9'],
  description: 'Given a similarity statement and marked figure, use the scale factor to find two missing side lengths.',
  generate(rng) {
    const [num, den] = rng.pick([
      [2, 1],
      [3, 1],
      [3, 2],
      [5, 2],
      [1, 2],
      [4, 3],
    ])
    // Sides are multiples of the denominator so every length is a whole number.
    let a = 0
    let b = 0
    let c = 0
    const lo = Math.ceil(4 / den)
    const hi = Math.max(lo + 2, Math.floor(13 / den))
    do {
      a = den * rng.int(lo, hi)
      b = den * rng.int(lo, hi)
      c = den * rng.int(lo, hi)
    } while (a + b <= c + 1 || a + c <= b + 1 || b + c <= a + 1 || new Set([a, b, c]).size < 3)
    const k = num / den
    const L = letters(rng, 6)
    const [A, B, C, D, E, F] = L
    const t1 = triangleFromSides(a, b, c)
    const scale = 0.32
    const d = diagram()
    const P1 = [t1.A, t1.B, t1.C].map((p) => ({ x: p.x * scale, y: p.y * scale }))
    const reflect = rng.bool()
    const turn = rng.int(-40, 40)
    const width1 = Math.max(...P1.map((p) => p.x))
    const P2 = [t1.A, t1.B, t1.C].map((p) => {
      const q = { x: p.x * scale * k * (reflect ? -1 : 1), y: p.y * scale * k }
      const r = rot(q, turn)
      return r
    })
    const minX2 = Math.min(...P2.map((p) => p.x))
    const shift = width1 + 1.6 - minX2
    d.pt(A, P1[0].x, P1[0].y).pt(B, P1[1].x, P1[1].y).pt(C, P1[2].x, P1[2].y)
    d.pt(D, P2[0].x + shift, P2[0].y).pt(E, P2[1].x + shift, P2[1].y).pt(F, P2[2].x + shift, P2[2].y)
    // sides: AB = c, BC = a, CA = b
    const unknown = rng.shuffle([0, 1, 2]).slice(0, 2)
    const s1 = [c, a, b]
    const s2 = s1.map((v) => v * k)
    const names1 = [`${A}${B}`, `${B}${C}`, `${C}${A}`]
    const names2 = [`${D}${E}`, `${E}${F}`, `${F}${D}`]
    const segPairs: [string, string][] = [
      [A, B],
      [B, C],
      [C, A],
    ]
    const segPairs2: [string, string][] = [
      [D, E],
      [E, F],
      [F, D],
    ]
    const vars = ['x', 'y']
    segPairs.forEach(([p, q], i) => d.seg(p, q, { label: String(s1[i]) }))
    segPairs2.forEach(([p, q], i) => {
      const u = unknown.indexOf(i)
      d.seg(p, q, { label: u >= 0 ? vars[u] : fmt(s2[i]) })
    })
    return {
      type: 'short',
      prompt: `$\\triangle ${A}${B}${C} \\sim \\triangle ${D}${E}${F}$. Find $x$ and $y$.`,
      diagram: d.build(380, 0.1),
      diagramPos: 'below',
      answers: [ans('x', fmt(s2[unknown[0]])), ans('y', fmt(s2[unknown[1]]))],
      solution: `Scale factor from $\\triangle ${A}${B}${C}$ to $\\triangle ${D}${E}${F}$ is $${fracLatex(num, den)}$. $${names2[unknown[0]]} = ${fracLatex(num, den)} \\cdot ${names1[unknown[0]]}$, and similarly for $${names2[unknown[1]]}$.`,
      workLines: 5,
    }
  },
}

export const nestedTriangles: Generator = {
  id: 'nested-triangles',
  title: 'Nested similar triangles (parallel segment)',
  lessons: ['3B.9', '3B.11'],
  description: 'A segment parallel to a side forms a similar triangle by AA. Find a side of the large triangle (watch whole vs. part).',
  generate(rng) {
    const [A, B, C, D, E] = letters(rng, 5)
    for (;;) {
      const p = rng.int(3, 10)
      const q = rng.int(2, 8)
      const g = gcd(p, p + q)
      const r = (p / g) * Math.max(1, Math.round((g * rng.int(5, 12)) / 10))
      const x = (r * (p + q)) / p
      if (!Number.isInteger(x) || x > 40) continue
      const d = splitterFigure(A, B, C, D, E, p / (p + q), p + q, (p + q) * (rng.int(8, 13) / 10))
      d.seg(A, D, { label: String(p) }).seg(D, B, { label: String(q) }).seg(A, E).seg(E, C)
      d.seg(D, E, { label: String(r), arrows: 1 }).seg(B, C, { label: 'x', arrows: 1 })
      return {
        type: 'short',
        prompt: `$${seg(D, E)} \\parallel ${seg(B, C)}$.\n\n(a) Explain why $\\triangle ${A}${D}${E} \\sim \\triangle ${A}${B}${C}$.\n\n(b) Find $x$.`,
        diagram: d.build(250),
        answers: [
          ans('(a)', `\\text{AA: } \\angle ${A} \\cong \\angle ${A},\\ \\angle ${A}${D}${E} \\cong \\angle ${A}${B}${C} \\text{ (corresponding angles)}`),
          ans('(b)\\ x', x),
        ],
        distractors: numericDistractors(rng, x, [(r * q) / p, (r * p) / q, r + q]),
        solution: `$\\frac{${A}${D}}{${A}${B}} = \\frac{${D}${E}}{${B}${C}}$: $\\frac{${p}}{${p + q}} = \\frac{${r}}{x}$, so $x = ${x}$.`,
        workLines: 5,
      }
    }
  },
}

export const similarityProof: Generator = {
  id: 'similarity-proof',
  title: 'Two-column similarity proof (AA)',
  lessons: ['3B.9', '3B.11'],
  description: 'Prove triangles similar with the Angle-Angle Triangle Similarity Theorem (nested triangles or an "hourglass").',
  options: [
    {
      key: 'template',
      label: 'Template',
      default: 'any',
      choices: [
        { value: 'any', label: 'Any' },
        { value: 'nested', label: 'Nested triangles (parallel side)' },
        { value: 'hourglass', label: 'Hourglass (vertical angles)' },
      ],
    },
    proofModeOption,
  ],
  generate(rng, opts) {
    const template = !opts.template || opts.template === 'any' ? rng.pick(['nested', 'hourglass']) : opts.template
    const [A, B, C, D, E] = letters(rng, 5)
    let rows: ProofRow[]
    let given: string
    let prove: string
    let d
    if (template === 'nested') {
      d = splitterFigure(A, B, C, D, E, 0.45)
      d.seg(A, D).seg(D, B).seg(A, E).seg(E, C).seg(D, E, { arrows: 1 }).seg(B, C, { arrows: 1 })
      given = `$${seg(D, E)} \\parallel ${seg(B, C)}$`
      prove = `$\\triangle ${A}${D}${E} \\sim \\triangle ${A}${B}${C}$`
      rows = [
        { statement: `$${seg(D, E)} \\parallel ${seg(B, C)}$`, reason: 'Given' },
        { statement: `$\\angle ${A}${D}${E} \\cong \\angle ${A}${B}${C}$`, reason: 'Corresponding angles are congruent (parallel lines)' },
        { statement: `$\\angle ${A} \\cong \\angle ${A}$`, reason: 'An angle is congruent to itself' },
        { statement: `$\\triangle ${A}${D}${E} \\sim \\triangle ${A}${B}${C}$`, reason: 'Angle-Angle Triangle Similarity Theorem' },
      ]
    } else {
      d = diagram().pt(A, -3, 1.6).pt(B, -3, -0.6).pt(C, 0, 0).pt(D, 2, 0.4).pt(E, 2, -1.067)
      d.seg(A, B, { arrows: 1 }).seg(D, E, { arrows: 1 }).seg(A, C).seg(C, E).seg(B, C).seg(C, D)
      given = `$${seg(A, B)} \\parallel ${seg(D, E)}$`
      prove = `$\\triangle ${A}${B}${C} \\sim \\triangle ${E}${D}${C}$`
      rows = [
        { statement: `$${seg(A, B)} \\parallel ${seg(D, E)}$`, reason: 'Given' },
        { statement: `$\\angle ${B}${A}${C} \\cong \\angle ${D}${E}${C}$`, reason: 'Alternate interior angles are congruent (parallel lines)' },
        { statement: `$\\angle ${A}${C}${B} \\cong \\angle ${E}${C}${D}$`, reason: 'Vertical angles are congruent' },
        { statement: `$\\triangle ${A}${B}${C} \\sim \\triangle ${E}${D}${C}$`, reason: 'Angle-Angle Triangle Similarity Theorem' },
      ]
    }
    return {
      type: 'proof',
      prompt: 'Complete the two-column proof.',
      given,
      prove,
      rows: applyBlanks(rng, rows, opts.blanks || 'reasons'),
      format: 'two-column',
      diagram: d.build(230),
    }
  },
}

// ---------------------------------------------------------------- right triangles

export const pythagorean: Generator = {
  id: 'pythagorean',
  title: 'Pythagorean Theorem: missing side (simplest radical form)',
  lessons: ['3C.14'],
  description: 'Find a missing side of a right triangle as an exact simplest radical and a decimal.',
  options: [
    {
      key: 'missing',
      label: 'Missing side',
      default: 'any',
      choices: [
        { value: 'any', label: 'Any' },
        { value: 'hyp', label: 'Hypotenuse' },
        { value: 'leg', label: 'Leg' },
      ],
    },
  ],
  generate(rng, opts) {
    const missing = !opts.missing || opts.missing === 'any' ? rng.pick(['hyp', 'leg']) : opts.missing
    const [A, B, C] = letters(rng, 3)
    // Legs a (horizontal) and b (vertical), hypotenuse c. One of them unknown.
    let a: number
    let b2: number
    let c2: number
    let labels: [string, string, string]
    let exact: string
    let value: number
    let sol: string
    let wrong: string[]
    if (missing === 'hyp') {
      a = rng.int(2, 14)
      const b = rng.int(2, 14)
      b2 = b * b
      c2 = a * a + b2
      labels = [String(a), String(b), 'x']
      exact = radicalLatex(c2)
      value = Math.sqrt(c2)
      sol = `$x^2 = ${a}^2 + ${b}^2 = ${c2}$, so $x = \\sqrt{${c2}} = ${exact}$.`
      wrong = [String(a + b), radicalLatex(Math.abs(a * a - b2) || 2), radicalLatex(2 * c2)]
    } else {
      const c = rng.int(5, 16)
      a = rng.int(2, c - 1)
      c2 = c * c
      b2 = c2 - a * a
      labels = [String(a), 'x', String(c)]
      exact = radicalLatex(b2)
      value = Math.sqrt(b2)
      sol = `$x^2 + ${a}^2 = ${c}^2$, so $x^2 = ${b2}$ and $x = ${exact}$.`
      wrong = [radicalLatex(c2 + a * a), String(c - a), radicalLatex(b2 * 2)]
    }
    const d = diagram().pt(C, 0, 0).pt(B, a * 0.4, 0).pt(A, 0, Math.sqrt(b2) * 0.4)
    d.seg(C, B, { label: labels[0] }).seg(C, A, { label: labels[1] }).seg(A, B, { label: labels[2] }).right(B, C, A)
    const shown = /\\sqrt/.test(exact) ? `${exact} \\approx ${fixed(value, 1)}` : exact
    return {
      type: 'short',
      prompt: 'Find $x$. Give an exact answer in simplest radical form, then round to the nearest tenth.',
      diagram: d.build(200),
      answers: [ans('x', shown, value)],
      distractors: wrong.filter((w) => w !== exact),
      solution: sol,
      workLines: 4,
    }
  },
}

export const classifyTriangle: Generator = {
  id: 'classify-triangle',
  title: 'Acute, right, obtuse, or not a triangle?',
  lessons: ['3C.15'],
  description: 'Converse of the Pythagorean Theorem and the Triangle Inequality: compare c² with a² + b².',
  generate(rng) {
    const kind = rng.pick(['acute', 'right', 'obtuse', 'none'])
    let s: number[] = []
    for (;;) {
      if (kind === 'right') {
        const [p, q, r] = rng.pick([
          [3, 4, 5],
          [5, 12, 13],
          [8, 15, 17],
          [7, 24, 25],
          [20, 21, 29],
        ])
        const k = rng.int(1, 3)
        s = [p * k, q * k, r * k]
        break
      }
      const a = rng.int(3, 20)
      const b = rng.int(3, 20)
      const c = rng.int(Math.max(a, b), 30)
      const tri = a + b > c
      const diff = a * a + b * b - c * c
      if (kind === 'none' && !tri) {
        s = [a, b, c]
        break
      }
      if (!tri || diff === 0) continue
      if (kind === 'acute' && diff > 0 && c > Math.max(a, b)) {
        s = [a, b, c]
        break
      }
      if (kind === 'obtuse' && diff < 0) {
        s = [a, b, c]
        break
      }
    }
    const shown = rng.shuffle(s)
    const choices = ['\\text{Acute}', '\\text{Right}', '\\text{Obtuse}', '\\text{Not a triangle}']
    const correct = ['acute', 'right', 'obtuse', 'none'].indexOf(kind)
    const [a, b, c] = [...s].sort((x, y) => x - y)
    return {
      type: 'mc',
      prompt: `A triangle is proposed with side lengths $${shown.join('$, $')}$. Classify it as acute, right, or obtuse, or state that the lengths cannot form a triangle. Show your work.`,
      choices,
      correct,
      solution:
        kind === 'none'
          ? `$${a} + ${b} = ${a + b} \\le ${c}$, so the Triangle Inequality fails.`
          : `$${a}^2 + ${b}^2 = ${a * a + b * b}$ and $${c}^2 = ${c * c}$. ${kind === 'right' ? 'They are equal: right.' : kind === 'acute' ? '$c^2 < a^2 + b^2$: acute.' : '$c^2 > a^2 + b^2$: obtuse.'}`,
      workLines: 3,
    }
  },
}

export const altitudeHypotenuse: Generator = {
  id: 'altitude-hypotenuse',
  title: 'Altitude to the hypotenuse (geometric mean)',
  lessons: ['3C.13', '3B.12'],
  honors: true,
  description: 'Altitude to the hypotenuse makes three similar right triangles: h² = xy and leg² = segment · hypotenuse.',
  options: [
    {
      key: 'find',
      label: 'Find',
      default: 'any',
      choices: [
        { value: 'any', label: 'Any' },
        { value: 'altitude', label: 'Altitude' },
        { value: 'leg', label: 'Leg' },
        { value: 'segment', label: 'Hypotenuse segment' },
      ],
    },
  ],
  generate(rng, opts) {
    const find = !opts.find || opts.find === 'any' ? rng.pick(['altitude', 'leg', 'segment']) : opts.find
    const [A, B, C, D] = letters(rng, 4)
    // Right angle at C; altitude CD to hypotenuse AB; AD = m, DB = n.
    let m = rng.int(2, 12)
    let n = rng.int(2, 16)
    if (find === 'segment') {
      // choose h, m with h^2 divisible by m
      const h = rng.int(4, 12)
      const divs = []
      for (let k = 2; k < h * h; k++) if ((h * h) % k === 0 && k <= 16 && (h * h) / k <= 20) divs.push(k)
      m = rng.pick(divs.length ? divs : [h])
      n = (h * h) / m
    }
    const h = Math.sqrt(m * n)
    const sc = 7 / (m + n)
    const d = diagram()
      .pt(A, 0, 0)
      .pt(B, (m + n) * sc, 0)
      .pt(D, m * sc, 0)
      .pt(C, m * sc, h * sc)
      .seg(C, A)
      .seg(C, B)
      .seg(C, D)
      .right(B, D, C)
      .right(A, C, B)
    let answer: string, value: number, sol: string
    if (find === 'altitude') {
      d.seg(A, D, { label: String(m) }).seg(D, B, { label: String(n) })
      d.shapes = d.shapes.filter((s) => !(s.kind === 'segment' && s.a === C && s.b === D))
      d.seg(C, D, { label: 'x' })
      answer = radicalLatex(m * n)
      value = h
      sol = `$x^2 = ${m} \\cdot ${n} = ${m * n}$, so $x = ${answer}$.`
    } else if (find === 'leg') {
      d.seg(A, D, { label: String(m) }).seg(D, B, { label: String(n) })
      d.shapes = d.shapes.filter((s) => !(s.kind === 'segment' && s.a === C && s.b === A))
      d.seg(C, A, { label: 'x' })
      answer = radicalLatex(m * (m + n))
      value = Math.sqrt(m * (m + n))
      sol = `$x^2 = ${A}${D} \\cdot ${A}${B} = ${m} \\cdot ${m + n} = ${m * (m + n)}$, so $x = ${answer}$.`
    } else {
      d.seg(A, D, { label: String(m) }).seg(D, B, { label: 'x' })
      d.shapes = d.shapes.filter((s) => !(s.kind === 'segment' && s.a === C && s.b === D))
      d.seg(C, D, { label: String(h) })
      answer = fmt(n)
      value = n
      sol = `$${h}^2 = ${m}x$, so $x = ${fmt(n)}$.`
    }
    return {
      type: 'short',
      prompt: `$\\angle ${A}${C}${B}$ is a right angle and $${seg(C, D)}$ is the altitude to the hypotenuse. Find $x$ in simplest radical form.`,
      diagram: d.build(260),
      answers: [ans('x', answer, value)],
      solution: sol,
      workLines: 4,
    }
  },
}

// ---------------------------------------------------------------- applications

export const indirectMeasurement: Generator = {
  id: 'indirect-measurement',
  title: 'Mirror and shadow problems',
  lessons: ['3D.17'],
  description: 'Similar right triangles from a mirror (angle of incidence = angle of reflection) or shadows.',
  generate(rng) {
    const names = ['Maya', 'Jordan', 'Luis', 'Priya', 'Sam', 'Ana', 'Kai', 'Noor']
    const who = rng.pick(names)
    if (rng.bool()) {
      const eye = rng.int(48, 64) / 10
      const toMirror = rng.int(4, 12)
      const mirrorToObj = rng.int(15, 60)
      const obj = rng.pick(['flagpole', 'tree', 'building', 'light pole'])
      const H = (eye * mirrorToObj) / toMirror
      const d = diagram()
        .pt('you', 0, 0, null)
        .pt('eye', 0, eye, null)
        .pt('M', toMirror, 0, 'M')
        .pt('base', toMirror + mirrorToObj, 0, null)
        .pt('top', toMirror + mirrorToObj, H, null)
        .seg('you', 'base')
        .seg('you', 'eye', { label: `${eye} ft` })
        .seg('eye', 'M', { dashed: true })
        .seg('M', 'top', { dashed: true })
        .seg('base', 'top', { label: 'h', bold: true })
      return {
        type: 'short',
        prompt: `${who} places a mirror on level ground ${mirrorToObj} ft from the base of a ${obj} and steps back ${toMirror} ft from the mirror (point $M$) until the top of the ${obj} is visible in it. ${who}'s eyes are ${eye} ft above the ground. How tall is the ${obj}? Round to the nearest tenth of a foot.`,
        diagram: d.noScale().build(300, 0.06),
        diagramPos: 'below',
        answers: [ans('h', `${fixed(H, 1)} \\text{ ft}`, round1(H))],
        solution: `The triangles are similar (right angles, and angle of incidence = angle of reflection). $\\frac{h}{${eye}} = \\frac{${mirrorToObj}}{${toMirror}}$, so $h \\approx ${fixed(H, 1)}$ ft.`,
        workLines: 4,
      }
    }
    const height = rng.int(48, 64) / 10
    const shadow = rng.int(30, 90) / 10
    const objShadow = rng.int(12, 60)
    const obj = rng.pick(['tree', 'flagpole', 'goalpost', 'statue'])
    const H = (height * objShadow) / shadow
    return {
      type: 'short',
      prompt: `At the same time of day, ${who} (${height} ft tall) casts a shadow ${shadow} ft long and a ${obj} casts a shadow ${objShadow} ft long. How tall is the ${obj}? Round to the nearest tenth of a foot.`,
      answers: [ans('h', `${fixed(H, 1)} \\text{ ft}`, round1(H))],
      solution: `$\\frac{h}{${objShadow}} = \\frac{${height}}{${shadow}}$, so $h \\approx ${fixed(H, 1)}$ ft.`,
      workLines: 4,
    }
  },
}

const round1 = (v: number) => Math.round(v * 10) / 10

export const similarAreaRatio: Generator = {
  id: 'similar-area-ratio',
  title: 'Similar figures: ratio of areas',
  lessons: ['3B.7', '3B.8'],
  honors: true,
  description: 'If the scale factor is k, areas scale by k². Find an area, or find the scale factor from areas.',
  generate(rng) {
    const fig = rng.pick(['triangles', 'pentagons', 'rectangles', 'hexagons'])
    const p = rng.int(2, 7)
    let q = rng.int(2, 9)
    while (q === p) q = rng.int(2, 9)
    if (rng.bool()) {
      const area1 = p * p * rng.int(1, 6)
      const area2 = (area1 * q * q) / (p * p)
      return {
        type: 'short',
        prompt: `Two similar ${fig} have corresponding sides of length ${p} cm and ${q} cm. The figure with side ${p} cm has an area of ${area1} cm². Find the area of the other figure.`,
        answers: [ans('\\text{Area}', `${fmt(area2)} \\text{ cm}^2`, area2)],
        distractors: [`${fmt((area1 * q) / p)} \\text{ cm}^2`, `${fmt((area1 * q * q * q) / (p * p * p))} \\text{ cm}^2`, `${fmt(area1 + q - p)} \\text{ cm}^2`],
        solution: `Scale factor $k = ${fracLatex(q, p)}$, so the area is multiplied by $k^2 = ${fracLatex(q * q, p * p)}$: $${area1} \\cdot ${fracLatex(q * q, p * p)} = ${fmt(area2)}$ cm².`,
        workLines: 3,
      }
    }
    const a1 = p * p * 3
    const a2 = q * q * 3
    const side = rng.int(2, 6) * p
    const other = (side * q) / p
    return {
      type: 'short',
      prompt: `Two similar ${fig} have areas ${a1} in² and ${a2} in². A side of the first figure is ${side} in. Find the length of the corresponding side of the second figure.`,
      answers: [ans('\\text{side}', `${fmt(other)} \\text{ in}`, other)],
      distractors: [`${fmt((side * a2) / a1)} \\text{ in}`, `${fmt(side + q - p)} \\text{ in}`],
      solution: `Area ratio $${fracLatex(a2, a1)}$, so the scale factor is $\\sqrt{${fracLatex(a2, a1)}} = ${fracLatex(q, p)}$. Side $= ${side} \\cdot ${fracLatex(q, p)} = ${fmt(other)}$ in.`,
      workLines: 3,
    }
  },
}

export const unit3Generators: Generator[] = [
  dilationGrid,
  midsegment,
  sideSplitter,
  similarTriangles,
  nestedTriangles,
  similarityProof,
  pythagorean,
  classifyTriangle,
  altitudeHypotenuse,
  indirectMeasurement,
  similarAreaRatio,
]

