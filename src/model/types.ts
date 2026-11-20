// Core data model for questions, diagrams and tests.

// ---------------------------------------------------------------- Diagrams
// Coordinates are "world" units with y pointing UP. The view box maps the
// world rectangle onto an SVG of `width` x `height` CSS pixels.

export interface DPoint {
  id: string
  x: number
  y: number
  label?: string
  /** Direction (degrees, 0 = right, 90 = up) to place the label. Auto if absent. */
  labelDir?: number
  /** Draw the dot? Defaults to true when labeled, false otherwise. */
  dot?: boolean
  hidden?: boolean
}

interface ShapeBase {
  id: string
  label?: string
  dashed?: boolean
  /** Thicker / highlighted stroke. */
  bold?: boolean
}

export interface SegmentShape extends ShapeBase {
  kind: 'segment'
  a: string
  b: string
  /** Congruence tick marks (0-3). */
  ticks?: number
  /** Parallel arrow marks (0-3). */
  arrows?: number
  /** Which side of the segment the label sits on (1 or -1). Auto if absent. */
  labelSide?: 1 | -1
}

export interface LineShape extends ShapeBase {
  kind: 'line' | 'ray'
  a: string
  b: string
  arrows?: number
  /** Arrowheads at the ends (default true). */
  heads?: boolean
}

export interface CircleShape extends ShapeBase {
  kind: 'circle'
  center: string
  /** Either a fixed radius (world units) or a point on the circle. */
  radius?: number
  through?: string
}

export interface ArcShape extends ShapeBase {
  kind: 'arc'
  center: string
  /** Start and end points (arc drawn counter-clockwise from a to b). */
  a: string
  b: string
}

export interface AngleShape extends ShapeBase {
  kind: 'angle'
  a: string
  vertex: string
  b: string
  /** Number of arcs (1-3). 0 means label only. */
  arcs?: number
  right?: boolean
  /** Arc radius in px (default 18). */
  size?: number
  /** Always mark the angle less than 180 (default) or the reflex angle. */
  reflex?: boolean
}

export interface PolygonShape extends ShapeBase {
  kind: 'polygon'
  points: string[]
  fill?: string
}

export interface TextShape extends ShapeBase {
  kind: 'text'
  x: number
  y: number
  text: string
  size?: number
}

export type Shape =
  | SegmentShape
  | LineShape
  | CircleShape
  | ArcShape
  | AngleShape
  | PolygonShape
  | TextShape

export interface GridSpec {
  step: number
  axes: boolean
  numbers: boolean
  /** Number every n-th grid line. */
  numberEvery?: number
}

export interface Diagram {
  /** Printed width in CSS px. Height follows the aspect ratio of the view. */
  width: number
  view: { xmin: number; xmax: number; ymin: number; ymax: number }
  points: DPoint[]
  shapes: Shape[]
  grid?: GridSpec
  /** "Not drawn to scale" caption. */
  notToScale?: boolean
}

// ---------------------------------------------------------------- Questions

export type QuestionType = 'short' | 'free' | 'proof' | 'tf' | 'matching' | 'mc'

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short: 'Short / numeric answer',
  free: 'Free response',
  proof: 'Proof',
  tf: 'True/False · Always/Sometimes/Never',
  matching: 'Matching',
  mc: 'Multiple choice',
}

export interface GenRef {
  generatorId: string
  seed: number
  options?: Record<string, unknown>
  /** True once the teacher has edited the generated text by hand. */
  edited?: boolean
}

export interface AnswerPart {
  /** e.g. "x", "m\\angle ABC" (LaTeX allowed). */
  label?: string
  /** Display value, LaTeX allowed, e.g. "4\\sqrt{3}" or "52^\\circ". */
  value: string
  /** Decimal value for future auto-grading. */
  numeric?: number
}

interface QuestionBase {
  id: string
  type: QuestionType
  /** Lesson codes from the course map, e.g. ["3B.9"]. */
  lessons: string[]
  /** Prompt text. Inline math in $...$, display math in $$...$$. */
  prompt: string
  diagram?: Diagram
  /** Where the diagram sits relative to the prompt. */
  diagramPos?: 'right' | 'below'
  points: number
  difficulty?: 1 | 2 | 3
  honors?: boolean
  tags?: string[]
  /** Worked solution shown on the answer key. */
  solution?: string
  /** Blank space for student work, in lines (≈ 0.3 in each). */
  workLines?: number
  gen?: GenRef
  /** Problem-type catalog ids, e.g. ["SIM.TRIANGLE_PROPORTIONALITY"]. */
  problemTypes?: string[]
  createdAt: number
  updatedAt: number
}

export interface ShortQuestion extends QuestionBase {
  type: 'short'
  answers: AnswerPart[]
}

export interface FreeQuestion extends QuestionBase {
  type: 'free'
  /** Model answer / rubric for the key. */
  answer: string
}

export interface ProofRow {
  statement: string
  reason: string
  /** Show this cell on the student copy (for fill-in-the-blank proofs). */
  showStatement?: boolean
  showReason?: boolean
}

export interface ProofQuestion extends QuestionBase {
  type: 'proof'
  given: string
  prove: string
  format: 'two-column' | 'paragraph'
  rows: ProofRow[]
  /** Number of rows on the student copy (defaults to rows.length). */
  studentRows?: number
}

export interface TFItem {
  text: string
  /** For tf mode: 'T' | 'F'. For asn mode: 'A' | 'S' | 'N'. */
  answer: string
  explanation?: string
}

export interface TFQuestion extends QuestionBase {
  type: 'tf'
  mode: 'tf' | 'asn'
  items: TFItem[]
  /** Students must correct false statements / justify. */
  requireJustification?: boolean
}

export interface MatchPair {
  left: string
  right: string
}

export interface MatchingQuestion extends QuestionBase {
  type: 'matching'
  pairs: MatchPair[]
  /** Extra choices in the right column that match nothing. */
  distractors?: string[]
}

export interface MCQuestion extends QuestionBase {
  type: 'mc'
  choices: string[]
  correct: number
  shuffle?: boolean
}

export type Question =
  | ShortQuestion
  | FreeQuestion
  | ProofQuestion
  | TFQuestion
  | MatchingQuestion
  | MCQuestion

// ---------------------------------------------------------------- Tests

export interface TestItem {
  /** Stable key for drag-and-drop (assigned automatically). */
  key?: string
  questionId: string
  /** Overrides the question's points. */
  points?: number
  pageBreakBefore?: boolean
}

export interface TestSection {
  id: string
  title: string
  instructions?: string
  items: TestItem[]
}

export interface Test {
  id: string
  title: string
  subtitle?: string
  instructions?: string
  sections: TestSection[]
  /** Number of versions (Form A, B, C...). Generated questions re-roll per version. */
  versions: number
  /** Shuffle question order within sections for versions after A. */
  shuffleQuestions?: boolean
  showPoints: boolean
  header: { name: boolean; date: boolean; period: boolean }
  /** Seed salt so versions can be re-rolled as a whole. */
  versionSalt: number
  createdAt: number
  updatedAt: number
}

export interface AppData {
  version: 1
  questions: Record<string, Question>
  tests: Record<string, Test>
}
