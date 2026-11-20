// Proof templates and the proof-family generators built on them:
// two-column proofs, fill-in, put-in-order, critique (find the flaw), justification MC, and converses.
import { diagram, type DiagramBuilder } from '../diagram/build'
import { polar } from '../diagram/geom'
import type { Rng } from '../lib/rng'
import type { ProofRow } from '../model/types'
import { ans, type GenOption, type Generator, letters } from './types'
import { applyBlanks, proofModeOption } from './unit2'

const seg = (a: string, b: string) => `\\overline{${a}${b}}`
const tri = (p: string) => `\\triangle ${p}`
const ang = (p: string) => `\\angle ${p}`

export const R = {
  given: 'Given',
  midpoint: 'Definition of midpoint',
  vertical: 'Vertical angles are congruent',
  altInt: 'Alternate interior angles are congruent (parallel lines)',
  altIntConverse: 'If alternate interior angles are congruent, then the lines are parallel',
  corr: 'Corresponding angles are congruent (parallel lines)',
  reflexiveSeg: 'A segment is congruent to itself',
  reflexiveAng: 'An angle is congruent to itself',
  perp: 'Definition of perpendicular',
  rightAngles: 'All right angles are congruent',
  sas: 'Side-Angle-Side Triangle Congruence Theorem (SAS)',
  asa: 'Angle-Side-Angle Triangle Congruence Theorem (ASA)',
  sss: 'Side-Side-Side Triangle Congruence Theorem (SSS)',
  cpctc: 'Corresponding parts of congruent triangles are congruent',
  defParallelogram: 'Definition of parallelogram',
  auxiliary: 'Two points determine a line (auxiliary segment)',
  aa: 'Angle-Angle Triangle Similarity Theorem',
}

/** Wrong reasons students give (misconception distractors). */
export const BAD_REASONS = [
  'Corresponding parts of congruent triangles are corresponding',
  'They appear to be the same measure',
  'Side-Side-Angle Triangle Congruence (SSA)',
  'Angle-Angle-Angle Triangle Congruence (AAA)',
  'Definition of congruent triangles',
]

export interface ProofTemplate {
  key: string
  label: string
  types: string[]
  build(rng: Rng): { given: string; prove: string; rows: ProofRow[]; diagram: DiagramBuilder }
}

/** Two crossing segments with point-symmetric endpoints (A↔D, B↔C through E). */
function crossing(A: string, B: string, C: string, D: string, E: string) {
  const a = { x: -2.4, y: 1.4 }
  const b = { x: -1.6, y: -1.3 }
  return diagram().pt(A, a.x, a.y).pt(B, b.x, b.y).pt(D, -a.x, -a.y).pt(C, -b.x, -b.y).pt(E, 0, 0)
}

function parallelogram(A: string, B: string, C: string, D: string) {
  const d = polar(3, 65)
  return diagram().pt(A, 0, 0).pt(B, 5, 0).pt(C, 5 + d.x, d.y).pt(D, d.x, d.y)
}

export const TEMPLATES: ProofTemplate[] = [
  {
    key: 'midpoints',
    label: 'Midpoints + vertical angles (SAS)',
    types: ['PRF.TRI_CONG'],
    build(rng) {
      const [A, B, C, D, E] = letters(rng, 5)
      const d = crossing(A, B, C, D, E).seg(A, D).seg(B, C).seg(A, B).seg(C, D)
      return {
        given: `$${E}$ is the midpoint of $${seg(A, D)}$ and $${seg(B, C)}$.`,
        prove: `$${tri(A + E + B)} \\cong ${tri(D + E + C)}$`,
        rows: [
          { statement: `$${E}$ is the midpoint of $${seg(A, D)}$ and $${seg(B, C)}$`, reason: R.given },
          { statement: `$${seg(A, E)} \\cong ${seg(E, D)}$, $${seg(B, E)} \\cong ${seg(E, C)}$`, reason: R.midpoint },
          { statement: `$${ang(A + E + B)} \\cong ${ang(D + E + C)}$`, reason: R.vertical },
          { statement: `$${tri(A + E + B)} \\cong ${tri(D + E + C)}$`, reason: R.sas },
        ],
        diagram: d,
      }
    },
  },
  {
    key: 'parallel',
    label: 'Parallel segments + midpoint (ASA)',
    types: ['PRF.TRI_CONG'],
    build(rng) {
      const [A, B, C, D, E] = letters(rng, 5)
      const d = crossing(A, B, C, D, E).seg(A, D).seg(B, C).seg(A, B, { arrows: 1 }).seg(C, D, { arrows: 1 })
      return {
        given: `$${seg(A, B)} \\parallel ${seg(C, D)}$ and $${E}$ is the midpoint of $${seg(B, C)}$.`,
        prove: `$${tri(A + B + E)} \\cong ${tri(D + C + E)}$`,
        rows: [
          { statement: `$${seg(A, B)} \\parallel ${seg(C, D)}$`, reason: R.given },
          { statement: `$${ang(A + B + E)} \\cong ${ang(D + C + E)}$`, reason: R.altInt },
          { statement: `$${E}$ is the midpoint of $${seg(B, C)}$`, reason: R.given },
          { statement: `$${seg(B, E)} \\cong ${seg(C, E)}$`, reason: R.midpoint },
          { statement: `$${ang(A + E + B)} \\cong ${ang(D + E + C)}$`, reason: R.vertical },
          { statement: `$${tri(A + B + E)} \\cong ${tri(D + C + E)}$`, reason: R.asa },
        ],
        diagram: d,
      }
    },
  },
  {
    key: 'kite',
    label: 'Shared side (SSS) + CPCTC',
    types: ['PRF.TRI_CONG', 'PRF.QUAD_PROPERTY'],
    build(rng) {
      const [A, B, C, D] = letters(rng, 4)
      const d = diagram().pt(A, 0, 2.2).pt(B, -2, 0).pt(C, 0, -3.6).pt(D, 2, 0)
      d.seg(A, B, { ticks: 1 }).seg(A, D, { ticks: 1 }).seg(B, C, { ticks: 2 }).seg(D, C, { ticks: 2 }).seg(A, C)
      return {
        given: `$${seg(A, B)} \\cong ${seg(A, D)}$ and $${seg(C, B)} \\cong ${seg(C, D)}$.`,
        prove: `$${ang(A + B + C)} \\cong ${ang(A + D + C)}$`,
        rows: [
          { statement: `$${seg(A, B)} \\cong ${seg(A, D)}$, $${seg(C, B)} \\cong ${seg(C, D)}$`, reason: R.given },
          { statement: `$${seg(A, C)} \\cong ${seg(A, C)}$`, reason: R.reflexiveSeg },
          { statement: `$${tri(A + B + C)} \\cong ${tri(A + D + C)}$`, reason: R.sss },
          { statement: `$${ang(A + B + C)} \\cong ${ang(A + D + C)}$`, reason: R.cpctc },
        ],
        diagram: d,
      }
    },
  },
  {
    key: 'perpbis',
    label: 'Perpendicular bisector (SAS) + CPCTC',
    types: ['PRF.TRI_CONG', 'PRF.ISOSCELES_PERPBIS'],
    build(rng) {
      const [A, B, C, D] = letters(rng, 4)
      const d = diagram().pt(A, -2.2, 0).pt(B, 2.2, 0).pt(D, 0, 0).pt(C, 0, 3)
      d.seg(A, D).seg(D, B).seg(C, D).seg(C, A).seg(C, B).right(B, D, C)
      return {
        given: `$${seg(C, D)} \\perp ${seg(A, B)}$ and $${D}$ is the midpoint of $${seg(A, B)}$.`,
        prove: `$${seg(A, C)} \\cong ${seg(B, C)}$`,
        rows: [
          { statement: `$${D}$ is the midpoint of $${seg(A, B)}$`, reason: R.given },
          { statement: `$${seg(A, D)} \\cong ${seg(D, B)}$`, reason: R.midpoint },
          { statement: `$${seg(C, D)} \\perp ${seg(A, B)}$`, reason: R.given },
          { statement: `$${ang(A + D + C)}$ and $${ang(B + D + C)}$ are right angles`, reason: R.perp },
          { statement: `$${ang(A + D + C)} \\cong ${ang(B + D + C)}$`, reason: R.rightAngles },
          { statement: `$${seg(C, D)} \\cong ${seg(C, D)}$`, reason: R.reflexiveSeg },
          { statement: `$${tri(A + D + C)} \\cong ${tri(B + D + C)}$`, reason: R.sas },
          { statement: `$${seg(A, C)} \\cong ${seg(B, C)}$`, reason: R.cpctc },
        ],
        diagram: d,
      }
    },
  },
  {
    key: 'parallelogram',
    label: 'Opposite sides of a parallelogram (ASA) + CPCTC',
    types: ['PRF.QUAD_PROPERTY', 'PRF.TRI_CONG'],
    build(rng) {
      const [A, B, C, D] = letters(rng, 4)
      const d = parallelogram(A, B, C, D).poly([A, B, C, D]).seg(A, C, { dashed: true })
      return {
        given: `$${A}${B}${C}${D}$ is a parallelogram.`,
        prove: `$${seg(A, B)} \\cong ${seg(C, D)}$`,
        rows: [
          { statement: `$${A}${B}${C}${D}$ is a parallelogram`, reason: R.given },
          { statement: `$${seg(A, B)} \\parallel ${seg(D, C)}$, $${seg(A, D)} \\parallel ${seg(B, C)}$`, reason: R.defParallelogram },
          { statement: `Draw $${seg(A, C)}$`, reason: R.auxiliary },
          { statement: `$${ang(B + A + C)} \\cong ${ang(D + C + A)}$`, reason: R.altInt },
          { statement: `$${ang(B + C + A)} \\cong ${ang(D + A + C)}$`, reason: R.altInt },
          { statement: `$${seg(A, C)} \\cong ${seg(A, C)}$`, reason: R.reflexiveSeg },
          { statement: `$${tri(A + B + C)} \\cong ${tri(C + D + A)}$`, reason: R.asa },
          { statement: `$${seg(A, B)} \\cong ${seg(C, D)}$`, reason: R.cpctc },
        ],
        diagram: d,
      }
    },
  },
  {
    key: 'parallel-via-cong',
    label: 'Lines parallel via congruent triangles',
    types: ['PRF.PARALLEL_VIA_CONG', 'PRF.TRI_CONG'],
    build(rng) {
      // Segments AB and CD cross at E with AE ≅ EB and CE ≅ ED; prove AC ∥ BD.
      const [A, B, C, D, E] = letters(rng, 5)
      const a = { x: -2.4, y: 1.4 }
      const c = { x: -1.6, y: -1.3 }
      const d = diagram().pt(A, a.x, a.y).pt(B, -a.x, -a.y).pt(C, c.x, c.y).pt(D, -c.x, -c.y).pt(E, 0, 0)
      d.seg(A, E, { ticks: 1 }).seg(E, B, { ticks: 1 }).seg(C, E, { ticks: 2 }).seg(E, D, { ticks: 2 }).seg(A, C).seg(B, D)
      return {
        given: `$${seg(A, E)} \\cong ${seg(E, B)}$ and $${seg(C, E)} \\cong ${seg(E, D)}$.`,
        prove: `$${seg(A, C)} \\parallel ${seg(B, D)}$`,
        rows: [
          { statement: `$${seg(A, E)} \\cong ${seg(E, B)}$, $${seg(C, E)} \\cong ${seg(E, D)}$`, reason: R.given },
          { statement: `$${ang(A + E + C)} \\cong ${ang(B + E + D)}$`, reason: R.vertical },
          { statement: `$${tri(A + E + C)} \\cong ${tri(B + E + D)}$`, reason: R.sas },
          { statement: `$${ang(C + A + E)} \\cong ${ang(D + B + E)}$`, reason: R.cpctc },
          { statement: `$${seg(A, C)} \\parallel ${seg(B, D)}$`, reason: R.altIntConverse },
        ],
        diagram: d,
      }
    },
  },
  {
    key: 'diagonals-bisect',
    label: 'Diagonals bisect each other ⇒ parallelogram',
    types: ['PRF.PROVE_PARALLELOGRAM', 'PRF.TRI_CONG'],
    build(rng) {
      const [A, B, C, D, E] = letters(rng, 5)
      const d = parallelogram(A, B, C, D)
      const pc = d.points.find((p) => p.id === C)!
      d.pt(E, pc.x / 2, pc.y / 2).poly([A, B, C, D])
      d.seg(A, E, { ticks: 1 }).seg(E, C, { ticks: 1 }).seg(B, E, { ticks: 2 }).seg(E, D, { ticks: 2 })
      return {
        given: `Diagonals $${seg(A, C)}$ and $${seg(B, D)}$ of quadrilateral $${A}${B}${C}${D}$ intersect at $${E}$, with $${seg(A, E)} \\cong ${seg(E, C)}$ and $${seg(B, E)} \\cong ${seg(E, D)}$.`,
        prove: `$${A}${B}${C}${D}$ is a parallelogram`,
        rows: [
          { statement: `$${seg(A, E)} \\cong ${seg(E, C)}$, $${seg(B, E)} \\cong ${seg(E, D)}$`, reason: R.given },
          { statement: `$${ang(A + E + B)} \\cong ${ang(C + E + D)}$`, reason: R.vertical },
          { statement: `$${tri(A + E + B)} \\cong ${tri(C + E + D)}$`, reason: R.sas },
          { statement: `$${ang(B + A + E)} \\cong ${ang(D + C + E)}$`, reason: R.cpctc },
          { statement: `$${seg(A, B)} \\parallel ${seg(C, D)}$`, reason: R.altIntConverse },
          { statement: `$${ang(A + E + D)} \\cong ${ang(C + E + B)}$`, reason: R.vertical },
          { statement: `$${tri(A + E + D)} \\cong ${tri(C + E + B)}$`, reason: R.sas },
          { statement: `$${ang(D + A + E)} \\cong ${ang(B + C + E)}$`, reason: R.cpctc },
          { statement: `$${seg(A, D)} \\parallel ${seg(B, C)}$`, reason: R.altIntConverse },
          { statement: `$${A}${B}${C}${D}$ is a parallelogram`, reason: R.defParallelogram },
        ],
        diagram: d,
      }
    },
  },
  {
    key: 'one-pair',
    label: 'One pair parallel and congruent ⇒ parallelogram',
    types: ['PRF.PROVE_PARALLELOGRAM', 'PRF.TRI_CONG'],
    build(rng) {
      const [A, B, C, D] = letters(rng, 4)
      const d = parallelogram(A, B, C, D)
      d.seg(A, B, { ticks: 1, arrows: 1 }).seg(D, C, { ticks: 1, arrows: 1 }).seg(B, C).seg(A, D).seg(A, C, { dashed: true })
      return {
        given: `In quadrilateral $${A}${B}${C}${D}$, $${seg(A, B)} \\parallel ${seg(D, C)}$ and $${seg(A, B)} \\cong ${seg(D, C)}$.`,
        prove: `$${A}${B}${C}${D}$ is a parallelogram`,
        rows: [
          { statement: `$${seg(A, B)} \\parallel ${seg(D, C)}$, $${seg(A, B)} \\cong ${seg(D, C)}$`, reason: R.given },
          { statement: `Draw $${seg(A, C)}$`, reason: R.auxiliary },
          { statement: `$${ang(B + A + C)} \\cong ${ang(D + C + A)}$`, reason: R.altInt },
          { statement: `$${seg(A, C)} \\cong ${seg(A, C)}$`, reason: R.reflexiveSeg },
          { statement: `$${tri(B + A + C)} \\cong ${tri(D + C + A)}$`, reason: R.sas },
          { statement: `$${ang(B + C + A)} \\cong ${ang(D + A + C)}$`, reason: R.cpctc },
          { statement: `$${seg(B, C)} \\parallel ${seg(A, D)}$`, reason: R.altIntConverse },
          { statement: `$${A}${B}${C}${D}$ is a parallelogram`, reason: R.defParallelogram },
        ],
        diagram: d,
      }
    },
  },
  {
    key: 'overlap',
    label: 'Overlapping triangles (shared angle, SAS)',
    types: ['PRF.OVERLAP', 'PRF.TRI_CONG'],
    build(rng) {
      // Isosceles-looking triangle ABC with D on AB, E on AC; AB ≅ AC, AD ≅ AE. Prove BE ≅ CD.
      const [A, B, C, D, E] = letters(rng, 5)
      const apex = { x: 0, y: 4 }
      const b = { x: -2, y: 0 }
      const c = { x: 2, y: 0 }
      const t = 0.45
      const d = diagram()
        .pt(A, apex.x, apex.y)
        .pt(B, b.x, b.y)
        .pt(C, c.x, c.y)
        .pt(D, apex.x + (b.x - apex.x) * t, apex.y + (b.y - apex.y) * t)
        .pt(E, apex.x + (c.x - apex.x) * t, apex.y + (c.y - apex.y) * t)
      d.seg(A, D, { ticks: 1 }).seg(A, E, { ticks: 1 }).seg(D, B).seg(E, C).seg(B, E).seg(C, D)
      return {
        given: `$${seg(A, B)} \\cong ${seg(A, C)}$ and $${seg(A, D)} \\cong ${seg(A, E)}$.`,
        prove: `$${seg(B, E)} \\cong ${seg(C, D)}$`,
        rows: [
          { statement: `$${seg(A, B)} \\cong ${seg(A, C)}$, $${seg(A, D)} \\cong ${seg(A, E)}$`, reason: R.given },
          { statement: `$${ang(A)} \\cong ${ang(A)}$`, reason: R.reflexiveAng },
          { statement: `$${tri(A + B + E)} \\cong ${tri(A + C + D)}$`, reason: R.sas },
          { statement: `$${seg(B, E)} \\cong ${seg(C, D)}$`, reason: R.cpctc },
        ],
        diagram: d,
      }
    },
  },
]

const templateOption: GenOption = {
  key: 'template',
  label: 'Template',
  default: 'any',
  choices: [{ value: 'any', label: 'Any' }, ...TEMPLATES.map((t) => ({ value: t.key, label: t.label }))],
}

const pickTemplate = (rng: Rng, key?: string, exclude: string[] = []) =>
  !key || key === 'any' ? rng.pick(TEMPLATES.filter((t) => !exclude.includes(t.key))) : (TEMPLATES.find((t) => t.key === key) ?? TEMPLATES[0])

const NAMES = ['Mariam', 'Mateo', 'Jordan', 'Priya', 'Lena', 'Diego', 'Kai', 'Noor', 'Sam', 'Ava']

/** Proof lines as text: "**1.** statement — _reason_". */
function proofLines(rows: ProofRow[], hideReason = -1): string {
  return rows.map((r, i) => `**${i + 1}.** ${r.statement}  — _${i === hideReason ? '?' : r.reason}_`).join('\n')
}

// ---------------------------------------------------------------- two-column / fill-in proof

export const congruenceProof: Generator = {
  id: 'congruence-proof',
  types: ['PRF.TRI_CONG', 'PRF.QUAD_PROPERTY', 'PRF.ISOSCELES_PERPBIS', 'PRF.PARALLEL_VIA_CONG', 'PRF.PROVE_PARALLELOGRAM', 'PRF.OVERLAP', 'PRF.FILL_IN_REASONS'],
  title: 'Two-column congruence proof (incl. parallelograms, overlap)',
  lessons: ['2B.6', '2B.7', '2B.8', '2B.9', '2B.10', '2C.13', '2D.15'],
  description:
    'Proof templates with random letters: midpoints (SAS), parallel segments (ASA), kite (SSS), perpendicular bisector, parallelogram opposite sides, lines parallel via congruence, diagonals bisect ⇒ parallelogram, one pair parallel & congruent ⇒ parallelogram, overlapping triangles. Course reason wording; choose blank or fill-in.',
  options: [templateOption, proofModeOption],
  generate(rng, opts) {
    const t = pickTemplate(rng, opts.template)
    const { given, prove, rows, diagram: d } = t.build(rng)
    const blanks = opts.blanks || 'reasons'
    return {
      type: 'proof',
      types: blanks === 'none' ? t.types : [...t.types, 'PRF.FILL_IN_REASONS'],
      prompt: blanks === 'none' ? 'Write a two-column proof.' : 'Complete the two-column proof.',
      given,
      prove,
      rows: applyBlanks(rng, rows, blanks),
      format: 'two-column',
      diagram: d.build(220),
    }
  },
}

// ---------------------------------------------------------------- put the proof in order

export const proofOrder: Generator = {
  id: 'proof-order',
  types: ['PRF.ORDER_STEPS'],
  title: 'Put the proof in order',
  lessons: ['2B.6', '2B.10', '2C.13'],
  description: 'The statements and reasons of a proof are scrambled; students write the letters in a valid order.',
  options: [templateOption],
  generate(rng, opts) {
    const t = pickTemplate(rng, opts.template)
    const { given, prove, rows, diagram: d } = t.build(rng)
    const order = rng.shuffle(rows.map((_, i) => i))
    const L = 'ABCDEFGHIJ'
    const lines = order.map((ri, k) => `**${L[k]}.** ${rows[ri].statement}  — _${rows[ri].reason}_`).join('\n')
    const answer = rows.map((_, ri) => L[order.indexOf(ri)]).join(', ')
    return {
      type: 'short',
      types: ['PRF.ORDER_STEPS'],
      prompt: `**Given:** ${given}\n**Prove:** ${prove}\n\nThe steps of the proof are scrambled. Write the letters in an order that makes a valid proof.\n\n${lines}`,
      diagram: d.build(200),
      answers: [ans('\\text{Order}', `\\text{${answer}}`)],
      solution: 'Other orders are correct if every statement only uses statements above it.',
      workLines: 1,
    }
  },
}

// ---------------------------------------------------------------- critique: find the flawed step

type Flaw = { row: number; wrong: string; why: string }

function injectFlaw(rng: Rng, rows: ProofRow[]): Flaw | null {
  const candidates: Flaw[] = []
  rows.forEach((r, i) => {
    if (r.reason === R.sas || r.reason === R.asa || r.reason === R.sss) {
      const wrong = rng.pick([R.sas, R.asa, R.sss, BAD_REASONS[2]].filter((x) => x !== r.reason))
      candidates.push({ row: i, wrong, why: `The marked parts give ${r.reason.match(/\((\w+)\)/)?.[1] ?? 'a different criterion'}, not the criterion cited.` })
    }
    if (r.reason === R.cpctc) candidates.push({ row: i, wrong: R.given, why: 'This fact is not given; it follows from the triangle congruence (CPCTC).' })
    if (r.reason === R.vertical) candidates.push({ row: i, wrong: R.altInt, why: 'No parallel lines are involved here; the angles are vertical angles.' })
    if (r.reason === R.altIntConverse) candidates.push({ row: i, wrong: R.altInt, why: 'The theorem is used in the wrong direction: congruent alternate interior angles show the lines are parallel (converse).' })
    if (r.reason === R.reflexiveSeg) candidates.push({ row: i, wrong: R.given, why: 'The shared side is not given; a segment is congruent to itself.' })
  })
  return candidates.length ? rng.pick(candidates) : null
}

export const proofCritique: Generator = {
  id: 'proof-critique',
  types: ['PRF.CRITIQUE'],
  title: 'Critique a proof: find and fix the flaw',
  lessons: ['2B.7', '2B.8', '2B.10', '2C.12', '2C.14'],
  description: 'A named student’s proof has exactly one wrong reason (wrong criterion, CPCTC cited as Given, converse direction, …). Students find the step and fix it.',
  options: [templateOption],
  generate(rng, opts) {
    const t = pickTemplate(rng, opts.template)
    const { given, prove, rows, diagram: d } = t.build(rng)
    const flaw = injectFlaw(rng, rows)!
    const shown = rows.map((r, i) => (i === flaw.row ? { ...r, reason: flaw.wrong } : r))
    const name = rng.pick(NAMES)
    return {
      type: 'short',
      types: ['PRF.CRITIQUE'],
      prompt: `**Given:** ${given}\n**Prove:** ${prove}\n\n${name} wrote this proof. Exactly one reason is wrong. Name the step, explain the error, and write the correct reason.\n\n${proofLines(shown)}`,
      diagram: d.build(200),
      answers: [ans('\\text{Step}', flaw.row + 1), ans('\\text{Correct reason}', `\\text{${rows[flaw.row].reason}}`)],
      solution: flaw.why,
      workLines: 3,
    }
  },
}

// ---------------------------------------------------------------- justification MC

export const proofJustification: Generator = {
  id: 'proof-justification',
  types: ['PRF.PROOF_ANALYSIS_MC'],
  title: 'Proof justification (multiple choice)',
  lessons: ['2B.6', '2B.7', '2B.9', '2B.10', '2C.13'],
  description: 'A student proof with one reason hidden; choose the correct justification (distractors use common misconceptions).',
  options: [templateOption],
  generate(rng, opts) {
    const t = pickTemplate(rng, opts.template)
    const { given, prove, rows, diagram: d } = t.build(rng)
    const candidates = rows.map((_, i) => i).filter((i) => rows[i].reason !== R.given)
    const target = rng.pick(candidates)
    const correct = rows[target].reason
    const pool = [...BAD_REASONS, ...Object.values(R)].filter((r) => r !== correct && r !== R.given && r !== R.aa)
    const wrong = rng.shuffle([...new Set(pool)]).slice(0, 3)
    const choices = rng.shuffle([correct, ...wrong])
    const name = rng.pick(NAMES)
    return {
      type: 'mc',
      types: ['PRF.PROOF_ANALYSIS_MC'],
      prompt: `**Given:** ${given}\n**Prove:** ${prove}\n\n${name}'s proof:\n\n${proofLines(rows, target)}\n\nWhat is a correct justification for step ${target + 1}?`,
      diagram: d.build(190),
      choices: choices.map((c) => c),
      correct: choices.indexOf(correct),
      solution: `Step ${target + 1}: ${correct}.`,
    }
  },
}

// ---------------------------------------------------------------- converses

const CONVERSES: { stmt: string; converse: string; truth: boolean; why: string; lessons: string[] }[] = [
  { stmt: 'If two angles are vertical angles, then they are congruent.', converse: 'If two angles are congruent, then they are vertical angles.', truth: false, why: 'Counterexample: the two base angles of an isosceles triangle are congruent but not vertical.', lessons: ['1D.19'] },
  { stmt: 'If two parallel lines are cut by a transversal, then alternate interior angles are congruent.', converse: 'If two lines are cut by a transversal so that alternate interior angles are congruent, then the lines are parallel.', truth: true, why: 'This is the converse of the Alternate Interior Angles Theorem.', lessons: ['1D.20'] },
  { stmt: 'If a point is on the perpendicular bisector of a segment, then it is equidistant from the endpoints.', converse: 'If a point is equidistant from the endpoints of a segment, then it is on the perpendicular bisector of the segment.', truth: true, why: 'Converse of the Perpendicular Bisector Theorem (proved with SSS).', lessons: ['2B.8'] },
  { stmt: 'If two sides of a triangle are congruent, then the angles opposite them are congruent.', converse: 'If two angles of a triangle are congruent, then the sides opposite them are congruent.', truth: true, why: 'Converse of the Isosceles Triangle Theorem.', lessons: ['2B.10'] },
  { stmt: 'If a triangle is equilateral, then it is isosceles.', converse: 'If a triangle is isosceles, then it is equilateral.', truth: false, why: 'Counterexample: a triangle with sides 5, 5, 8.', lessons: ['2A.4'] },
  { stmt: 'If two triangles are congruent, then their corresponding angles are congruent.', converse: 'If the corresponding angles of two triangles are congruent, then the triangles are congruent.', truth: false, why: 'AAA is not a congruence criterion: a triangle and a dilated copy (k = 2) have congruent angles but are not congruent.', lessons: ['2B.7', '2B.11'] },
  { stmt: 'If a quadrilateral is a parallelogram, then its diagonals bisect each other.', converse: 'If the diagonals of a quadrilateral bisect each other, then it is a parallelogram.', truth: true, why: 'Proved with two pairs of congruent triangles (SAS) and the converse of the Alternate Interior Angles Theorem.', lessons: ['2C.13', '2C.14'] },
  { stmt: 'If a quadrilateral is a rectangle, then its diagonals are congruent.', converse: 'If the diagonals of a quadrilateral are congruent, then it is a rectangle.', truth: false, why: 'Counterexample: an isosceles trapezoid has congruent diagonals.', lessons: ['2C.14'] },
  { stmt: 'If a quadrilateral is a square, then it has four congruent sides.', converse: 'If a quadrilateral has four congruent sides, then it is a square.', truth: false, why: 'Counterexample: a rhombus with a 60° angle.', lessons: ['2C.14'] },
  { stmt: 'If a quadrilateral is a rhombus, then its diagonals are perpendicular.', converse: 'If the diagonals of a quadrilateral are perpendicular, then it is a rhombus.', truth: false, why: 'Counterexample: a kite that is not a rhombus.', lessons: ['2C.14'] },
  { stmt: 'If a line is parallel to one side of a triangle, then it divides the other two sides proportionally.', converse: 'If a line divides two sides of a triangle proportionally, then it is parallel to the third side.', truth: true, why: 'Converse of the Triangle Proportionality Theorem (dilation from the vertex).', lessons: ['3B.11', '3A.5'] },
  { stmt: 'If a triangle is a right triangle with legs a, b and hypotenuse c, then a² + b² = c².', converse: 'If the sides of a triangle satisfy a² + b² = c², then the triangle is a right triangle.', truth: true, why: 'Converse of the Pythagorean Theorem.', lessons: ['3C.15'] },
  { stmt: 'If two figures are congruent, then they are similar.', converse: 'If two figures are similar, then they are congruent.', truth: false, why: 'Counterexample: squares with sides 1 and 2.', lessons: ['3B.6'] },
  { stmt: 'If two triangles are similar, then their corresponding angles are congruent.', converse: 'If the corresponding angles of two triangles are congruent, then the triangles are similar.', truth: true, why: 'Angle-Angle Triangle Similarity Theorem (two pairs suffice).', lessons: ['3B.9'] },
  { stmt: 'If an angle measures 30°, then its sine is 1/2 (for acute angles).', converse: 'If the sine of an acute angle is 1/2, then the angle measures 30°.', truth: true, why: 'Each ratio in (0, 1) comes from exactly one acute angle.', lessons: ['4B.10'] },
]

export const converseGen: Generator = {
  id: 'converse',
  types: ['PRF.CONVERSE', 'PRF.COUNTEREXAMPLE'],
  title: 'Write the converse; true or false?',
  lessons: ['2B.8', '2C.13', '3B.11', '3C.15', '4A.3'],
  description: 'State the converse of a theorem, decide whether it is true, and justify (theorem name or counterexample).',
  options: [
    {
      key: 'truth',
      label: 'Converse is',
      default: 'any',
      choices: [
        { value: 'any', label: 'Either' },
        { value: 'true', label: 'True' },
        { value: 'false', label: 'False (needs a counterexample)' },
      ],
    },
  ],
  generate(rng, opts) {
    const pool = CONVERSES.filter((c) => !opts.truth || opts.truth === 'any' || String(c.truth) === opts.truth)
    const c = rng.pick(pool)
    return {
      type: 'free',
      types: c.truth ? ['PRF.CONVERSE'] : ['PRF.CONVERSE', 'PRF.COUNTEREXAMPLE'],
      prompt: `${c.stmt}\n\n(a) Write the converse.\n\n(b) Is the converse true? If it is true, explain why. If it is false, give a counterexample.`,
      answer: `(a) ${c.converse}\n\n(b) ${c.truth ? 'True.' : 'False.'} ${c.why}`,
      workLines: 6,
    }
  },
}

export const proofGenerators: Generator[] = [congruenceProof, proofOrder, proofCritique, proofJustification, converseGen]
