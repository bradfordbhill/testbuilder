import { diagram } from '../diagram/build'
import { polar } from '../diagram/geom'
import { degLabel, lin, toRad } from '../lib/mathfmt'
import { triangleAngles, triangleFromAngles } from './helpers'
import { ans, type Generator, linearFor, numericDistractors, twoLinearFor, letters } from './types'

const solveLin = (a: number, b: number, c: number, d: number) => (d - b) / (a - c)

// ---------------------------------------------------------------- vertical angles / linear pairs

export const verticalAngles: Generator = {
  id: 'vertical-angles',
  types: ['ANG.CHASE'],
  title: 'Vertical angles & linear pairs: solve for x',
  lessons: ['1D.19'],
  description: 'Two intersecting lines with angle expressions. Students set vertical angles equal or a linear pair to 180°.',
  options: [
    {
      key: 'variant',
      label: 'Relationship',
      default: 'any',
      choices: [
        { value: 'any', label: 'Either' },
        { value: 'vertical', label: 'Vertical angles (congruent)' },
        { value: 'linear', label: 'Linear pair (supplementary)' },
      ],
    },
  ],
  generate(rng, opts) {
    const variant = opts.variant === 'any' || !opts.variant ? rng.pick(['vertical', 'linear']) : opts.variant
    const x = rng.int(4, 22)
    const theta = rng.intExcept(28, 152, [90])
    const r = rng.int(-25, 25)
    const [A, B, C, D, O] = ['h1', 'h2', 'h3', 'h4', 'O']
    const d = diagram()
      .pt(O, 0, 0, null, { dot: true })
      .hp(A, polar(3, r).x, polar(3, r).y)
      .hp(B, polar(3, r + 180).x, polar(3, r + 180).y)
      .hp(C, polar(3, r + theta).x, polar(3, r + theta).y)
      .hp(D, polar(3, r + theta + 180).x, polar(3, r + theta + 180).y)
      .line(A, B)
      .line(C, D)
    let e1, e2, other: number, sol: string, wrongX: number
    if (variant === 'vertical') {
      ;[e1, e2] = twoLinearFor(rng, x, theta)
      d.angle(A, O, C, { label: degLabel(lin(e1.a, e1.b)) })
      d.angle(B, O, D, { label: degLabel(lin(e2.a, e2.b)) })
      other = theta
      sol = `Vertical angles are congruent: $${lin(e1.a, e1.b)} = ${lin(e2.a, e2.b)}$, so $x = ${x}$. Each angle measures $${theta}^\\circ$.`
      wrongX = (180 - e1.b - e2.b) / (e1.a + e2.a)
    } else {
      e1 = linearFor(rng, x, theta)
      e2 = linearFor(rng, x, 180 - theta)
      d.angle(A, O, C, { label: degLabel(lin(e1.a, e1.b)) })
      d.angle(C, O, B, { label: degLabel(lin(e2.a, e2.b)) })
      other = 180 - theta
      sol = `The angles form a linear pair, so they are supplementary: $(${lin(e1.a, e1.b)}) + (${lin(e2.a, e2.b)}) = 180$, so $x = ${x}$. The angles measure $${theta}^\\circ$ and $${other}^\\circ$.`
      wrongX = solveLin(e1.a, e1.b, e2.a, e2.b)
    }
    return {
      type: 'short',
      prompt: 'Find the value of $x$. Then find the measure of each labeled angle.',
      diagram: d.build(230, 0.05),
      answers: [ans('x', x), ans('\\text{angles}', variant === 'vertical' ? `${theta}^\\circ` : `${theta}^\\circ,\\ ${other}^\\circ`)],
      distractors: numericDistractors(rng, x, [wrongX, x + 2, x - 3, theta]),
      solution: sol,
      workLines: 4,
    }
  },
}

// ---------------------------------------------------------------- parallel lines and a transversal

type Pos = 'UR' | 'UL' | 'LL' | 'LR'
const PAIRS: Record<string, { name: string; congruent: boolean; pairs: [Pos, Pos][] }> = {
  corresponding: {
    name: 'corresponding angles',
    congruent: true,
    pairs: [
      ['UR', 'UR'],
      ['UL', 'UL'],
      ['LL', 'LL'],
      ['LR', 'LR'],
    ],
  },
  altInterior: {
    name: 'alternate interior angles',
    congruent: true,
    pairs: [
      ['LL', 'UR'],
      ['LR', 'UL'],
    ],
  },
  altExterior: {
    name: 'alternate exterior angles',
    congruent: true,
    pairs: [
      ['UL', 'LR'],
      ['UR', 'LL'],
    ],
  },
  sameSideInterior: {
    name: 'same-side interior angles',
    congruent: false,
    pairs: [
      ['LR', 'UR'],
      ['LL', 'UL'],
    ],
  },
  sameSideExterior: {
    name: 'same-side exterior angles',
    congruent: false,
    pairs: [
      ['UR', 'LR'],
      ['UL', 'LL'],
    ],
  },
}

/** Build the parallel-lines figure. Returns builder plus a function to mark an angle by position. */
function parallelFigure(alpha: number) {
  const gap = 2
  const px = 0
  const qx = px - (gap * Math.cos(toRad(alpha))) / Math.sin(toRad(alpha))
  const lo = Math.min(px, qx) - 2.6
  const hi = Math.max(px, qx) + 2.6
  const dir = polar(1.4, alpha)
  const d = diagram()
    .pt('P', px, gap, null, { dot: true })
    .pt('Q', qx, 0, null, { dot: true })
    .hp('PL', lo, gap)
    .hp('PR', hi, gap)
    .hp('QL', lo, 0)
    .hp('QR', hi, 0)
    .hp('TU', px + dir.x, gap + dir.y)
    .hp('TD', qx - dir.x, -dir.y)
    .line('PL', 'PR', { label: 'ℓ' })
    .line('QL', 'QR', { label: 'm' })
    .line('TD', 'TU', { label: 't' })
  const rays: Record<'P' | 'Q', Record<Pos, [string, string]>> = {
    P: { UR: ['PR', 'TU'], UL: ['TU', 'PL'], LL: ['PL', 'Q'], LR: ['Q', 'PR'] },
    Q: { UR: ['QR', 'P'], UL: ['P', 'QL'], LL: ['QL', 'TD'], LR: ['TD', 'QR'] },
  }
  const measure = (pos: Pos) => (pos === 'UR' || pos === 'LL' ? alpha : 180 - alpha)
  const mark = (at: 'P' | 'Q', pos: Pos, label: string) => {
    const [a, b] = rays[at][pos]
    d.angle(a, at, b, { label })
  }
  return { d, mark, measure }
}

export const parallelTransversal: Generator = {
  id: 'parallel-transversal',
  types: ['ANG.CHASE', 'ANG.NAME_PAIRS'],
  title: 'Parallel lines cut by a transversal: solve for x',
  lessons: ['1D.20'],
  description:
    'Corresponding, alternate interior/exterior, or same-side angles with expressions. Optional converse version ("find x so that ℓ ∥ m").',
  options: [
    {
      key: 'relation',
      label: 'Angle pair',
      default: 'any',
      choices: [
        { value: 'any', label: 'Any' },
        { value: 'corresponding', label: 'Corresponding' },
        { value: 'altInterior', label: 'Alternate interior' },
        { value: 'altExterior', label: 'Alternate exterior' },
        { value: 'sameSideInterior', label: 'Same-side interior' },
        { value: 'sameSideExterior', label: 'Same-side exterior' },
      ],
    },
    {
      key: 'converse',
      label: 'Direction',
      default: 'theorem',
      choices: [
        { value: 'theorem', label: 'Given ℓ ∥ m, find x' },
        { value: 'converse', label: 'Find x so that ℓ ∥ m (converse)' },
      ],
    },
  ],
  generate(rng, opts) {
    const relKey = !opts.relation || opts.relation === 'any' ? rng.pick(Object.keys(PAIRS)) : opts.relation
    const rel = PAIRS[relKey]
    const alpha = rng.intExcept(40, 140, [88, 89, 90, 91, 92])
    const { d, mark, measure } = parallelFigure(alpha)
    const [p1, p2] = rng.pick(rel.pairs)
    const at1 = 'P' as const
    const at2 = 'Q' as const
    const x = rng.int(3, 24)
    const m1 = measure(p1)
    const m2 = measure(p2)
    const e1 = linearFor(rng, x, m1)
    const e2 = linearFor(rng, x, m2, { avoid: [e1.a] })
    mark(at1, p1, degLabel(lin(e1.a, e1.b)))
    mark(at2, p2, degLabel(lin(e2.a, e2.b)))
    const converse = opts.converse === 'converse'
    const prompt = converse
      ? 'Find the value of $x$ that makes $\\ell \\parallel m$. Name the angle relationship you used.'
      : 'In the diagram, $\\ell \\parallel m$. Find the value of $x$ and the measure of each labeled angle.'
    const eq = rel.congruent
      ? `${lin(e1.a, e1.b)} = ${lin(e2.a, e2.b)}`
      : `(${lin(e1.a, e1.b)}) + (${lin(e2.a, e2.b)}) = 180`
    const wrong = rel.congruent
      ? (180 - e1.b - e2.b) / (e1.a + e2.a)
      : solveLin(e1.a, e1.b, e2.a, e2.b)
    const relation = `${rel.name[0].toUpperCase()}${rel.name.slice(1)}`
    const why = converse
      ? `${relation} must be ${rel.congruent ? 'congruent' : 'supplementary'} for the lines to be parallel (converse).`
      : `${relation} are ${rel.congruent ? 'congruent' : 'supplementary'} when lines are parallel.`
    return {
      type: 'short',
      prompt,
      diagram: d.build(260, 0.04),
      answers: [
        ans('x', x),
        converse ? ans('\\text{relationship}', `\\text{${rel.name}}`) : ans('\\text{angles}', `${m1}^\\circ,\\ ${m2}^\\circ`),
      ],
      distractors: numericDistractors(rng, x, [wrong, x + 1, x - 2, m1]),
      solution: `${why} $${eq}$, so $x = ${x}$. The angles measure $${m1}^\\circ$ and $${m2}^\\circ$.`,
      workLines: 4,
    }
  },
}

// ---------------------------------------------------------------- triangle angle sum

export const triangleAngleSum: Generator = {
  id: 'triangle-angle-sum',
  types: ['ANG.CHASE'],
  title: 'Triangle Angle Sum: solve for x',
  lessons: ['1D.21'],
  description: 'Interior angles given as expressions (and possibly one number). Sum is 180°.',
  options: [
    {
      key: 'exprs',
      label: 'Expressions',
      default: '2',
      choices: [
        { value: '1', label: 'One angle has x' },
        { value: '2', label: 'Two angles have x' },
        { value: '3', label: 'All three angles have x' },
      ],
    },
  ],
  generate(rng, opts) {
    const n = Number(opts.exprs || 2)
    const x = rng.int(4, 18)
    const angs = triangleAngles(rng, 40, 95)
    const [A, B, C] = letters(rng, 3)
    const tri = triangleFromAngles(angs[0], angs[1])
    const labels: string[] = []
    const used: number[] = []
    const exprs: string[] = []
    angs.forEach((v, i) => {
      if (i < n) {
        const e = linearFor(rng, x, v, { aMax: 6, maxB: 50, avoid: used, allowOne: true })
        used.push(e.a)
        labels.push(degLabel(lin(e.a, e.b)))
        exprs.push(`(${lin(e.a, e.b)})`)
      } else {
        labels.push(degLabel(v))
        exprs.push(String(v))
      }
    })
    const ids = [A, B, C]
    const pos = [tri.A, tri.B, tri.C]
    const d = diagram()
    ids.forEach((id, i) => d.pt(id, pos[i].x, pos[i].y))
    d.poly(ids)
    d.angle(ids[1], ids[0], ids[2], { label: labels[0] })
    d.angle(ids[2], ids[1], ids[0], { label: labels[1] })
    d.angle(ids[0], ids[2], ids[1], { label: labels[2] })
    return {
      type: 'short',
      prompt: `Find the value of $x$. Then find $m\\angle ${A}$, $m\\angle ${B}$, and $m\\angle ${C}$.`,
      diagram: d.build(320),
      answers: [ans('x', x), ans(`m\\angle ${A}`, `${angs[0]}^\\circ`, angs[0]), ans(`m\\angle ${B}`, `${angs[1]}^\\circ`, angs[1]), ans(`m\\angle ${C}`, `${angs[2]}^\\circ`, angs[2])],
      distractors: numericDistractors(rng, x, [x + 2, x - 2, x + 5, angs[0]]),
      solution: `Triangle Angle Sum Theorem: $${exprs.join(' + ')} = 180$, so $x = ${x}$.`,
      workLines: 5,
    }
  },
}

export const exteriorAngle: Generator = {
  id: 'exterior-angle',
  types: ['ANG.CHASE'],
  title: 'Exterior angle of a triangle: solve for x',
  lessons: ['1D.21'],
  description: 'An exterior angle equals the sum of the two remote interior angles.',
  generate(rng) {
    const x = rng.int(3, 16)
    const [a, b] = [rng.int(40, 75), rng.int(40, 70)]
    const [A, B, C, D] = letters(rng, 4)
    const tri = triangleFromAngles(a, b)
    // Exterior angle at B (extend AB past B); remote interior angles are at A and C.
    const c = 180 - a - b
    const extB = a + c
    const e1 = linearFor(rng, x, a, { aMax: 5 })
    const e2 = linearFor(rng, x, c, { aMax: 5, avoid: [e1.a] })
    const useNumber = rng.bool(0.4)
    const e3 = linearFor(rng, x, extB, { aMax: 9, maxB: 80, avoid: [e1.a, e2.a, e1.a + e2.a] })
    const d = diagram()
      .pt(A, tri.A.x, tri.A.y)
      .pt(B, tri.B.x, tri.B.y)
      .pt(C, tri.C.x, tri.C.y)
      .pt(D, tri.B.x + 2.2, 0)
      .seg(A, D)
      .seg(B, C)
      .seg(C, A)
    const lA = degLabel(lin(e1.a, e1.b))
    const lC = useNumber ? degLabel(c) : degLabel(lin(e2.a, e2.b))
    const lExt = degLabel(lin(e3.a, e3.b))
    d.angle(B, A, C, { label: lA }).angle(A, C, B, { label: lC }).angle(D, B, C, { label: lExt })
    const sumExpr = useNumber ? `(${lin(e1.a, e1.b)}) + ${c}` : `(${lin(e1.a, e1.b)}) + (${lin(e2.a, e2.b)})`
    return {
      type: 'short',
      prompt: `Find the value of $x$. Then find $m\\angle ${C}${B}${D}$.`,
      diagram: d.build(300),
      answers: [ans('x', x), ans(`m\\angle ${C}${B}${D}`, `${extB}^\\circ`, extB)],
      distractors: numericDistractors(rng, x, [x + 3, x - 2, (180 - e3.b - e1.b - (useNumber ? c : e2.b)) / (e3.a + e1.a + (useNumber ? 0 : e2.a))]),
      solution: `Exterior angle = sum of the remote interior angles: $${lin(e3.a, e3.b)} = ${sumExpr}$, so $x = ${x}$ and $m\\angle ${C}${B}${D} = ${extB}^\\circ$.`,
      workLines: 4,
    }
  },
}

// ---------------------------------------------------------------- transformations on the coordinate plane

type Tf = { name: string; latex: string; f: (x: number, y: number) => [number, number] }

const TRANSFORMS: Tf[] = [
  { name: 'reflection across the $x$-axis', latex: 'r_{x\\text{-axis}}', f: (x, y) => [x, -y] },
  { name: 'reflection across the $y$-axis', latex: 'r_{y\\text{-axis}}', f: (x, y) => [-x, y] },
  { name: 'reflection across the line $y = x$', latex: 'r_{y=x}', f: (x, y) => [y, x] },
  { name: 'reflection across the line $y = -x$', latex: 'r_{y=-x}', f: (x, y) => [-y, -x] },
  { name: '$90^\\circ$ counterclockwise rotation about the origin', latex: 'R_{90^\\circ}', f: (x, y) => [-y, x] },
  { name: '$90^\\circ$ clockwise rotation about the origin', latex: 'R_{-90^\\circ}', f: (x, y) => [y, -x] },
  { name: '$180^\\circ$ rotation about the origin', latex: 'R_{180^\\circ}', f: (x, y) => [-x, -y] },
]

export const coordinateTransform: Generator = {
  id: 'coordinate-transform',
  types: ['TRF.DRAW_IMAGE'],
  title: 'Rigid transformations of a triangle on the grid',
  lessons: ['1B.11', '1B.12', '1B.14', '1C.17'],
  description: 'Give the image coordinates under a reflection, rotation, translation, or a sequence of two.',
  options: [
    {
      key: 'steps',
      label: 'Number of transformations',
      default: '1',
      choices: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Sequence of two' },
      ],
    },
    {
      key: 'format',
      label: 'Answer as',
      default: 'blanks',
      choices: [
        { value: 'blanks', label: 'Coordinate blanks' },
        { value: 'table', label: 'Original | Image table' },
      ],
    },
  ],
  generate(rng, opts) {
    const steps = Number(opts.steps || 1)
    const [A, B, C] = letters(rng, 3)
    // A well-shaped triangle (no slivers) off the axes.
    let pts: [number, number][] = []
    for (;;) {
      pts = [0, 1, 2].map(() => [rng.intExcept(-5, 5, [0]), rng.intExcept(-5, 5, [0])] as [number, number])
      const area = Math.abs((pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1]) - (pts[2][0] - pts[0][0]) * (pts[1][1] - pts[0][1]))
      const sides = [0, 1, 2].map((i) => Math.hypot(pts[i][0] - pts[(i + 1) % 3][0], pts[i][1] - pts[(i + 1) % 3][1]))
      if (area >= 6 && Math.min(...sides) >= 2 && area / Math.max(...sides) ** 2 > 0.2) break
    }
    const chosen: Tf[] = []
    const descs: string[] = []
    for (let i = 0; i < steps; i++) {
      if (rng.bool(0.25)) {
        const dx = rng.intExcept(-5, 5, [0])
        const dy = rng.intExcept(-5, 5, [0])
        chosen.push({ name: '', latex: '', f: (x, y) => [x + dx, y + dy] })
        descs.push(`translation by the directed segment from $(0, 0)$ to $(${dx}, ${dy})$`)
      } else {
        const t = rng.pick(TRANSFORMS)
        chosen.push(t)
        descs.push(t.name)
      }
    }
    const image = pts.map(([x, y]) => chosen.reduce<[number, number]>((p, t) => t.f(p[0], p[1]), [x, y]))
    const prime = "'".repeat(steps)
    const d = diagram().withGrid({ xmin: -9.5, xmax: 9.5, ymin: -9.5, ymax: 9.5 }, { numberEvery: 2 })
    ;[A, B, C].forEach((id, i) => d.pt(id, pts[i][0], pts[i][1]))
    d.poly([A, B, C])
    const prompt =
      steps === 1
        ? `Triangle $${A}${B}${C}$ is transformed by a ${descs[0]}. Give the coordinates of $${A}${prime}$, $${B}${prime}$, and $${C}${prime}$, and draw the image.`
        : `Triangle $${A}${B}${C}$ is transformed by a ${descs[0]}, followed by a ${descs[1]}. Give the coordinates of $${A}${prime}$, $${B}${prime}$, and $${C}${prime}$, and draw the final image.`
    if (opts.format === 'table') {
      return {
        type: 'table',
        prompt: prompt.replace(/Give the coordinates of[^,]*, [^,]*, and [^ ]* /, 'Complete the table '),
        diagram: d.build(250),
        diagramPos: 'right',
        headers: ['Original', `Image after ${steps === 1 ? 'the transformation' : 'both transformations'}`],
        rows: [A, B, C].map((id, i) => [
          { value: `$${id}(${pts[i][0]}, ${pts[i][1]})$`, given: true },
          { value: `$${id}${prime}(${image[i][0]}, ${image[i][1]})$`, given: false },
        ]),
      }
    }
    return {
      type: 'short',
      prompt,
      diagram: d.build(250),
      diagramPos: 'right',
      answers: [A, B, C].map((id, i) => ans(`${id}${prime}`, `(${image[i][0]}, ${image[i][1]})`)),
      solution: `Original: ${[A, B, C].map((id, i) => `$${id}(${pts[i][0]}, ${pts[i][1]})$`).join(', ')}.`,
      workLines: 2,
    }
  },
}

// ---------------------------------------------------------------- symmetry of regular polygons

const POLY_NAMES: Record<number, string> = {
  3: 'equilateral triangle',
  4: 'square',
  5: 'regular pentagon',
  6: 'regular hexagon',
  8: 'regular octagon',
  9: 'regular nonagon',
  10: 'regular decagon',
  12: 'regular dodecagon',
}

export const polygonSymmetry: Generator = {
  id: 'polygon-symmetry',
  types: ['TRF.SYMMETRY'],
  title: 'Symmetry of regular polygons',
  lessons: ['1C.15', '1C.16'],
  description: 'Lines of symmetry, smallest rotation angle, and which rotations map the polygon onto itself.',
  generate(rng) {
    const n = rng.pick([3, 4, 5, 6, 8, 9, 10, 12])
    const name = POLY_NAMES[n]
    const smallest = 360 / n
    const k = rng.int(2, n - 1)
    const test = rng.bool() ? smallest * k : smallest * k + rng.pick([10, 15, 20])
    const works = test % smallest === 0
    const d = diagram()
    const ids: string[] = []
    for (let i = 0; i < n; i++) {
      const p = polar(2, 90 + (360 / n) * i)
      const id = `V${i}`
      ids.push(id)
      d.hp(id, p.x, p.y)
    }
    d.poly(ids).pt('O', 0, 0, null, { dot: true })
    return {
      type: 'short',
      prompt: `Consider a ${name} with center $O$.\n\n(a) How many lines of symmetry does it have?\n\n(b) What is the smallest positive angle of rotation about $O$ that takes the polygon onto itself?\n\n(c) Does a rotation of $${test}^\\circ$ about $O$ take the polygon onto itself? Explain.`,
      diagram: d.build(150),
      answers: [
        ans('(a)', n),
        ans('(b)', `${smallest}^\\circ`, smallest),
        ans('(c)', works ? `\\text{Yes, } ${test} = ${test / smallest} \\cdot ${smallest}` : `\\text{No, } ${test} \\text{ is not a multiple of } ${smallest}`),
      ],
      workLines: 3,
    }
  },
}

export const unit1Generators: Generator[] = [
  verticalAngles,
  parallelTransversal,
  triangleAngleSum,
  exteriorAngle,
  coordinateTransform,
  polygonSymmetry,
]
