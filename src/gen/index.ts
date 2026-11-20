import { compareCodes, courseMap } from '../lib/courseMap'
import { makeRng, mixSeed } from '../lib/rng'
import type { Question } from '../model/types'
import type { GenProblem, Generator } from './types'
import { unit1Generators } from './unit1'
import { unit2Generators } from './unit2'
import { unit3Generators } from './unit3'
import { unit4Generators } from './unit4'
import { proofGenerators } from './proofs'
import { catalogGapGenerators } from './catalogGaps'
import { formatGenerators } from './formats'

export const generators: Generator[] = [...unit1Generators, ...unit2Generators, ...proofGenerators, ...unit3Generators, ...unit4Generators, ...catalogGapGenerators, ...formatGenerators]

export const generatorById = new Map(generators.map((g) => [g.id, g]))

/** Generators that practice a given lesson. */
export function generatorsForLesson(code: string): Generator[] {
  return generators.filter((g) => g.lessons.includes(code))
}

/** Earliest lesson a generator covers (for sorting). */
export function firstLesson(g: Generator): string {
  return [...g.lessons].sort(compareCodes)[0]
}

export function unitOf(g: Generator): number {
  return courseMap.byCode.get(firstLesson(g))?.unit ?? 0
}

/** Fill in option defaults. */
export function resolveOptions(g: Generator, opts: Record<string, unknown> = {}): Record<string, string> {
  const out: Record<string, string> = {}
  for (const o of g.options ?? []) out[o.key] = String(opts[o.key] ?? o.default)
  if (opts.format) out.format = String(opts.format)
  return out
}

/** Run a generator deterministically. */
export function runGenerator(g: Generator, seed: number, opts: Record<string, unknown> = {}): GenProblem {
  const resolved = resolveOptions(g, opts)
  // Retry with derived seeds if a generator throws on an unlucky draw.
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const problem = g.generate(makeRng(attempt === 0 ? seed : mixSeed(seed, attempt)), resolved)
      return resolved.format === 'mc' ? toMultipleChoice(problem, seed) : problem
    } catch (e) {
      if (attempt === 7) throw e
    }
  }
  throw new Error('unreachable')
}

/** Whether a generator's problems can be offered as multiple choice. */
export function supportsMC(p: GenProblem): boolean {
  return p.type === 'mc' || (p.type === 'short' && !!p.distractors && p.distractors.length >= 3)
}

/** Convert a short-answer problem with distractors into multiple choice (choice = first answer part). */
export function toMultipleChoice(p: GenProblem, seed: number): GenProblem {
  if (p.type !== 'short' || !p.distractors) return p
  // Exact value only (drop "≈ decimal" parts) and distinct choices.
  const correct = p.answers[0].value.replace(/\s*\\approx.*$/, '')
  const wrong = [...new Set(p.distractors)].filter((d) => d !== correct).slice(0, 3)
  if (wrong.length < 3) return p
  const rng = makeRng(mixSeed(seed, 77))
  const choices = rng.shuffle([correct, ...wrong])
  const label = p.answers[0].label
  const prompt = p.prompt.replace(/Then find[\s\S]*$/, '').replace(/ and (the )?(measure|length)[^.]*\./, '.')
  return {
    type: 'mc',
    prompt: label && !/\$x\$/.test(prompt) ? `${prompt} (Find $${label}$.)` : prompt,
    diagram: p.diagram,
    diagramPos: p.diagramPos,
    choices,
    correct: choices.indexOf(correct),
    solution: p.solution,
    workLines: p.workLines,
  }
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
type Payload = DistributiveOmit<Question, 'id' | 'lessons' | 'points' | 'createdAt' | 'updatedAt'>

/** Turn a generated problem into question fields. */
export function problemToQuestionFields(p: GenProblem): Payload {
  const base = {
    prompt: p.prompt,
    diagram: p.diagram,
    diagramPos: p.diagramPos,
    solution: p.solution,
    workLines: p.workLines,
  }
  switch (p.type) {
    case 'short':
      return { ...base, type: 'short', answers: p.answers, ...(p.layout ? { layout: p.layout } : {}) }
    case 'select':
      return { ...base, type: 'select', choices: p.choices, correct: p.correct, shuffle: p.shuffle }
    case 'decide':
      return { ...base, type: 'decide', choices: p.choices, correct: p.correct, justification: p.justification, justifyLabel: p.justifyLabel, justifyLines: p.justifyLines }
    case 'cloze':
      return { ...base, type: 'cloze', text: p.text, wordBank: p.wordBank, extraWords: p.extraWords }
    case 'order':
      return { ...base, type: 'order', items: p.items, fixFirst: p.fixFirst }
    case 'error':
      return { ...base, type: 'error', studentName: p.studentName, work: p.work, answer: p.answer }
    case 'table':
      return { ...base, type: 'table', headers: p.headers, rows: p.rows }
    case 'free':
      return { ...base, type: 'free', answer: p.answer }
    case 'mc':
      return { ...base, type: 'mc', choices: p.choices, correct: p.correct, shuffle: false }
    case 'tf':
      return { ...base, type: 'tf', mode: p.mode, style: p.style, items: p.items, requireJustification: p.requireJustification }
    case 'matching':
      return { ...base, type: 'matching', pairs: p.pairs, distractors: p.distractors }
    case 'proof':
      return { ...base, type: 'proof', given: p.given, prove: p.prove, rows: p.rows, format: p.format }
  }
}

const DEFAULT_POINTS: Record<string, number> = { short: 2, free: 4, proof: 6, tf: 1, matching: 1, mc: 1, select: 4, decide: 2, cloze: 1, order: 2, error: 4, table: 1 }

export function newQuestionFromGenerator(g: Generator, seed: number, opts: Record<string, unknown>, id: string): Question {
  const p = runGenerator(g, seed, opts)
  const fields = problemToQuestionFields(p)
  const now = Date.now()
  const pts =
    fields.type === 'tf'
      ? fields.items.length * (fields.mode === 'tf' ? 1 : 2)
      : fields.type === 'matching'
        ? fields.pairs.length
        : fields.type === 'cloze'
          ? Math.max(1, (fields.text.match(/\[\[/g) ?? []).length)
          : fields.type === 'table'
            ? Math.max(1, fields.rows.flat().filter((c) => !c.given).length)
            : DEFAULT_POINTS[fields.type]
  return {
    ...fields,
    id,
    lessons: [...(p.lessons ?? g.lessons)].sort(compareCodes).slice(0, 3),
    points: pts,
    honors: g.honors,
    difficulty: g.difficulty,
    gen: { generatorId: g.id, seed, options: resolveOptions(g, opts) },
    problemTypes: p.types ?? g.types,
    createdAt: now,
    updatedAt: now,
  } as Question
}

/**
 * The version of a question used on test version `v` (0 = Form A).
 * Form A uses the stored (possibly hand-edited) question; later forms re-roll generated questions.
 */
export function questionForVersion(q: Question, v: number, salt = 0): Question {
  if (!q.gen || v === 0) return q
  const g = generatorById.get(q.gen.generatorId)
  if (!g) return q
  const seed = mixSeed(q.gen.seed, v, salt)
  try {
    const fields = problemToQuestionFields(runGenerator(g, seed, q.gen.options ?? {}))
    return { ...q, ...fields, points: q.points, lessons: q.lessons, gen: { ...q.gen, seed, edited: undefined } } as Question
  } catch {
    return q
  }
}

/** Catalog types of a question: explicit tags, else its generator's types. */
export function questionTypes(q: Question): string[] {
  if (q.problemTypes) return q.problemTypes
  if (q.gen) return generatorById.get(q.gen.generatorId)?.types ?? []
  return []
}
