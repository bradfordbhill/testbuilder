// Generators written to cover problem-catalog types (src/data/problem-types.yaml) that had none.
import { diagram } from '../diagram/build'
import { polar } from '../diagram/geom'
import { fixed, fmt, fracLatex, gcd, lin, toDeg, toRad } from '../lib/mathfmt'
import type { Rng } from '../lib/rng'
import type { TFItem } from '../model/types'
import { rot, triangleFromSides } from './helpers'
import { ans, type Generator, letters, linearFor } from './types'
import { splitterFigure } from './unit3'

const seg = (a: string, b: string) => `\\overline{${a}${b}}`
const ang = (a: string) => `\\angle ${a}`
const L7 = 'abcdefg'
const partLetter = (i: number) => String.fromCharCode(97 + i)

// =============================================================== Unit 1 / angles / transformations

type Pos = 'UR' | 'UL' | 'LL' | 'LR'
const NUM: Record<'P' | 'Q', Record<Pos, number>> = {
  P: { UL: 1, UR: 2, LL: 3, LR: 4 },
  Q: { UL: 5, UR: 6, LL: 7, LR: 8 },
}
const RELATIONS: { name: string; pairs: [number, number][] }[] = [
  { name: 'corresponding angles', pairs: [[1, 5], [2, 6], [3, 7], [4, 8]] },
  { name: 'alternate interior angles', pairs: [[3, 6], [4, 5]] },
  { name: 'alternate exterior angles', pairs: [[1, 8], [2, 7]] },
  { name: 'same-side interior angles', pairs: [[3, 5], [4, 6]] },
  { name: 'vertical angles', pairs: [[1, 4], [2, 3], [5, 8], [6, 7]] },
  { name: 'a linear pair', pairs: [[1, 2], [2, 4], [3, 4], [1, 3], [5, 6], [6, 8], [7, 8], [5, 7]] },
]

export const angleNamePairs: Generator = {
  id: 'angle-name-pairs',
  types: ['ANG.NAME_PAIRS'],
  title: 'Name angle-pair relationships (parallel lines)',
  lessons: ['1D.19', '1D.20'],
  description: 'Eight numbered angles at two parallel lines and a transversal. Name a pair of each kind, or name the relationship of a given pair.',
  options: [
    {
      key: 'mode',
      label: 'Task',
      default: 'mixed',
      choices: [
        { value: 'mixed', label: 'Mixed' },
        { value: 'name', label: 'Name a pair of each kind' },
        { value: 'identify', label: 'Identify the relationship' },
      ],
    },
  ],
  generate(rng, opts) {
    const alpha = rng.int(55, 125)
    const gap = 2.2
    const qx = -(gap * Math.cos(toRad(alpha))) / Math.sin(toRad(alpha))
    const dir = polar(1.6, alpha)
    const d = diagram()
      .pt('P', 0, gap, null, { dot: true })
      .pt('Q', qx, 0, null, { dot: true })
      .hp('PL', Math.min(0, qx) - 3, gap)
      .hp('PR', Math.max(0, qx) + 3, gap)
      .hp('QL', Math.min(0, qx) - 3, 0)
      .hp('QR', Math.max(0, qx) + 3, 0)
      .hp('TU', dir.x, gap + dir.y)
      .hp('TD', qx - dir.x, -dir.y)
      .line('PL', 'PR', { label: 'ℓ', arrows: 1 })
      .line('QL', 'QR', { label: 'm', arrows: 1 })
      .line('TD', 'TU', { label: 't' })
    const rays: Record<'P' | 'Q', Record<Pos, [string, string]>> = {
      P: { UR: ['PR', 'TU'], UL: ['TU', 'PL'], LL: ['PL', 'Q'], LR: ['Q', 'PR'] },
      Q: { UR: ['QR', 'P'], UL: ['P', 'QL'], LL: ['QL', 'TD'], LR: ['TD', 'QR'] },
    }
    for (const at of ['P', 'Q'] as const)
      for (const pos of ['UL', 'UR', 'LL', 'LR'] as Pos[]) {
        const [a, b] = rays[at][pos]
        d.angle(a, at, b, { arcs: 0, label: String(NUM[at][pos]), size: 10 })
      }
    const mode = !opts.mode || opts.mode === 'mixed' ? null : opts.mode
    const rels = rng.shuffle(RELATIONS).slice(0, 4)
    const parts: string[] = []
    const answers = rels.map((r, i) => {
      const m = mode ?? (rng.bool() ? 'name' : 'identify')
      const label = `(${partLetter(i)})`
      if (m === 'name') {
        parts.push(r.name === 'a linear pair' ? `${label} Name two angles that form a linear pair.` : `${label} Name a pair of ${r.name}.`)
        const all = r.pairs.map(([a, b]) => `\\angle ${a}, \\angle ${b}`).join(';\\ ')
        return ans(label, `\\text{any of: } ${all}`)
      }
      const [a, b] = rng.pick(r.pairs)
      parts.push(`${label} $\\angle ${a}$ and $\\angle ${b}$ are ________.`)
      return ans(label, `\\text{${r.name}}`)
    })
    return {
      type: 'short',
      prompt: `In the diagram, $\\ell \\parallel m$ and $t$ is a transversal.\n\n${parts.join('\n')}`,
      diagram: d.build(270, 0.04),
      answers,
      workLines: 1,
    }
  },
}

// Rigid transformations on the coordinate grid ------------------------------------------------

type Pt = [number, number]
interface Tf {
  desc: string
  f: (p: Pt) => Pt
}

function randomTriangle(rng: Rng, range = 5): Pt[] {
  for (;;) {
    const pts: Pt[] = [0, 1, 2].map(() => [rng.int(-range, range), rng.int(-range, range)])
    const area = Math.abs((pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1]) - (pts[2][0] - pts[0][0]) * (pts[1][1] - pts[0][1]))
    const sides = [0, 1, 2].map((i) => Math.hypot(pts[i][0] - pts[(i + 1) % 3][0], pts[i][1] - pts[(i + 1) % 3][1]))
    if (area >= 6 && Math.min(...sides) >= 2 && area / Math.max(...sides) ** 2 > 0.2) return pts
  }
}

function rigidTf(rng: Rng): Tf {
  const k = rng.int(0, 6)
  if (k === 0) {
    const dx = rng.intExcept(-6, 6, [0])
    const dy = rng.intExcept(-6, 6, [0])
    return { desc: `translation by the directed segment from $(0, 0)$ to $(${dx}, ${dy})$ (${Math.abs(dx)} ${dx > 0 ? 'right' : 'left'}, ${Math.abs(dy)} ${dy > 0 ? 'up' : 'down'})`, f: ([x, y]) => [x + dx, y + dy] }
  }
  if (k === 1) {
    const c = rng.intExcept(-3, 3, [0])
    return { desc: `reflection across the line $x = ${c}$`, f: ([x, y]) => [2 * c - x, y] }
  }
  if (k === 2) {
    const c = rng.intExcept(-3, 3, [0])
    return { desc: `reflection across the line $y = ${c}$`, f: ([x, y]) => [x, 2 * c - y] }
  }
  if (k === 3) return { desc: 'reflection across the line $y = x$', f: ([x, y]) => [y, x] }
  if (k === 4) return { desc: '$90^\\circ$ counterclockwise rotation using the origin as the center', f: ([x, y]) => [-y, x] }
  if (k === 5) return { desc: '$90^\\circ$ clockwise rotation using the origin as the center', f: ([x, y]) => [y, -x] }
  return { desc: '$180^\\circ$ rotation using the origin as the center', f: ([x, y]) => [-x, -y] }
}

function gridWith(pts: Pt[], img: Pt[], names: string[], prime = "'") {
  const d = diagram().withGrid({ xmin: -10.5, xmax: 10.5, ymin: -10.5, ymax: 10.5 }, { numberEvery: 2 })
  names.forEach((n, i) => d.pt(n, pts[i][0], pts[i][1]))
  names.forEach((n, i) => d.pt(n + prime, img[i][0], img[i][1]))
  d.poly(names).poly(names.map((n) => n + prime))
  return d
}

const inRange = (pts: Pt[], r = 10) => pts.every(([x, y]) => Math.abs(x) <= r && Math.abs(y) <= r)

export const describeSequence: Generator = {
  id: 'describe-sequence',
  types: ['TRF.DESCRIBE_SEQUENCE'],
  title: 'Describe a sequence of transformations',
  lessons: ['1C.17', '3B.6', '3B.7'],
  description: 'A triangle and its image on a grid. Students precisely describe a sequence (every center, angle, direction, line and vector) that takes one onto the other. Similarity option adds a dilation.',
  options: [
    {
      key: 'kind',
      label: 'Sequence',
      default: 'rigid2',
      choices: [
        { value: 'rigid1', label: 'One rigid transformation' },
        { value: 'rigid2', label: 'Two rigid transformations' },
        { value: 'similarity', label: 'Dilation + rigid (similarity)' },
      ],
    },
  ],
  generate(rng, opts) {
    const kind = opts.kind || 'rigid2'
    const names = letters(rng, 3)
    for (;;) {
      const pts = randomTriangle(rng, kind === 'similarity' ? 3 : 5)
      const steps: Tf[] = []
      if (kind === 'similarity') {
        const k = rng.pick([2, 3, 0.5])
        steps.push({ desc: `dilation using the origin as the center with scale factor $${k === 0.5 ? '\\frac{1}{2}' : k}$`, f: ([x, y]) => [x * k, y * k] })
        steps.push(rigidTf(rng))
        if (k === 0.5 && pts.some(([x, y]) => x % 2 || y % 2)) continue
      } else {
        steps.push(rigidTf(rng))
        if (kind === 'rigid2') steps.push(rigidTf(rng))
      }
      const img = pts.map((p) => steps.reduce((q, s) => s.f(q), p))
      if (!inRange(img) || img.every((p, i) => p[0] === pts[i][0] && p[1] === pts[i][1])) continue
      // Keep the image clearly apart from the original so both triangles are readable.
      const cen = (q: Pt[]) => [(q[0][0] + q[1][0] + q[2][0]) / 3, (q[0][1] + q[1][1] + q[2][1]) / 3]
      const [c1, c2] = [cen(pts), cen(img)]
      if (Math.hypot(c1[0] - c2[0], c1[1] - c2[1]) < 4) continue
      const prime = "'"
      const d = gridWith(pts, img, names, prime)
      return {
        type: 'free',
        prompt: `Describe a sequence of transformations that takes $\\triangle ${names.join('')}$ onto $\\triangle ${names.map((n) => n + prime).join('')}$. Be precise: give every center, angle and direction, line, vector${kind === 'similarity' ? ', and scale factor' : ''}.`,
        diagram: d.build(270),
        diagramPos: 'right',
        answer: `One correct sequence: ${steps.map((s, i) => `(${i + 1}) ${s.desc}`).join('; then ')}. Other sequences are correct if they take each vertex to its image.`,
        workLines: 5,
      }
    }
  },
}

export const findTransformElement: Generator = {
  id: 'find-transform-element',
  types: ['TRF.FIND_ELEMENT'],
  title: 'Find the line of reflection, center of rotation, or translation',
  lessons: ['1B.11', '1B.12', '1B.13', '1B.14'],
  description: 'A triangle and its image on a grid; students find the reflection line, the rotation center and angle, or the translation.',
  options: [
    {
      key: 'kind',
      label: 'Find',
      default: 'any',
      choices: [
        { value: 'any', label: 'Any' },
        { value: 'reflection', label: 'Line of reflection' },
        { value: 'rotation', label: 'Center and angle of rotation' },
        { value: 'translation', label: 'Translation' },
      ],
    },
  ],
  generate(rng, opts) {
    const kind = !opts.kind || opts.kind === 'any' ? rng.pick(['reflection', 'rotation', 'translation']) : opts.kind
    const names = letters(rng, 3)
    for (;;) {
      const pts = randomTriangle(rng, 6)
      let img: Pt[]
      let answer: string
      let prompt: string
      if (kind === 'reflection') {
        const which = rng.pick(['x', 'y', 'y=x', 'y=-x'])
        const c = rng.int(-3, 3)
        const f: (p: Pt) => Pt =
          which === 'x' ? ([x, y]) => [2 * c - x, y] : which === 'y' ? ([x, y]) => [x, 2 * c - y] : which === 'y=x' ? ([x, y]) => [y, x] : ([x, y]) => [-y, -x]
        img = pts.map(f)
        answer = which === 'x' ? `x = ${c}` : which === 'y' ? `y = ${c}` : which === 'y=x' ? 'y = x' : 'y = -x'
        prompt = 'is the image of the original triangle under a reflection. Draw the line of reflection and give its equation.'
      } else if (kind === 'rotation') {
        const h = rng.int(-3, 3)
        const k = rng.int(-3, 3)
        const turn = rng.pick([90, -90, 180])
        img = pts.map(([x, y]) => (turn === 180 ? [2 * h - x, 2 * k - y] : turn === 90 ? [h - (y - k), k + (x - h)] : [h + (y - k), k - (x - h)]))
        answer = `\\text{center } (${h}, ${k}),\\ ${turn === 180 ? '180^\\circ' : turn === 90 ? '90^\\circ \\text{ counterclockwise}' : '90^\\circ \\text{ clockwise}'}`
        prompt = 'is the image of the original triangle under a rotation. Find the center of rotation and the angle and direction.'
      } else {
        const dx = rng.intExcept(-6, 6, [0])
        const dy = rng.intExcept(-6, 6, [0])
        img = pts.map(([x, y]) => [x + dx, y + dy])
        answer = `\\text{${Math.abs(dx)} ${dx > 0 ? 'right' : 'left'}, ${Math.abs(dy)} ${dy > 0 ? 'up' : 'down'} (directed segment from } (0,0) \\text{ to } (${dx}, ${dy}))`
        prompt = 'is the image of the original triangle under a translation. Describe the translation and draw its directed segment.'
      }
      if (!inRange(img) || img.some((p, i) => p[0] === pts[i][0] && p[1] === pts[i][1])) continue
      const d = gridWith(pts, img, names)
      return {
        type: 'short',
        prompt: `$\\triangle ${names.map((n) => n + "'").join('')}$ ${prompt}`,
        diagram: d.build(270),
        diagramPos: 'right',
        answers: [ans(undefined, answer)],
        workLines: 2,
      }
    }
  },
}

const DEFINITION_ITEMS: { q: string; correct: string; wrong: string[] }[] = [
  {
    q: 'Which statement is the definition of congruent figures?',
    correct: 'One figure can be taken onto the other by a sequence of rigid transformations.',
    wrong: ['The figures have the same shape.', 'The figures have the same area and perimeter.', 'One figure is a dilation of the other.'],
  },
  {
    q: 'Which transformation is NOT a rigid transformation?',
    correct: 'A dilation with scale factor 2',
    wrong: ['A reflection across a line', 'A rotation of 90° about a point', 'A translation by a directed segment'],
  },
  {
    q: 'Which property can change under a rigid transformation?',
    correct: 'The orientation (clockwise order) of the vertices',
    wrong: ['The distance between two points', 'The measure of an angle', 'Whether two lines are parallel'],
  },
  {
    q: 'A reflection across line ℓ takes point P to P′ (P not on ℓ). Which must be true?',
    correct: 'ℓ is the perpendicular bisector of the segment PP′.',
    wrong: ['P′ is on line ℓ.', 'PP′ is parallel to ℓ.', 'P and P′ are the same distance from every point of the plane.'],
  },
  {
    q: 'A rotation using center O takes point P to P′. Which must be true?',
    correct: 'OP = OP′',
    wrong: ['PP′ = OP', 'P′ is on ray OP', 'O is the midpoint of PP′'],
  },
  {
    q: 'A translation takes A to A′ and B to B′. Which must be true?',
    correct: 'AA′ and BB′ are parallel (or on the same line) and congruent.',
    wrong: ['AA′ and BB′ intersect.', 'AA′ is perpendicular to AB.', 'A′B′ is twice AB.'],
  },
  {
    q: 'Which sequence always takes a figure onto a congruent copy?',
    correct: 'A reflection followed by a rotation',
    wrong: ['A rotation followed by a dilation with scale factor 3', 'A dilation with scale factor ½ followed by a translation', 'Any dilation'],
  },
]

export const definitionCheck: Generator = {
  id: 'definition-check',
  types: ['TRF.DEFINITION_CHECK'],
  title: 'Definitions: rigid motion, reflection, rotation, congruence',
  lessons: ['1B.10', '1B.11', '1B.14', '2A.1'],
  description: 'Multiple choice on the course definitions (congruent = a sequence of rigid motions; reflection via perpendicular bisector; rotation keeps distance to the center).',
  generate(rng) {
    const item = rng.pick(DEFINITION_ITEMS)
    const choices = rng.shuffle([item.correct, ...item.wrong])
    return { type: 'mc', prompt: item.q, choices, correct: choices.indexOf(item.correct) }
  },
}

// =============================================================== Unit 2: criteria and quadrilaterals

export const enoughInfo: Generator = {
  id: 'enough-info',
  types: ['CRIT.ENOUGH_INFO', 'CRIT.WHICH_CONGRUENCE'],
  title: 'Must the triangles be congruent? (enough information)',
  lessons: ['2B.6', '2B.7', '2B.9', '2B.11'],
  description: 'Given three congruence facts in words and symbols (no figure), decide whether the triangles must be congruent and by which criterion; SSA and AAA are “not necessarily”.',
  generate(rng) {
    const [A, B, C, D, E, F] = letters(rng, 6)
    // Correspondence A↔D, B↔E, C↔F. Sides: AB↔DE, BC↔EF, CA↔FD. Angles at each vertex.
    const sides: [string, string][] = [
      [`${seg(A, B)} \\cong ${seg(D, E)}`, 'AB'],
      [`${seg(B, C)} \\cong ${seg(E, F)}`, 'BC'],
      [`${seg(C, A)} \\cong ${seg(F, D)}`, 'CA'],
    ]
    const angles: Record<string, string> = { A: `${ang(A)} \\cong ${ang(D)}`, B: `${ang(B)} \\cong ${ang(E)}`, C: `${ang(C)} \\cong ${ang(F)}` }
    // included angle between two sides
    const included: Record<string, string> = { 'AB,BC': 'B', 'BC,CA': 'C', 'AB,CA': 'A' }
    const kind = rng.pick(['SSS', 'SAS', 'ASA', 'SSA', 'AAA'])
    let facts: string[] = []
    if (kind === 'SSS') facts = sides.map((s) => s[0])
    if (kind === 'SAS' || kind === 'SSA') {
      const pair = rng.pick([[0, 1], [1, 2], [0, 2]])
      const key = pair.map((i) => sides[i][1]).join(',')
      const inc = included[key]
      const other = ['A', 'B', 'C'].filter((x) => x !== inc)
      facts = [sides[pair[0]][0], sides[pair[1]][0], angles[kind === 'SAS' ? inc : rng.pick(other)]]
    }
    if (kind === 'ASA') {
      const s = rng.int(0, 2)
      const ends = sides[s][1].split('') // e.g. ['A','B']
      facts = [angles[ends[0]], sides[s][0], angles[ends[1]]]
    }
    if (kind === 'AAA') facts = ['A', 'B', 'C'].map((v) => angles[v])
    facts = rng.shuffle(facts)
    const choices = ['\\text{Yes, by SSS}', '\\text{Yes, by SAS}', '\\text{Yes, by ASA}', '\\text{Not necessarily}']
    const correct = kind === 'SSS' ? 0 : kind === 'SAS' ? 1 : kind === 'ASA' ? 2 : 3
    return {
      type: 'mc',
      prompt: `In $\\triangle ${A}${B}${C}$ and $\\triangle ${D}${E}${F}$: $${facts.join('$, $')}$. Must $\\triangle ${A}${B}${C} \\cong \\triangle ${D}${E}${F}$?`,
      choices,
      correct,
      solution: correct === 3 ? `The facts give ${kind}, which is not a congruence criterion. A sketch with a swinging side (SSA) or a dilated copy (AAA) is a counterexample.` : `The facts match ${kind}${kind === 'SAS' ? ' (the angle is between the two sides)' : kind === 'ASA' ? ' (the side is between the two angles)' : ''}.`,
    }
  },
}

const QUAD_MCC: { facts: string; targets: [string, 'must' | 'could' | 'cant', string][] }[] = [
  {
    facts: 'a parallelogram with one right angle',
    targets: [
      ['rectangle', 'must', 'Consecutive angles are supplementary, so all four angles are right angles.'],
      ['square', 'could', 'Only if its sides are also all congruent.'],
      ['rhombus', 'could', 'Only if it is a square.'],
      ['trapezoid', 'cant', 'A trapezoid has exactly one pair of parallel sides; a parallelogram has two.'],
    ],
  },
  {
    facts: 'a parallelogram whose diagonals are perpendicular',
    targets: [
      ['rhombus', 'must', 'A parallelogram with perpendicular diagonals is a rhombus.'],
      ['kite', 'must', 'It is a rhombus, and every rhombus is a kite.'],
      ['square', 'could', 'Only if it also has a right angle.'],
      ['rectangle', 'could', 'Only if it is a square.'],
    ],
  },
  {
    facts: 'a parallelogram whose diagonals are congruent',
    targets: [
      ['rectangle', 'must', 'A parallelogram with congruent diagonals is a rectangle.'],
      ['rhombus', 'could', 'Only if it is a square.'],
      ['square', 'could', 'Only if its sides are all congruent.'],
    ],
  },
  {
    facts: 'a quadrilateral with four congruent sides',
    targets: [
      ['rhombus', 'must', 'That is the definition of a rhombus.'],
      ['parallelogram', 'must', 'Both pairs of opposite sides are congruent.'],
      ['kite', 'must', 'It has two pairs of congruent adjacent sides.'],
      ['square', 'could', 'Only if it has a right angle.'],
      ['trapezoid', 'cant', 'It is a parallelogram, so it has two pairs of parallel sides.'],
    ],
  },
  {
    facts: 'a quadrilateral with exactly one pair of parallel sides',
    targets: [
      ['trapezoid', 'must', 'That is the definition of a trapezoid (exclusive).'],
      ['isosceles trapezoid', 'could', 'Only if its legs are congruent.'],
      ['parallelogram', 'cant', 'A parallelogram has two pairs of parallel sides.'],
      ['kite', 'cant', 'A kite with a pair of parallel sides is a rhombus, which has two pairs.'],
    ],
  },
  {
    facts: 'a quadrilateral whose diagonals bisect each other',
    targets: [
      ['parallelogram', 'must', 'Diagonals that bisect each other make a parallelogram.'],
      ['rectangle', 'could', 'Only if the diagonals are also congruent.'],
      ['kite', 'could', 'Only if it is a rhombus.'],
      ['trapezoid', 'cant', 'It is a parallelogram, which has two pairs of parallel sides.'],
    ],
  },
  {
    facts: 'a rhombus with one right angle',
    targets: [
      ['square', 'must', 'A rhombus is a parallelogram, so all angles are right angles.'],
      ['rectangle', 'must', 'All four angles are right angles.'],
    ],
  },
  {
    facts: 'a rectangle whose diagonals are perpendicular',
    targets: [
      ['square', 'must', 'A parallelogram with perpendicular diagonals is a rhombus; a rhombus that is a rectangle is a square.'],
      ['rhombus', 'must', 'A parallelogram with perpendicular diagonals is a rhombus.'],
    ],
  },
  {
    facts: 'a quadrilateral with three right angles',
    targets: [
      ['rectangle', 'must', 'The fourth angle is 360° − 270° = 90°.'],
      ['square', 'could', 'Only if all sides are congruent.'],
      ['trapezoid', 'cant', 'It is a rectangle, which has two pairs of parallel sides.'],
    ],
  },
  {
    facts: 'a quadrilateral with perpendicular diagonals that bisect each other',
    targets: [
      ['rhombus', 'must', 'It is a parallelogram with perpendicular diagonals.'],
      ['square', 'could', 'Only if the diagonals are also congruent.'],
      ['rectangle', 'could', 'Only if it is a square.'],
    ],
  },
  {
    facts: 'a quadrilateral with both pairs of opposite angles congruent',
    targets: [
      ['parallelogram', 'must', 'Both pairs of opposite angles congruent makes a parallelogram.'],
      ['rectangle', 'could', 'Only if the angles are right angles.'],
      ['kite', 'could', 'Only if it is a rhombus.'],
    ],
  },
  {
    facts: 'a trapezoid',
    targets: [
      ['parallelogram', 'cant', 'Trapezoids have exactly one pair of parallel sides.'],
      ['isosceles trapezoid', 'could', 'Only if the legs are congruent.'],
      ['rectangle', 'cant', 'A rectangle has two pairs of parallel sides.'],
    ],
  },
]

export const quadMustCouldCant: Generator = {
  id: 'quad-must-could-cant',
  types: ['QUAD.MUST_COULD_CANT'],
  title: 'Must, could, or can’t be (quadrilaterals)',
  lessons: ['2C.12', '2C.14', '2D.15'],
  description: 'Given facts about a quadrilateral, decide whether it must, could, or can’t be a given type. Trapezoid exclusive; kite inclusive.',
  generate(rng) {
    const item = rng.pick(QUAD_MCC)
    const [target, answer, why] = rng.pick(item.targets)
    const an = /^[aeiou]/.test(target) ? 'an' : 'a'
    const choices = [`It must be ${an} ${target}.`, `It could be ${an} ${target}, but it doesn’t have to be.`, `It can’t be ${an} ${target}.`]
    return {
      type: 'mc',
      prompt: `A figure is ${item.facts}. Which is true? Justify your choice.`,
      choices,
      correct: answer === 'must' ? 0 : answer === 'could' ? 1 : 2,
      solution: why,
      workLines: 2,
    }
  },
}

const QUADS = ['trapezoid', 'isosceles trapezoid', 'parallelogram', 'rhombus', 'rectangle', 'square', 'kite']
const QUAD_PROPS: { prop: string; has: string[] }[] = [
  { prop: '$180^\\circ$ rotational symmetry', has: ['parallelogram', 'rhombus', 'rectangle', 'square'] },
  { prop: 'at least one line of symmetry', has: ['isosceles trapezoid', 'rhombus', 'rectangle', 'square', 'kite'] },
  { prop: 'perpendicular diagonals', has: ['rhombus', 'square', 'kite'] },
  { prop: 'congruent diagonals', has: ['isosceles trapezoid', 'rectangle', 'square'] },
  { prop: 'diagonals that bisect each other', has: ['parallelogram', 'rhombus', 'rectangle', 'square'] },
  { prop: 'two pairs of parallel sides', has: ['parallelogram', 'rhombus', 'rectangle', 'square'] },
  { prop: 'at least one pair of parallel sides', has: ['trapezoid', 'isosceles trapezoid', 'parallelogram', 'rhombus', 'rectangle', 'square'] },
  { prop: 'four congruent sides', has: ['rhombus', 'square'] },
  { prop: 'both pairs of opposite angles congruent', has: ['parallelogram', 'rhombus', 'rectangle', 'square'] },
  { prop: 'a diagonal that bisects two of its angles', has: ['rhombus', 'square', 'kite'] },
]

export const quadSelectProperties: Generator = {
  id: 'quad-select-properties',
  types: ['QUAD.SELECT_PROPERTIES', 'TRF.SYMMETRY'],
  title: 'Select all quadrilaterals with a property',
  lessons: ['1C.16', '2C.12', '2C.14', '2D.15'],
  description: 'Select every quadrilateral type that ALWAYS has a property (symmetry, diagonals, parallel sides…). Trapezoid exclusive, kite inclusive.',
  generate(rng) {
    const p = rng.pick(QUAD_PROPS)
    const list = rng.shuffle(QUADS)
    const letters7 = list.map((q, i) => `(${L7[i]}) ${q}`).join(' ')
    const correct = list.map((q, i) => (p.has.includes(q) ? L7[i] : null)).filter(Boolean).join(', ')
    return {
      type: 'short',
      prompt: `Select **all** quadrilaterals that always have ${p.prop}.\n\n${letters7}`,
      answers: [ans('\\text{Answer}', `\\text{${correct}}`)],
      solution: `Trapezoids are exclusive (exactly one pair of parallel sides); a rhombus is a kite and a square is both a rectangle and a rhombus.`,
      workLines: 1,
    }
  },
}

// =============================================================== Unit 3: dilations and similarity

export const scaledCopy: Generator = {
  id: 'scaled-copy',
  types: ['DIL.SCALED_COPY'],
  title: 'Is it a scaled copy? Find the scale factor',
  lessons: ['3A.1'],
  description: 'Two triangles with side lengths; decide whether the second is a scaled copy and give k, or show the ratios differ.',
  generate(rng) {
    const [num, den] = rng.pick([
      [2, 1],
      [3, 1],
      [3, 2],
      [1, 2],
      [5, 2],
      [4, 3],
    ])
    const base = [rng.int(2, 6), rng.int(3, 7), rng.int(4, 8)].map((v) => v * den)
    if (base[0] + base[1] <= base[2] || new Set(base).size < 3) return scaledCopy.generate(rng, {})
    const yes = rng.bool()
    const copy = base.map((v) => (v * num) / den)
    if (!yes) copy[rng.int(0, 2)] += rng.pick([1, 2, -1])
    const t1 = triangleFromSides(base[1], base[2], base[0])
    const t2 = triangleFromSides(copy[1], copy[2], copy[0])
    if (!Number.isFinite(t2.C.y) || t2.C.y <= 0.05) return scaledCopy.generate(rng, {})
    const [A, B, C, D, E, F] = letters(rng, 6)
    const s = 3 / Math.max(...base)
    const s2 = s
    const off = Math.max(t1.B.x, t1.C.x) * s + 1.4
    const d = diagram()
      .pt(A, t1.A.x * s, t1.A.y * s)
      .pt(B, t1.B.x * s, t1.B.y * s)
      .pt(C, t1.C.x * s, t1.C.y * s)
      .pt(D, t2.A.x * s2 + off, t2.A.y * s2)
      .pt(E, t2.B.x * s2 + off, t2.B.y * s2)
      .pt(F, t2.C.x * s2 + off, t2.C.y * s2)
      .seg(A, B, { label: String(base[0]) })
      .seg(B, C, { label: String(base[1]) })
      .seg(C, A, { label: String(base[2]) })
      .seg(D, E, { label: fmt(copy[0]) })
      .seg(E, F, { label: fmt(copy[1]) })
      .seg(F, D, { label: fmt(copy[2]) })
    const ratios = copy.map((c, i) => fracLatex(Math.round(c * den * 2), base[i] * den * 2))
    return {
      type: 'short',
      prompt: `Is $\\triangle ${D}${E}${F}$ a scaled copy of $\\triangle ${A}${B}${C}$ (with $${A} \\to ${D}$, $${B} \\to ${E}$, $${C} \\to ${F}$)? If so, give the scale factor. If not, explain why not.`,
      diagram: d.noScale().build(330, 0.12),
      diagramPos: 'below',
      answers: [ans(undefined, yes ? `\\text{Yes, } k = ${fracLatex(num, den)}` : `\\text{No: the ratios } ${ratios.join(', ')} \\text{ are not all equal}`)],
      solution: `Compare corresponding sides: ${ratios.map((r, i) => `$\\frac{${fmt(copy[i])}}{${base[i]}} = ${r}$`).join(', ')}.`,
      workLines: 3,
    }
  },
}

export const scaleModel: Generator = {
  id: 'scale-model',
  types: ['DIL.SCALE_MODEL'],
  title: 'Scale drawings, maps and models',
  lessons: ['3A.1', '3A.2'],
  description: 'Map scales (1 in : 2.5 mi), model ratios (1 : 24) with unit conversion, and finding a scale.',
  generate(rng) {
    const kind = rng.pick(['map', 'map-back', 'model', 'find-scale'])
    if (kind === 'map' || kind === 'map-back') {
      const per = rng.pick([0.5, 2, 2.5, 4, 5, 8, 12.5])
      const inches = rng.pick([1.5, 2, 2.5, 3, 3.25, 4.5, 6])
      const miles = inches * per
      return kind === 'map'
        ? {
            type: 'short',
            prompt: `A map uses the scale 1 inch : ${per} miles. Two towns are ${inches} inches apart on the map. How far apart are they in real life?`,
            answers: [ans('\\text{distance}', `${fmt(miles)} \\text{ miles}`, miles)],
            solution: `${inches} × ${per} = ${fmt(miles)} miles.`,
            workLines: 2,
          }
        : {
            type: 'short',
            prompt: `A map uses the scale 1 inch : ${per} miles. A trail is ${fmt(miles)} miles long. How long is it on the map?`,
            answers: [ans('\\text{length}', `${fmt(inches)} \\text{ in}`, inches)],
            solution: `${fmt(miles)} ÷ ${per} = ${fmt(inches)} inches.`,
            workLines: 2,
          }
    }
    if (kind === 'model') {
      const n = rng.pick([12, 24, 48, 64, 96])
      const feet = rng.int(6, 60)
      const inches = (feet * 12) / n
      const thing = rng.pick(['bus', 'boat', 'house', 'locomotive', 'bridge span'])
      return {
        type: 'short',
        prompt: `A model ${thing} is built at a scale of 1 : ${n}. The real ${thing} is ${feet} feet long. How long is the model, in inches?`,
        answers: [ans('\\text{model}', `${fmt(inches)} \\text{ in}`, inches)],
        solution: `${feet} ft = ${feet * 12} in; ${feet * 12} ÷ ${n} = ${fmt(inches)} in.`,
        workLines: 2,
      }
    }
    const model = rng.int(2, 9)
    const k = rng.pick([20, 25, 40, 50, 100])
    const realFt = (model * k) / 12
    return {
      type: 'short',
      prompt: `A ${model}-inch drawing of a wall represents a wall that is ${fmt(realFt)} feet long. Write the scale of the drawing as a ratio 1 : n.`,
      answers: [ans('\\text{scale}', `1 : ${k}`)],
      solution: `${fmt(realFt)} ft = ${fmt(realFt * 12)} in; ${fmt(realFt * 12)} ÷ ${model} = ${k}.`,
      workLines: 2,
    }
  },
}

export const dilationDistances: Generator = {
  id: 'dilation-distances',
  types: ['DIL.DISTANCES'],
  title: 'Dilations: distances along the ray from the center',
  lessons: ['3A.3', '3A.4'],
  description: 'Use OA′ = k·OA and A′B′ = k·AB; find k from OA and AA′ (watch AA′ vs OA′).',
  generate(rng) {
    const [O, A, B] = letters(rng, 3, 'IOQ')
    const Ap = `${A}'`
    const Bp = `${B}'`
    const k = rng.pick([2, 3, 1.5, 2.5])
    const OA = rng.int(2, 8)
    const AB = rng.int(3, 9)
    const OAp = OA * k
    const d = diagram().pt(O, 0, 0)
    const a = polar(2, 20)
    const b = polar(2.4, 55)
    d.pt(A, a.x, a.y).pt(B, b.x, b.y).pt(Ap, a.x * k, a.y * k).pt(Bp, b.x * k, b.y * k)
    d.ray(O, Ap, { heads: false }).ray(O, Bp, { heads: false }).seg(A, B).seg(Ap, Bp)
    const variant = rng.pick(['find-k', 'find-AAp'])
    if (variant === 'find-k') {
      d.shapes = d.shapes.filter((s) => s.kind !== 'ray')
      d.seg(O, A, { label: String(OA) }).seg(A, Ap, { label: fmt(OAp - OA) }).seg(O, B).seg(B, Bp)
      return {
        type: 'short',
        prompt: `$\\triangle ${O}${Ap}${Bp}$ is the image of $\\triangle ${O}${A}${B}$ under a dilation with center $${O}$. $${O}${A} = ${OA}$, $${A}${Ap} = ${fmt(OAp - OA)}$, and $${A}${B} = ${AB}$. Find the scale factor $k$ and $${Ap}${Bp}$.`,
        diagram: d.noScale().build(260),
        answers: [ans('k', fmt(k), k), ans(`${Ap}${Bp}`, fmt(AB * k), AB * k)],
        solution: `$${O}${Ap} = ${OA} + ${fmt(OAp - OA)} = ${fmt(OAp)}$, so $k = \\frac{${fmt(OAp)}}{${OA}} = ${fmt(k)}$ (not $\\frac{${fmt(OAp - OA)}}{${OA}}$). $${Ap}${Bp} = ${fmt(k)} \\cdot ${AB} = ${fmt(AB * k)}$.`,
        workLines: 3,
      }
    }
    d.shapes = d.shapes.filter((s) => s.kind !== 'ray')
    d.seg(O, A, { label: String(OA) }).seg(A, Ap, { label: 'x' }).seg(O, B).seg(B, Bp)
    return {
      type: 'short',
      prompt: `A dilation with center $${O}$ and scale factor $${fmt(k)}$ takes $${A}$ to $${Ap}$. If $${O}${A} = ${OA}$, find $${A}${Ap}$.`,
      diagram: d.noScale().build(260),
      answers: [ans(`${A}${Ap}`, fmt(OAp - OA), OAp - OA)],
      solution: `$${O}${Ap} = ${fmt(k)} \\cdot ${OA} = ${fmt(OAp)}$, so $${A}${Ap} = ${fmt(OAp)} - ${OA} = ${fmt(OAp - OA)}$.`,
      workLines: 3,
    }
  },
}

export const dilationFindCenter: Generator = {
  id: 'dilation-find-center',
  types: ['DIL.FIND_CENTER_K'],
  title: 'Find the center and scale factor of a dilation',
  lessons: ['3A.3', '3A.4'],
  description: 'A triangle and its dilated image on a grid; find the center (lines through corresponding points) and k.',
  generate(rng) {
    for (;;) {
      const [p, q] = rng.pick([
        [2, 1],
        [3, 1],
        [1, 2],
        [3, 2],
      ])
      const k = p / q
      const P: Pt = [rng.int(-5, 3), rng.int(-5, 3)]
      const pts: Pt[] = [0, 1, 2].map(() => [P[0] + q * rng.int(-3, 3), P[1] + q * rng.int(-3, 3)])
      const area = Math.abs((pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1]) - (pts[2][0] - pts[0][0]) * (pts[1][1] - pts[0][1]))
      if (area < 6 || pts.some((a) => a[0] === P[0] && a[1] === P[1])) continue
      const img: Pt[] = pts.map(([x, y]) => [P[0] + k * (x - P[0]), P[1] + k * (y - P[1])])
      if (!inRange([...pts, ...img], 10)) continue
      const names = letters(rng, 3, 'IOQP')
      const d = gridWith(pts, img, names)
      return {
        type: 'short',
        prompt: `$\\triangle ${names.map((n) => n + "'").join('')}$ is a dilation of $\\triangle ${names.join('')}$. Find the center of the dilation and the scale factor.`,
        diagram: d.build(270),
        diagramPos: 'right',
        answers: [ans('\\text{center}', `(${P[0]}, ${P[1]})`), ans('k', fracLatex(p, q), k)],
        solution: 'Draw lines through each point and its image; they meet at the center. Then k = (distance from center to image) ÷ (distance from center to original).',
        workLines: 3,
      }
    }
  },
}

const DILATION_TF: TFItem[] = [
  { text: 'A dilation takes a line through the center to itself.', answer: 'T' },
  { text: 'A dilation takes a line that does not pass through the center to a parallel line.', answer: 'T' },
  { text: 'A dilation preserves angle measures.', answer: 'T' },
  { text: 'A dilation with scale factor 2 doubles the length of every segment.', answer: 'T' },
  { text: 'A dilation with scale factor 2 doubles the area of a figure.', answer: 'F', explanation: 'Area is multiplied by 4.' },
  { text: 'A dilation with scale factor $\\frac{1}{2}$ moves every point closer to the center.', answer: 'F', explanation: 'The center itself does not move.' },
  { text: 'The image of a segment under a dilation is always parallel to the segment.', answer: 'F', explanation: 'A segment on a line through the center stays on the same line.' },
  { text: 'A dilation is a rigid transformation.', answer: 'F', explanation: 'Lengths change unless k = 1.' },
  { text: "If $A'$ is the image of $A$ under a dilation with center $P$, then $P$, $A$, and $A'$ are collinear.", answer: 'T' },
  { text: 'A dilation preserves the ratio of any two lengths in a figure.', answer: 'T' },
  { text: 'The image of a $40^\\circ$ angle under a dilation with scale factor 3 measures $120^\\circ$.', answer: 'F', explanation: 'Angles keep their measure.' },
  { text: 'A dilation takes a circle to a circle.', answer: 'T' },
  { text: 'The midpoint of a segment is taken to the midpoint of the image segment.', answer: 'T' },
]

export const dilationProperties: Generator = {
  id: 'dilation-properties',
  types: ['DIL.PROPERTIES'],
  title: 'What a dilation preserves (true/false)',
  lessons: ['3A.3', '3A.4'],
  description: 'True/false statements about lines, angles, lengths, areas and the center under dilations.',
  options: [{ key: 'count', label: 'Statements', default: '5', choices: ['4', '5', '6', '8'].map((v) => ({ value: v, label: v })) }],
  generate(rng, opts) {
    return {
      type: 'tf',
      mode: 'tf',
      prompt: 'Write T if the statement is always true. Otherwise write F and correct it.',
      items: rng.shuffle(DILATION_TF).slice(0, Number(opts.count || 5)),
      requireJustification: true,
    }
  },
}

export const partitionSegment: Generator = {
  id: 'partition-segment',
  types: ['DIL.MIDSEGMENT_PARTITION'],
  title: 'Partition a segment (a fraction of the way)',
  lessons: ['3A.5'],
  description: 'Find the point a given fraction of the way from A to B on the coordinate plane (dilation from A).',
  generate(rng) {
    for (;;) {
      const [num, den] = rng.pick([
        [1, 3],
        [2, 3],
        [1, 4],
        [3, 4],
        [2, 5],
        [3, 5],
        [1, 2],
      ])
      const ax = rng.int(-8, 4)
      const ay = rng.int(-8, 4)
      const dx = den * rng.intExcept(-3, 3, [0])
      const dy = den * rng.intExcept(-3, 3, [0])
      const bx = ax + dx
      const by = ay + dy
      if (Math.abs(bx) > 9 || Math.abs(by) > 9) continue
      const px = ax + (dx * num) / den
      const py = ay + (dy * num) / den
      const [A, B] = letters(rng, 2)
      const d = diagram().withGrid({ xmin: -10.5, xmax: 10.5, ymin: -10.5, ymax: 10.5 }, { numberEvery: 2 }).pt(A, ax, ay).pt(B, bx, by).seg(A, B)
      const frac = num === 1 && den === 2 ? 'halfway' : `$${fracLatex(num, den)}$ of the way`
      return {
        type: 'short',
        prompt: `Find the coordinates of the point that is ${frac} from $${A}(${ax}, ${ay})$ to $${B}(${bx}, ${by})$.`,
        diagram: d.build(240),
        diagramPos: 'right',
        answers: [ans(undefined, `(${fmt(px)}, ${fmt(py)})`)],
        solution: `Move $${fracLatex(num, den)}$ of the change: $(${ax} + ${fracLatex(num, den)}(${dx}),\\ ${ay} + ${fracLatex(num, den)}(${dy})) = (${fmt(px)}, ${fmt(py)})$.`,
        workLines: 3,
      }
    }
  },
}

export const splitterConverse: Generator = {
  id: 'splitter-converse',
  types: ['SIM.TRIANGLE_PROPORTIONALITY'],
  title: 'Is the segment parallel? (converse of triangle proportionality)',
  lessons: ['3B.11'],
  description: 'Given the four segment lengths on two sides of a triangle, decide whether the segment is parallel to the third side.',
  generate(rng) {
    const [A, B, C, D, E] = letters(rng, 5)
    const p = rng.int(3, 12)
    const q = rng.int(2, 10)
    const m = rng.int(2, 4)
    const yes = rng.bool()
    const r = (p * m) / gcd(p, q)
    let ec = (q * m) / gcd(p, q)
    if (!yes) ec += rng.pick([1, 2, -1])
    if (ec <= 0) return splitterConverse.generate(rng, {})
    const d = splitterFigure(A, B, C, D, E, p / (p + q), p + q, r + ec)
    d.seg(A, D, { label: String(p) }).seg(D, B, { label: String(q) }).seg(A, E, { label: String(r) }).seg(E, C, { label: String(ec) }).seg(D, E).seg(B, C)
    return {
      type: 'short',
      prompt: `Is $${seg(D, E)} \\parallel ${seg(B, C)}$? Explain using ratios.`,
      diagram: d.noScale().build(240),
      answers: [ans(undefined, yes ? `\\text{Yes: } \\frac{${p}}{${q}} = \\frac{${r}}{${ec}}` : `\\text{No: } \\frac{${p}}{${q}} \\ne \\frac{${r}}{${ec}}`)],
      solution: yes ? 'The segment divides the two sides proportionally, so it is parallel to the third side (converse of the Triangle Proportionality Theorem).' : 'The ratios are not equal, so the segment is not parallel.',
      workLines: 3,
    }
  },
}

const SIM_ASN: TFItem[] = [
  { text: 'Two equilateral triangles are similar.', answer: 'A' },
  { text: 'Two squares are similar.', answer: 'A' },
  { text: 'Two circles are similar.', answer: 'A' },
  { text: 'Two regular hexagons are similar.', answer: 'A' },
  { text: 'Two isosceles right triangles are similar.', answer: 'A' },
  { text: 'Two rectangles are similar.', answer: 'S', explanation: 'A 1 × 2 and a 1 × 3 rectangle are not similar.' },
  { text: 'Two rhombuses are similar.', answer: 'S', explanation: 'Angles can differ.' },
  { text: 'Two isosceles triangles are similar.', answer: 'S', explanation: 'Vertex angles can differ.' },
  { text: 'Two right triangles are similar.', answer: 'S', explanation: 'The acute angles can differ.' },
  { text: 'Two parallelograms are similar.', answer: 'S' },
  { text: 'A right triangle and an equilateral triangle are similar.', answer: 'N', explanation: 'Their angles cannot match.' },
  { text: 'A regular pentagon and a regular hexagon are similar.', answer: 'N', explanation: 'Different numbers of sides.' },
  { text: 'Two isosceles triangles with $50^\\circ$ vertex angles are similar.', answer: 'A', explanation: 'All angles match (AA).' },
  { text: 'Two congruent figures are similar.', answer: 'A', explanation: 'Scale factor 1.' },
  { text: 'A square and a non-square rectangle are similar.', answer: 'N' },
]

export const similarityASN: Generator = {
  id: 'similarity-asn',
  types: ['SIM.ASN'],
  title: 'Always, sometimes, never: similar figures',
  lessons: ['3B.8'],
  description: 'Are two figures from a family always, sometimes, or never similar? (equilateral triangles, rectangles, circles, regular polygons…)',
  options: [{ key: 'count', label: 'Statements', default: '5', choices: ['4', '5', '6', '8'].map((v) => ({ value: v, label: v })) }],
  generate(rng, opts) {
    return {
      type: 'tf',
      mode: 'asn',
      prompt: 'Write A (always), S (sometimes), or N (never). Justify each in a sentence or with a counterexample.',
      items: rng.shuffle(SIM_ASN).slice(0, Number(opts.count || 5)),
      requireJustification: true,
    }
  },
}

export const similarityCriterion: Generator = {
  id: 'similarity-criterion',
  types: ['SIM.WHICH_CRITERION'],
  title: 'Similar by AA, SAS~, SSS~, or not?',
  lessons: ['3B.9', '3B.10'],
  description: 'Two triangles with given angles or side lengths. Decide whether they must be similar and by which criterion (watch non-corresponding ratios).',
  generate(rng) {
    const kind = rng.pick(['AA', 'SSS', 'SAS', 'NOT'])
    const [A, B, C, D, E, F] = letters(rng, 6)
    const [num, den] = rng.pick([
      [2, 1],
      [3, 2],
      [3, 1],
      [5, 2],
    ])
    const k = num / den
    let a = 0
    let b = 0
    let c = 0
    do {
      a = den * rng.int(2, 6)
      b = den * rng.int(2, 6)
      c = den * rng.int(2, 6)
    } while (a + b <= c + 1 || a + c <= b + 1 || b + c <= a + 1 || new Set([a, b, c]).size < 3)
    const t1 = triangleFromSides(a, b, c) // A at origin, AB = c, BC = a, CA = b
    const s = 3 / Math.max(a, b, c)
    const turn = rng.int(-35, 35)
    const t2pts = [t1.A, t1.B, t1.C].map((p) => rot({ x: p.x * s * k * 0.7, y: p.y * s * k * 0.7 }, turn))
    const minX = Math.min(...t2pts.map((p) => p.x))
    const off = Math.max(t1.B.x, t1.C.x) * s + 1.6 - minX
    const d = diagram()
      .pt(A, t1.A.x * s, t1.A.y * s)
      .pt(B, t1.B.x * s, t1.B.y * s)
      .pt(C, t1.C.x * s, t1.C.y * s)
      .pt(D, t2pts[0].x + off, t2pts[0].y)
      .pt(E, t2pts[1].x + off, t2pts[1].y)
      .pt(F, t2pts[2].x + off, t2pts[2].y)
    const angA = Math.round(toDeg(Math.acos((b * b + c * c - a * a) / (2 * b * c))))
    const angB = Math.round(toDeg(Math.acos((a * a + c * c - b * b) / (2 * a * c))))
    const angC = 180 - angA - angB
    let answer = 0
    let why = ''
    if (kind === 'AA') {
      d.poly([A, B, C]).poly([D, E, F])
      d.angle(B, A, C, { label: `${angA}°` }).angle(C, B, A, { label: `${angB}°` })
      d.angle(E, D, F, { label: `${angA}°` }).angle(D, F, E, { label: `${angC}°` })
      answer = 0
      why = `The third angle of $\\triangle ${A}${B}${C}$ is $180 - ${angA} - ${angB} = ${angC}^\\circ$, so two pairs of angles match: AA.`
    } else if (kind === 'SSS' || kind === 'NOT') {
      const sides2 = [c * k, a * k, b * k]
      if (kind === 'NOT') sides2[rng.int(0, 2)] += rng.pick([1, 2])
      d.seg(A, B, { label: String(c) }).seg(B, C, { label: String(a) }).seg(C, A, { label: String(b) })
      d.seg(D, E, { label: fmt(sides2[0]) }).seg(E, F, { label: fmt(sides2[1]) }).seg(F, D, { label: fmt(sides2[2]) })
      answer = kind === 'SSS' ? 2 : 3
      why =
        kind === 'SSS'
          ? `Each ratio is $${fracLatex(num, den)}$: SSS similarity.`
          : `The ratios $\\frac{${fmt(sides2[0])}}{${c}}, \\frac{${fmt(sides2[1])}}{${a}}, \\frac{${fmt(sides2[2])}}{${b}}$ are not all equal.`
    } else {
      d.seg(A, B, { label: String(c) }).seg(C, A, { label: String(b) }).seg(B, C)
      d.seg(D, E, { label: fmt(c * k) }).seg(F, D, { label: fmt(b * k) }).seg(E, F)
      d.angle(B, A, C, { label: `${angA}°` }).angle(E, D, F, { label: `${angA}°` })
      answer = 1
      why = `Two pairs of sides are in ratio $${fracLatex(num, den)}$ and the included angles are both $${angA}^\\circ$: SAS similarity.`
    }
    const choices = ['\\text{AA}', '\\text{SAS similarity}', '\\text{SSS similarity}', '\\text{Not necessarily similar}']
    return {
      type: 'mc',
      prompt: `Are the triangles similar? If so, which criterion shows it? (Figures not drawn to scale.)`,
      diagram: d.noScale().build(360, 0.1),
      diagramPos: 'below',
      choices,
      correct: answer,
      solution: why,
    }
  },
}

export const algebraSimilar: Generator = {
  id: 'algebra-similar',
  types: ['ALG.SIMILAR_EXPRESSIONS', 'SIM.SOLVE'],
  title: 'Similar triangles with algebraic sides',
  lessons: ['3B.7', '3B.12'],
  description: 'Corresponding sides are expressions; set up a proportion and solve. Honors option leads to a quadratic.',
  options: [
    {
      key: 'variant',
      label: 'Algebra',
      default: 'linear',
      choices: [
        { value: 'linear', label: 'Linear' },
        { value: 'quadratic', label: 'Quadratic (honors)' },
      ],
    },
  ],
  generate(rng, opts) {
    const [A, B, C, D, E, F] = letters(rng, 6)
    const t = triangleFromSides(5, 6, 4.5)
    const draw = () => {
      const s = 0.55
      const s2 = 0.85
      const off = 4.2
      return diagram()
        .pt(A, t.A.x * s, t.A.y * s)
        .pt(B, t.B.x * s, t.B.y * s)
        .pt(C, t.C.x * s, t.C.y * s)
        .pt(D, t.A.x * s2 + off, t.A.y * s2)
        .pt(E, t.B.x * s2 + off, t.B.y * s2)
        .pt(F, t.C.x * s2 + off, t.C.y * s2)
    }
    if (opts.variant === 'quadratic') {
      for (;;) {
        const X = rng.int(2, 9)
        const p = rng.int(0, 4)
        const s = rng.int(1, 6)
        const N = (X + p) * (X + s)
        const qs: number[] = []
        for (let q = 3; q <= 20; q++) if (N % q === 0 && N / q >= 3 && N / q <= 30) qs.push(q)
        if (!qs.length) continue
        const q = rng.pick(qs)
        const r = N / q
        const d = draw().seg(A, B, { label: lin(1, p) }).seg(B, C, { label: String(q) }).seg(C, A).seg(D, E, { label: String(r) }).seg(E, F, { label: lin(1, s) }).seg(F, D)
        return {
          type: 'short',
          prompt: `$\\triangle ${A}${B}${C} \\sim \\triangle ${D}${E}${F}$. Find $x$. Explain why only one solution works.`,
          diagram: d.noScale().build(320, 0.1),
          diagramPos: 'below',
          answers: [ans('x', X)],
          solution: `$\\frac{${lin(1, p)}}{${r}} = \\frac{${q}}{${lin(1, s)}}$, so $(${lin(1, p)})(${lin(1, s)}) = ${N}$; $x = ${X}$ or $x = ${-(p + s) - X}$, and a negative value gives a negative length.`,
          workLines: 6,
        }
      }
    }
    for (;;) {
      const x = rng.int(2, 10)
      const a = rng.int(3, 9)
      const b = rng.int(3, 9)
      const [kn, kd] = rng.pick([
        [2, 1],
        [3, 1],
        [3, 2],
        [5, 2],
      ])
      if ((a * kn) % kd || (b * kn) % kd || a === b) continue
      const e1 = linearFor(rng, x, (a * kn) / kd, { maxB: 20, allowOne: true })
      const e2 = linearFor(rng, x, (b * kn) / kd, { maxB: 20, allowOne: true })
      if (a * e2.a === b * e1.a) continue
      const d = draw().seg(A, B, { label: String(a) }).seg(B, C, { label: String(b) }).seg(C, A).seg(D, E, { label: lin(e1.a, e1.b) }).seg(E, F, { label: lin(e2.a, e2.b) }).seg(F, D)
      return {
        type: 'short',
        prompt: `$\\triangle ${A}${B}${C} \\sim \\triangle ${D}${E}${F}$. Find $x$, $${D}${E}$, and $${E}${F}$.`,
        diagram: d.noScale().build(320, 0.1),
        diagramPos: 'below',
        answers: [ans('x', x), ans(`${D}${E}`, (a * kn) / kd), ans(`${E}${F}`, (b * kn) / kd)],
        solution: `$\\frac{${lin(e1.a, e1.b)}}{${a}} = \\frac{${lin(e2.a, e2.b)}}{${b}}$, so $${b}(${lin(e1.a, e1.b)}) = ${a}(${lin(e2.a, e2.b)})$ and $x = ${x}$.`,
        workLines: 5,
      }
    }
  },
}

export const aspectRatio: Generator = {
  id: 'aspect-ratio',
  types: ['SIM.ASPECT_RATIO'],
  title: 'Aspect ratios and similar rectangles',
  lessons: ['3B.7', '3B.8', '3B.12'],
  description: 'Are two screens or photos similar? Enlarge a photo to a new width. A-series paper (√2 ratio).',
  generate(rng) {
    const kind = rng.pick(['compare', 'enlarge', 'paper'])
    if (kind === 'compare') {
      const ratios: [number, number][] = [
        [16, 9],
        [4, 3],
        [3, 2],
        [16, 10],
      ]
      const r1 = rng.pick(ratios)
      const same = rng.bool()
      const r2 = same ? r1 : rng.pick(ratios.filter((r) => r !== r1))
      const m1 = rng.int(2, 6)
      const m2 = rng.int(2, 8)
      const w1 = r1[0] * m1 * 2
      const h1 = r1[1] * m1 * 2
      const w2 = r2[0] * m2
      const h2 = r2[1] * m2
      return {
        type: 'short',
        prompt: `A phone screen is ${w1} mm by ${h1} mm and a tablet screen is ${w2} mm by ${h2} mm. Are the screens similar rectangles? Explain.`,
        answers: [ans(undefined, same ? `\\text{Yes: } \\frac{${w1}}{${h1}} = \\frac{${w2}}{${h2}} = ${fracLatex(r1[0], r1[1])}` : `\\text{No: } ${fracLatex(w1, h1)} \\ne ${fracLatex(w2, h2)}`)],
        workLines: 3,
      }
    }
    if (kind === 'enlarge') {
      const [w, h] = rng.pick([
        [4, 6],
        [5, 7],
        [8, 10],
        [3, 5],
      ])
      const W = rng.pick([10, 12, 15, 16, 20, 24])
      const H = (h * W) / w
      return {
        type: 'short',
        prompt: `A ${w} in × ${h} in photo is enlarged so its ${w}-inch side becomes ${W} inches, without distortion. How long is the other side? Round to the nearest tenth if needed.`,
        answers: [ans('\\text{other side}', `${fixed(H, Number.isInteger(H) ? 0 : 1)} \\text{ in}`, Math.round(H * 10) / 10)],
        solution: `Scale factor $${fracLatex(W, w)}$; $${h} \\cdot ${fracLatex(W, w)} \\approx ${fmt(H, 1)}$.`,
        workLines: 3,
      }
    }
    const n = rng.int(3, 5)
    const short = [210, 148, 105][n - 4] ?? 297
    const long = [297, 210, 148][n - 4] ?? 420
    return {
      type: 'short',
      prompt: `A-series paper is designed so that folding a sheet in half (across its long side) gives a similar rectangle. An A${n} sheet is ${short} mm × ${long} mm. (a) Show that the ratio long : short is close to $\\sqrt{2}$. (b) What are the dimensions of A${n + 1}?`,
      answers: [ans('(a)', `\\frac{${long}}{${short}} \\approx ${fixed(long / short, 3)} \\approx \\sqrt{2} \\approx 1.414`), ans('(b)', `${Math.floor(long / 2)} \\text{ mm} \\times ${short} \\text{ mm}`)],
      solution: 'If long/short = r and the half sheet is similar, then short/(long/2) = r, so r² = 2.',
      workLines: 4,
    }
  },
}

// =============================================================== Unit 4: right triangles and oblique triangles

export const pythagoreanTriples: Generator = {
  id: 'pythagorean-triples',
  types: ['PYTH.TRIPLES'],
  title: 'Pythagorean triples',
  lessons: ['4A.5', '3C.15'],
  description: 'Select which sets are Pythagorean triples; complete a scaled triple.',
  generate(rng) {
    const prim: [number, number, number][] = [
      [3, 4, 5],
      [5, 12, 13],
      [8, 15, 17],
      [7, 24, 25],
      [20, 21, 29],
      [9, 40, 41],
    ]
    const sets: { t: number[]; ok: boolean }[] = []
    while (sets.length < 5) {
      const [a, b, c] = rng.pick(prim)
      const k = rng.int(1, 4)
      const ok = rng.bool(0.55)
      const t = ok ? [a * k, b * k, c * k] : [a * k, b * k, c * k + rng.pick([1, -1, 2])]
      if (sets.some((s) => s.t.join() === t.join())) continue
      sets.push({ t, ok })
    }
    const [a, b, c] = rng.pick(prim)
    const k = rng.int(2, 5)
    const correct = sets.map((s, i) => (s.ok ? L7[i] : null)).filter(Boolean).join(', ') || 'none'
    return {
      type: 'short',
      prompt: `(a) Which sets are Pythagorean triples? Select all.\n\n${sets.map((s, i) => `(${L7[i]}) ${s.t.join(', ')}`).join(' ')}\n\n(b) The legs of a right triangle are ${a * k} and ${b * k}. Find the hypotenuse without a calculator.`,
      answers: [ans('(a)', `\\text{${correct}}`), ans('(b)', c * k)],
      solution: `(b) ${a * k}, ${b * k} is ${k} times ${a}, ${b}, so the hypotenuse is ${k} · ${c} = ${c * k}.`,
      workLines: 3,
    }
  },
}

export const steepness: Generator = {
  id: 'steepness',
  types: ['SRT.STEEPNESS'],
  title: 'Steepness: compare ramps by ratio',
  lessons: ['4A.1'],
  description: 'Order ramps or slides from least to most steep using rise/run; check the ADA 1:12 rule.',
  generate(rng) {
    const names = ['Ramp A', 'Ramp B', 'Ramp C']
    const ramps = names.map((n) => {
      const rise = rng.int(4, 30)
      const run = rise * rng.int(8, 16) + rng.int(0, 11)
      return { n, rise, run, r: rise / run }
    })
    if (new Set(ramps.map((r) => r.r.toFixed(4))).size < 3) return steepness.generate(rng, {})
    const order = [...ramps].sort((a, b) => a.r - b.r).map((r) => r.n.slice(-1))
    const ok = ramps.filter((r) => r.r <= 1 / 12 + 1e-9).map((r) => r.n.slice(-1))
    return {
      type: 'short',
      prompt: `${ramps.map((r) => `${r.n} rises ${r.rise} inches over a horizontal run of ${r.run} inches.`).join(' ')}\n\n(a) Order the ramps from least steep to most steep.\n\n(b) The ADA allows a slope of at most 1 : 12. Which ramps meet the rule?`,
      answers: [ans('(a)', `\\text{${order.join(', ')}}`), ans('(b)', `\\text{${ok.length ? ok.join(', ') : 'none'}}`)],
      solution: ramps.map((r) => `${r.n}: ${r.rise}/${r.run} ≈ ${fixed(r.r, 3)}`).join('; ') + `; 1/12 ≈ 0.083.`,
      workLines: 4,
    }
  },
}

export const ratioTable: Generator = {
  id: 'ratio-table',
  types: ['SRT.RATIO_TABLE'],
  title: 'Use the right-triangle ratio table',
  lessons: ['4A.4', '4A.5'],
  description: 'A table of adjacent/hypotenuse, opposite/hypotenuse and opposite/adjacent ratios; find a side or estimate an angle.',
  generate(rng) {
    const start = rng.pick([15, 25, 35, 45, 55])
    const angs = [0, 5, 10, 15, 20].map((k) => start + k)
    const r3 = (v: number) => fixed(v, 3)
    const table = `$$\\begin{array}{c|c|c|c} \\text{angle} & \\frac{\\text{adjacent leg}}{\\text{hypotenuse}} & \\frac{\\text{opposite leg}}{\\text{hypotenuse}} & \\frac{\\text{opposite leg}}{\\text{adjacent leg}} \\\\ \\hline ${angs.map((a) => `${a}^\\circ & ${r3(Math.cos(toRad(a)))} & ${r3(Math.sin(toRad(a)))} & ${r3(Math.tan(toRad(a)))}`).join(' \\\\ ')} \\end{array}$$`
    const theta = rng.pick(angs)
    const hyp = rng.int(6, 30)
    const adj = hyp * Number(r3(Math.cos(toRad(theta))))
    const target = rng.pick(angs)
    const opp = rng.int(5, 20)
    const adj2 = opp / Math.tan(toRad(target + rng.pick([-1, 1])))
    return {
      type: 'short',
      prompt: `Use the table.\n\n${table}\n\n(a) A right triangle has a $${theta}^\\circ$ angle and a hypotenuse of ${hyp}. Find the leg adjacent to the $${theta}^\\circ$ angle.\n\n(b) In a right triangle, the leg opposite angle $\\theta$ is ${opp} and the leg adjacent to $\\theta$ is ${fixed(adj2, 1)}. Estimate $\\theta$.`,
      answers: [ans('(a)', `\\approx ${fixed(adj, 2)}`, Math.round(adj * 100) / 100), ans('(b)', `\\approx ${target}^\\circ`, target)],
      solution: `(a) adjacent = hypotenuse × ${r3(Math.cos(toRad(theta)))}. (b) opposite ÷ adjacent ≈ ${fixed(opp / adj2, 3)}; the closest table value is at $${target}^\\circ$.`,
      workLines: 4,
    }
  },
}

export const whichLaw: Generator = {
  id: 'which-law',
  types: ['OBL.WHICH_LAW'],
  title: 'Which law? Choose a method',
  lessons: ['4D.20'],
  description: 'Given measurements, choose the Law of Sines, the Law of Cosines, right-triangle trig, or not enough information.',
  generate(rng) {
    const [A, B, C] = letters(rng, 3)
    const a = `${B}${C}`
    const b = `${A}${C}`
    const c = `${A}${B}`
    const n = () => rng.int(5, 25)
    const g = () => rng.int(25, 110)
    const cases: [string, string, number, string][] = [
      [`$${a} = ${n()}$, $${b} = ${n()}$, $m\\angle ${C} = ${g()}^\\circ$; find $${c}$.`, 'SAS', 1, 'Two sides and the included angle: Law of Cosines.'],
      [`$${a} = ${n()}$, $${b} = ${n() + 3}$, $${c} = ${n() + 5}$; find $m\\angle ${C}$.`, 'SSS', 1, 'Three sides: Law of Cosines.'],
      [`$m\\angle ${A} = ${rng.int(30, 70)}^\\circ$, $m\\angle ${B} = ${rng.int(40, 80)}^\\circ$, $${a} = ${n()}$; find $${b}$.`, 'AAS', 0, 'Two angles and a side: Law of Sines.'],
      [`$m\\angle ${A} = ${rng.int(30, 70)}^\\circ$, $${c} = ${n()}$, $m\\angle ${B} = ${rng.int(40, 80)}^\\circ$; find $${a}$.`, 'ASA', 0, 'Two angles and the included side: find the third angle, then Law of Sines.'],
      [`$m\\angle ${C} = 90^\\circ$, $m\\angle ${A} = ${rng.int(20, 70)}^\\circ$, $${c} = ${n()}$; find $${a}$.`, 'right', 2, 'A right triangle: use sine, cosine, or tangent directly.'],
      [`$m\\angle ${A} = 50^\\circ$, $m\\angle ${B} = 60^\\circ$, $m\\angle ${C} = 70^\\circ$; find $${a}$.`, 'AAA', 3, 'Three angles fix the shape but not the size: not enough information.'],
    ]
    const [text, , correct, why] = rng.pick(cases)
    return {
      type: 'mc',
      prompt: `In $\\triangle ${A}${B}${C}$: ${text} Which method should you use?`,
      choices: ['\\text{Law of Sines}', '\\text{Law of Cosines}', '\\text{Right-triangle trig (sin, cos, tan)}', '\\text{Not enough information}'],
      correct,
      solution: why,
    }
  },
}

export const catalogGapGenerators: Generator[] = [
  angleNamePairs,
  describeSequence,
  findTransformElement,
  definitionCheck,
  enoughInfo,
  quadMustCouldCant,
  quadSelectProperties,
  scaledCopy,
  scaleModel,
  dilationDistances,
  dilationFindCenter,
  dilationProperties,
  partitionSegment,
  splitterConverse,
  similarityASN,
  similarityCriterion,
  algebraSimilar,
  aspectRatio,
  pythagoreanTriples,
  steepness,
  ratioTable,
  whichLaw,
]

