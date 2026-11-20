// Generators built for specific response formats: fill-in-the-blank statements and error analysis.
import { fmt, radicalLatex } from '../lib/mathfmt'
import { type Generator, letters, linearFor } from './types'
import { splitterFigure } from './unit3'

// ---------------------------------------------------------------- fill in the blank (theorem statements)

const STATEMENTS: { text: string; lessons: string[]; unit: number }[] = [
  { unit: 1, lessons: ['1D.19'], text: '[[Vertical angles]] are [[congruent]].' },
  { unit: 1, lessons: ['1D.20'], text: 'If two parallel lines are cut by a transversal, then [[alternate interior angles]] are [[congruent]].' },
  { unit: 1, lessons: ['1D.20'], text: 'If two lines are cut by a transversal so that [[alternate interior angles]] are congruent, then the lines are [[parallel]].' },
  { unit: 1, lessons: ['1D.21'], text: 'The measures of the interior angles of a triangle add up to [[$180^\\circ$]].' },
  { unit: 1, lessons: ['1B.11'], text: 'A reflection across line $\\ell$ takes each point $P$ not on $\\ell$ to $P\'$ so that $\\ell$ is the [[perpendicular bisector]] of $\\overline{PP\'}$.' },
  { unit: 2, lessons: ['2A.1'], text: 'Two figures are congruent if there is a sequence of [[rigid transformations]] that takes one figure onto the other.' },
  { unit: 2, lessons: ['2B.6'], text: 'If there is a correspondence between two triangles so that [[two pairs of corresponding sides and the corresponding angles between them]] are congruent, then the triangles are congruent.' },
  { unit: 2, lessons: ['2B.7'], text: 'If there is a correspondence between two triangles so that [[two pairs of corresponding angles and the corresponding sides between them]] are congruent, then the triangles are congruent.' },
  { unit: 2, lessons: ['2B.9'], text: 'If there is a correspondence between two triangles so that [[all three pairs of corresponding sides]] are congruent, then the triangles are congruent.' },
  { unit: 2, lessons: ['2B.8'], text: 'A point is on the perpendicular bisector of a segment if and only if it is [[equidistant]] from the [[endpoints]] of the segment.' },
  { unit: 2, lessons: ['2A.4', '2B.10'], text: 'If two sides of a triangle are congruent, then the [[angles opposite them]] are congruent.' },
  { unit: 2, lessons: ['2C.13'], text: 'The diagonals of a parallelogram [[bisect each other]].' },
  { unit: 2, lessons: ['2C.14'], text: 'The diagonals of a rhombus are [[perpendicular]], and the diagonals of a rectangle are [[congruent]].' },
  { unit: 2, lessons: ['2C.12'], text: 'A trapezoid has [[exactly one]] pair of parallel sides; an isosceles trapezoid also has congruent [[legs]].' },
  { unit: 3, lessons: ['3B.6'], text: 'Two figures are similar if there is a sequence of [[rigid transformations and dilations]] that takes one figure onto the other.' },
  { unit: 3, lessons: ['3A.4'], text: 'A dilation takes a line that does not pass through the center to a [[parallel]] line, and a line through the center to [[itself]].' },
  { unit: 3, lessons: ['3A.5'], text: 'The segment joining the midpoints of two sides of a triangle is [[parallel]] to the third side and [[half]] as long.' },
  { unit: 3, lessons: ['3B.9'], text: 'Angle-Angle Triangle Similarity Theorem: if two angles of one triangle are congruent to [[two angles of another triangle]], then the triangles are [[similar]].' },
  { unit: 3, lessons: ['3B.11'], text: 'A line parallel to one side of a triangle divides the other two sides [[proportionally]].' },
  { unit: 3, lessons: ['3C.13'], text: 'The altitude to the hypotenuse of a right triangle divides it into [[two triangles that are similar to it]] (and to each other).' },
  { unit: 3, lessons: ['3C.14'], text: 'In a right triangle with legs $a$ and $b$ and hypotenuse $c$, [[$a^2 + b^2 = c^2$]].' },
  { unit: 3, lessons: ['3C.15'], text: 'If $c$ is the longest side and $c^2 < a^2 + b^2$, the triangle is [[acute]]; if $c^2 > a^2 + b^2$, it is [[obtuse]].' },
  { unit: 4, lessons: ['4A.2'], text: 'In a 45-45-90 triangle, the hypotenuse is [[$\\sqrt{2}$]] times as long as each leg.' },
  { unit: 4, lessons: ['4A.3'], text: 'In a 30-60-90 triangle, the long leg is [[$\\sqrt{3}$]] times the short leg and the hypotenuse is [[twice]] the short leg.' },
  { unit: 4, lessons: ['4B.6'], text: '$\\cos\\theta = $ [[$\\frac{\\text{adjacent leg}}{\\text{hypotenuse}}$]], $\\sin\\theta = $ [[$\\frac{\\text{opposite leg}}{\\text{hypotenuse}}$]], $\\tan\\theta = $ [[$\\frac{\\text{opposite leg}}{\\text{adjacent leg}}$]].' },
  { unit: 4, lessons: ['4B.8'], text: 'For an acute angle $\\theta$, $\\sin\\theta = $ [[$\\cos(90^\\circ - \\theta)$]].' },
  { unit: 4, lessons: ['4B.9'], text: '$\\cos^2\\theta + \\sin^2\\theta = $ [[$1$]] and $\\tan\\theta = $ [[$\\frac{\\sin\\theta}{\\cos\\theta}$]].' },
  { unit: 4, lessons: ['4D.13'], text: 'A central angle of [[1 radian]] intercepts an arc as long as the radius, and $\\pi$ radians $=$ [[$180^\\circ$]].' },
  { unit: 4, lessons: ['4D.16'], text: 'The area of a triangle with sides $a$ and $b$ and included angle $C$ is [[$\\frac{1}{2}ab\\sin C$]].' },
  { unit: 4, lessons: ['4D.17'], text: 'Law of Sines: $\\frac{a}{\\sin A} = $ [[$\\frac{b}{\\sin B}$]] $=$ [[$\\frac{c}{\\sin C}$]].' },
  { unit: 4, lessons: ['4D.19'], text: 'Law of Cosines: $c^2 = $ [[$a^2 + b^2 - 2ab\\cos C$]].' },
]

export const completeStatement: Generator = {
  id: 'complete-statement',
  types: ['PRF.STATEMENT_PRECISION'],
  title: 'Complete the theorem or definition (fill in the blanks)',
  lessons: [...new Set(STATEMENTS.flatMap((s) => s.lessons))],
  description: 'Exit-ticket style: complete a definition, criterion or theorem in course wording (SAS/ASA/SSS phrased “If there is a correspondence…”). Optional word bank.',
  options: [
    {
      key: 'unit',
      label: 'Unit',
      default: 'any',
      choices: [{ value: 'any', label: 'Any' }, ...[1, 2, 3, 4].map((u) => ({ value: String(u), label: `Unit ${u}` }))],
    },
    {
      key: 'bank',
      label: 'Word bank',
      default: 'no',
      choices: [
        { value: 'no', label: 'No' },
        { value: 'yes', label: 'Yes' },
      ],
    },
  ],
  generate(rng, opts) {
    const pool = STATEMENTS.filter((s) => !opts.unit || opts.unit === 'any' || String(s.unit) === opts.unit)
    const st = rng.pick(pool)
    const extras = ['supplementary', 'complementary', 'congruent', 'parallel', 'perpendicular', 'similar', 'equal', 'proportional', 'half', 'twice']
    const answers = [...st.text.matchAll(/\[\[([\s\S]+?)\]\]/g)].map((m) => m[1])
    return {
      type: 'cloze',
      lessons: st.lessons,
      prompt: 'Complete the statement.',
      text: st.text,
      wordBank: opts.bank === 'yes' || undefined,
      extraWords: opts.bank === 'yes' ? rng.shuffle(extras.filter((w) => !answers.includes(w))).slice(0, 3) : undefined,
    }
  },
}

// ---------------------------------------------------------------- error analysis

const NAMES = ['Mariam', 'Mateo', 'Jordan', 'Priya', 'Lena', 'Diego', 'Kai', 'Noor', 'Sam', 'Ava']

export const errorAnalysis: Generator = {
  id: 'error-analysis',
  types: ['PRF.CRITIQUE', 'DIL.COORDINATES', 'SIM.TRIANGLE_PROPORTIONALITY', 'ALG.QUAD_EQUATION', 'SRT.45_45_90', 'PYTH.CLASSIFY'],
  title: 'Error analysis: find and fix the mistake',
  lessons: ['2C.13', '3A.3', '3B.11', '3C.15', '4A.2'],
  description: 'A named student’s worked solution contains a common mistake (multiplying coordinates by k with a center not at the origin, part vs whole in a proportion, consecutive angles set equal, √2 on the wrong side, wrong longest side). Students find and fix it.',
  options: [
    {
      key: 'kind',
      label: 'Mistake',
      default: 'any',
      choices: [
        { value: 'any', label: 'Any' },
        { value: 'dilation', label: 'Dilation with center not at the origin' },
        { value: 'proportion', label: 'Part vs whole in triangle proportionality' },
        { value: 'consecutive', label: 'Consecutive angles set equal' },
        { value: 'special', label: '45-45-90: √2 on the wrong side' },
        { value: 'classify', label: 'Classifying with the wrong longest side' },
      ],
    },
  ],
  generate(rng, opts) {
    const kind = !opts.kind || opts.kind === 'any' ? rng.pick(['dilation', 'proportion', 'consecutive', 'special', 'classify']) : opts.kind
    const name = rng.pick(NAMES)
    if (kind === 'dilation') {
      const P = [rng.intExcept(-3, 4, [0]), rng.intExcept(-3, 4, [0])]
      const A = [rng.int(-4, 6), rng.int(-4, 6)]
      const k = rng.pick([2, 3])
      const wrong = [k * A[0], k * A[1]]
      const right = [P[0] + k * (A[0] - P[0]), P[1] + k * (A[1] - P[1])]
      return {
        type: 'error',
        lessons: ['3A.3', '3A.4'],
        types: ['PRF.CRITIQUE', 'DIL.COORDINATES'],
        prompt: `A dilation has center $P(${P[0]}, ${P[1]})$ and scale factor ${k}. Find the error in ${name}’s work and give the correct image of $A(${A[0]}, ${A[1]})$.`,
        studentName: name,
        work: `$A' = (${k} \\cdot ${A[0]},\\ ${k} \\cdot ${A[1]}) = (${wrong[0]}, ${wrong[1]})$`,
        answer: `${name} multiplied the coordinates by ${k}, which only works when the center is the origin. Use $A' = P + ${k}(A - P)$: $A - P = (${A[0] - P[0]}, ${A[1] - P[1]})$, so $A' = (${right[0]}, ${right[1]})$.`,
      }
    }
    if (kind === 'proportion') {
      const [A, B, C, D, E] = letters(rng, 5)
      const p = rng.int(3, 8)
      const q = rng.int(2, 7)
      const de = rng.int(4, 10)
      const bc = (de * (p + q)) / p
      const wrong = (de * q) / p
      const d = splitterFigure(A, B, C, D, E, p / (p + q))
      d.seg(A, D, { label: String(p) }).seg(D, B, { label: String(q) }).seg(A, E).seg(E, C).seg(D, E, { label: String(de), arrows: 1 }).seg(B, C, { label: 'x', arrows: 1 })
      return {
        type: 'error',
        lessons: ['3B.9', '3B.11'],
        types: ['PRF.CRITIQUE', 'SIM.TRIANGLE_PROPORTIONALITY'],
        prompt: `$\\overline{${D}${E}} \\parallel \\overline{${B}${C}}$. Find the error in ${name}’s work and find the correct value of $x$.`,
        diagram: d.build(220),
        studentName: name,
        work: `$\\frac{${A}${D}}{${D}${B}} = \\frac{${D}${E}}{${B}${C}}$\n$\\frac{${p}}{${q}} = \\frac{${de}}{x}$\n$x = ${fmt(wrong)}$`,
        answer: `${name} compared a part of a side ($${D}${B}$) with a whole side ($${B}${C}$). The similar triangles $\\triangle ${A}${D}${E} \\sim \\triangle ${A}${B}${C}$ give $\\frac{${A}${D}}{${A}${B}} = \\frac{${D}${E}}{${B}${C}}$: $\\frac{${p}}{${p + q}} = \\frac{${de}}{x}$, so $x = ${fmt(bc)}$.`,
      }
    }
    if (kind === 'consecutive') {
      const x = rng.int(5, 20)
      const ang = rng.int(55, 80)
      const e1 = linearFor(rng, x, ang)
      const e2 = linearFor(rng, x, 180 - ang, { avoid: [e1.a] })
      const wrongX = (e2.b - e1.b) / (e1.a - e2.a)
      const [A, B, C, D] = letters(rng, 4)
      return {
        type: 'error',
        lessons: ['2C.13'],
        types: ['PRF.CRITIQUE', 'ALG.QUAD_EQUATION'],
        prompt: `In parallelogram $${A}${B}${C}${D}$, $m\\angle ${A} = (${e1.a === 1 ? '' : e1.a}x ${e1.b < 0 ? '-' : '+'} ${Math.abs(e1.b)})^\\circ$ and $m\\angle ${B} = (${e2.a === 1 ? '' : e2.a}x ${e2.b < 0 ? '-' : '+'} ${Math.abs(e2.b)})^\\circ$. Find the error in ${name}’s work and find the correct $m\\angle ${A}$.`,
        studentName: name,
        work: `Opposite angles are congruent, so\n$${e1.a === 1 ? '' : e1.a}x ${e1.b < 0 ? '-' : '+'} ${Math.abs(e1.b)} = ${e2.a === 1 ? '' : e2.a}x ${e2.b < 0 ? '-' : '+'} ${Math.abs(e2.b)}$\n$x = ${fmt(wrongX)}$`,
        answer: `$\\angle ${A}$ and $\\angle ${B}$ are consecutive angles, not opposite angles, so they are supplementary: the two expressions add to 180. Then $x = ${x}$ and $m\\angle ${A} = ${ang}^\\circ$.`,
      }
    }
    if (kind === 'special') {
      const leg = rng.int(3, 12)
      const hypGiven = rng.bool()
      if (hypGiven) {
        return {
          type: 'error',
          lessons: ['4A.2'],
          types: ['PRF.CRITIQUE', 'SRT.45_45_90'],
          prompt: `The hypotenuse of a 45-45-90 triangle is ${leg}. Find the error in ${name}’s work and find the correct length of a leg.`,
          studentName: name,
          work: `The leg is the hypotenuse times $\\sqrt{2}$:\n$\\text{leg} = ${leg}\\sqrt{2}$`,
          answer: `The hypotenuse is the longest side, so the leg must be shorter: leg $= \\frac{${leg}}{\\sqrt{2}} = ${leg % 2 === 0 ? radicalLatex(2, leg / 2) : `\\frac{${leg}\\sqrt{2}}{2}`}$.`,
        }
      }
      return {
        type: 'error',
        lessons: ['4A.2'],
        types: ['PRF.CRITIQUE', 'SRT.45_45_90'],
        prompt: `Each leg of a 45-45-90 triangle is ${leg}. Find the error in ${name}’s work and find the correct hypotenuse.`,
        studentName: name,
        work: `The hypotenuse is the leg divided by $\\sqrt{2}$:\n$\\text{hypotenuse} = \\frac{${leg}}{\\sqrt{2}}$`,
        answer: `Dividing makes the hypotenuse shorter than a leg, which is impossible. Hypotenuse $= ${leg}\\sqrt{2}$.`,
      }
    }
    // classify: student uses a non-longest side as c
    for (;;) {
      const a = rng.int(4, 12)
      const b = rng.int(a + 1, 16)
      const c = rng.int(b + 1, a + b - 1)
      const sum = a * a + b * b
      if (sum === c * c) continue
      const truth = c * c < sum ? 'acute' : 'obtuse'
      // Student treats b as the longest side.
      const studentSum = a * a + c * c
      const studentSays = b * b < studentSum ? 'acute' : b * b > studentSum ? 'obtuse' : 'right'
      if (studentSays === truth) continue
      return {
        type: 'error',
        lessons: ['3C.15'],
        types: ['PRF.CRITIQUE', 'PYTH.CLASSIFY'],
        prompt: `A triangle has sides ${a}, ${b}, and ${c}. Find the error in ${name}’s work and classify the triangle correctly.`,
        studentName: name,
        work: `$${a}^2 + ${c}^2 = ${studentSum}$ and $${b}^2 = ${b * b}$\nSince $${b * b} ${b * b < studentSum ? '<' : '>'} ${studentSum}$, the triangle is ${studentSays}.`,
        answer: `${name} compared with ${b}, but the longest side is ${c}. $${a}^2 + ${b}^2 = ${sum}$ and $${c}^2 = ${c * c}$; since $${c * c} ${c * c < sum ? '<' : '>'} ${sum}$, the triangle is ${truth}.`,
      }
    }
  },
}

export const formatGenerators: Generator[] = [completeStatement, errorAnalysis]

