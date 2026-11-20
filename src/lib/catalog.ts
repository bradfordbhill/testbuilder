// Problem-type catalog (src/data/problem-types.yaml): every problem type seen in the decks,
// homework and assessments, used to tag questions, check coverage and balance tests.
import { load } from 'js-yaml'
import raw from '../data/problem-types.yaml?raw'
import { compareCodes } from './courseMap'

export interface ProblemType {
  id: string
  name: string
  family: string
  /** Prefix of the id, e.g. "PRF". */
  group: string
  units: number[]
  task: string
  formats: string[]
  answerFormat: string
  figure?: string
  misconceptions: string[]
  scoring?: string
  notes?: string
  honors?: string
  algebraFoldIn?: string
  seenIn: { decks: string[]; homework: string[]; assessments: string[] }
  /** Lessons whose index lists this type (from index_by_lesson). */
  lessons: string[]
}

export interface Catalog {
  title: string
  version: string
  rules: string[]
  responseFormats: Record<string, string>
  scoring: Record<string, string>
  types: ProblemType[]
  byId: Map<string, ProblemType>
  byLesson: Map<string, string[]>
  groups: { prefix: string; label: string }[]
}

type Dict = Record<string, unknown>
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : [])
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)

export const GROUP_LABELS: Record<string, string> = {
  PRF: 'Proof',
  CRIT: 'Criteria',
  ANG: 'Angles',
  ALG: 'Algebra fold-in',
  QUAD: 'Quadrilaterals',
  TRF: 'Transformations',
  CON: 'Constructions',
  LOC: 'Locus',
  DIL: 'Dilations',
  SIM: 'Similarity',
  PYTH: 'Pythagorean',
  SRT: 'Special right triangles',
  TRIG: 'Right-triangle trig',
  POLY: 'Polygons / π',
  RAD: 'Radians',
  UC: 'Unit circle',
  OBL: 'Oblique triangles',
  TASK: 'Classroom routines',
}

export function parseCatalog(text: string): Catalog {
  const doc = load(text) as Dict
  const meta = (doc.meta ?? {}) as Dict
  const index = (doc.index_by_lesson ?? {}) as Record<string, unknown>
  const byLesson = new Map<string, string[]>()
  const lessonsOf = new Map<string, string[]>()
  for (const [code, ids] of Object.entries(index)) {
    byLesson.set(code, arr(ids))
    for (const id of arr(ids)) lessonsOf.set(id, [...(lessonsOf.get(id) ?? []), code])
  }
  const types: ProblemType[] = ((doc.types ?? []) as Dict[]).map((t) => {
    const id = String(t.id)
    const seen = (t.seen_in ?? {}) as Dict
    return {
      id,
      name: String(t.name ?? id),
      family: String(t.family ?? ''),
      group: id.split('.')[0],
      units: Array.isArray(t.units) ? t.units.map(Number) : [],
      task: String(t.task ?? ''),
      formats: [...new Set(arr(t.formats))],
      answerFormat: String(t.answer_format ?? ''),
      figure: str(t.figure),
      misconceptions: arr(t.misconceptions_distractors),
      scoring: str(t.scoring),
      notes: str(t.notes),
      honors: str(t.honors_extension),
      algebraFoldIn: str(t.algebra_fold_in),
      seenIn: { decks: arr(seen.decks), homework: arr(seen.homework), assessments: arr(seen.assessments) },
      lessons: (lessonsOf.get(id) ?? []).sort(compareCodes),
    }
  })
  const prefixes = [...new Set(types.map((t) => t.group))]
  return {
    title: String(meta.title ?? 'Problem types'),
    version: String(meta.version ?? ''),
    rules: arr(meta.rules),
    responseFormats: Object.fromEntries(Object.entries((doc.response_formats ?? {}) as Dict).map(([k, v]) => [k, String(v)])),
    scoring: Object.fromEntries(Object.entries((doc.scoring_conventions ?? {}) as Dict).map(([k, v]) => [k, String(v)])),
    types,
    byId: new Map(types.map((t) => [t.id, t])),
    byLesson,
    groups: prefixes.map((p) => ({ prefix: p, label: GROUP_LABELS[p] ?? p })),
  }
}

export const catalog: Catalog = parseCatalog(raw)

/**
 * How a type is expected to be covered:
 * - generate: randomized generators make sense
 * - write: best written by the teacher (open proofs, derivations); tracked through the bank
 * - classroom: hands-on routines that do not belong on a printed test (constructions, card sorts, info gaps)
 */
export type CoverageMode = 'generate' | 'write' | 'classroom'

const WRITE_BY_HAND = new Set([
  'PRF.WHY_CONSTRUCTION',
  'PRF.SYMMETRY_MIRROR',
  'PRF.QUAD_CONGRUENCE',
  'PRF.DILATION_THEOREM',
  'PRF.FORMULA_DERIVATION',
  'PRF.STATEMENT_PRECISION',
  'PRF.WORK_BACKWARD',
  'PRF.CHALLENGE',
  'LOC.EQUIDISTANT',
])

export function coverageMode(t: ProblemType): CoverageMode {
  if (t.group === 'TASK' || t.group === 'CON') return 'classroom'
  if (WRITE_BY_HAND.has(t.id)) return 'write'
  return 'generate'
}

/** Short label for a type id: the part after the dot, title-cased ("TRIANGLE_PROPORTIONALITY" → "Triangle proportionality"). */
export function shortTypeName(id: string): string {
  const t = catalog.byId.get(id)
  return t?.name ?? id
}

/** Suggested types for a set of lessons (from the catalog's lesson index). */
export function typesForLessons(codes: string[]): string[] {
  const out: string[] = []
  for (const c of codes) for (const id of catalog.byLesson.get(c) ?? []) if (!out.includes(id)) out.push(id)
  return out
}

/** How each catalog response format is produced in the app. */
export const FORMAT_SUPPORT: Record<string, string> = {
  mc_single: 'Multiple choice',
  select_all: 'Select all',
  true_false: 'True/False (blank or choices to circle)',
  always_sometimes_never: 'True/False type, A/S/N mode',
  must_could_cant: 'True/False type, Must/Could/Can’t mode · Decide and justify',
  matching: 'Matching',
  shared_stem_group: 'Shared stem on a test (#5–8)',
  shared_answer_bank: 'Shared stem with answer bank',
  numeric_answer: 'Short / numeric answer',
  answer_pair_blanks: 'Short answer, “Answer: ___ and ___” layout',
  short_justification: 'Free response',
  decide_and_justify: 'Decide and justify',
  fill_blank_statement: 'Fill in the blanks',
  fill_in_proof: 'Proof (cells hidden on the student copy)',
  two_column_proof: 'Proof, two-column',
  paragraph_proof: 'Proof, paragraph',
  any_format: 'Proof, any format',
  error_analysis: 'Error analysis',
  draw_on_diagram: 'Short answer or free response with a diagram',
  image_table: 'Fill-in table',
  short_answer: 'Short answer',
  counterexample: 'Decide and justify (counterexample)',
  prove_or_disprove: 'Decide and justify',
  count_cases: 'Short / numeric answer',
  guided_derivation: 'Free response',
  proof_plan: 'Free response',
  ordering: 'Put in order',
  sketch: 'Free response',
}
