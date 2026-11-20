import type { AnswerPart, Diagram, MatchPair, ProofRow, TFItem } from '../model/types'
import type { Rng } from '../lib/rng'

interface Common {
  /** Overrides the generator's catalog types for this particular problem (e.g. by template). */
  types?: string[]
  prompt: string
  diagram?: Diagram
  diagramPos?: 'right' | 'below'
  solution?: string
  workLines?: number
}

export type GenProblem =
  | (Common & {
      type: 'short'
      answers: AnswerPart[]
      /** Wrong answers (LaTeX) so the problem can be offered as multiple choice. */
      distractors?: string[]
    })
  | (Common & { type: 'free'; answer: string })
  | (Common & { type: 'mc'; choices: string[]; correct: number })
  | (Common & { type: 'tf'; mode: 'tf' | 'asn'; items: TFItem[]; requireJustification?: boolean })
  | (Common & { type: 'matching'; pairs: MatchPair[]; distractors?: string[] })
  | (Common & {
      type: 'proof'
      given: string
      prove: string
      rows: ProofRow[]
      format: 'two-column' | 'paragraph'
    })

export interface GenOption {
  key: string
  label: string
  choices: { value: string; label: string }[]
  default: string
}

export interface Generator {
  id: string
  title: string
  /** Lesson codes this generator practices. */
  lessons: string[]
  /** Problem-type catalog ids this generator produces. */
  types: string[]
  description: string
  honors?: boolean
  difficulty?: 1 | 2 | 3
  /** Generator-specific options shown in the UI (e.g. variant). */
  options?: GenOption[]
  generate(rng: Rng, opts: Record<string, string>): GenProblem
}

/** Answer part helper. */
export const ans = (label: string | undefined, value: string | number, numeric?: number): AnswerPart => ({
  ...(label ? { label } : {}),
  value: String(value),
  ...(numeric !== undefined
    ? { numeric }
    : typeof value === 'number'
      ? { numeric: value }
      : /^-?\d+(\.\d+)?$/.test(String(value))
        ? { numeric: Number(value) }
        : {}),
})

/**
 * Choose a·x + b with integer a in [aMin, aMax] (a ≠ 0, ≠ ±1 unless allowed)
 * evaluating to `value` at x, keeping |b| reasonable and b ≠ 0.
 */
export function linearFor(
  rng: Rng,
  x: number,
  value: number,
  { aMin = 2, aMax = 7, maxB = 60, allowOne = false, avoid = [] as number[] } = {},
): { a: number; b: number } {
  for (let tries = 0; tries < 200; tries++) {
    let a = rng.int(aMin, aMax)
    if (a === 0 || (!allowOne && Math.abs(a) === 1) || avoid.includes(a)) continue
    const b = value - a * x
    if (b === 0 || Math.abs(b) > maxB) continue
    return { a, b }
  }
  // Fallback: x + (value - x)
  return { a: 1, b: value - x }
}

/** Two different linear expressions for equal values (for "set equal" problems). */
export function twoLinearFor(rng: Rng, x: number, value: number, opts: Parameters<typeof linearFor>[3] = {}) {
  const e1 = linearFor(rng, x, value, opts)
  const e2 = linearFor(rng, x, value, { ...opts, avoid: [e1.a] })
  return [e1, e2] as const
}

/** Fresh letters for naming figures. */
export function letters(rng: Rng, n: number, exclude = 'IOQ'): string[] {
  const pool = 'ABCDEFGHJKLMNPRSTUVWXYZ'.split('').filter((c) => !exclude.includes(c))
  // Prefer a consecutive run sometimes; otherwise random picks.
  if (rng.bool(0.5)) {
    const runs = ['ABCDEFGH', 'DEFGHJKL', 'JKLMNPRS', 'PQRSTUVW', 'RSTUVWXY', 'WXYZ', 'LMNPRS']
    const run = rng.pick(runs.filter((r) => r.length >= n)).split('').filter((c) => !exclude.includes(c))
    if (run.length >= n) {
      const start = rng.int(0, run.length - n)
      return run.slice(start, start + n)
    }
  }
  return rng.shuffle(pool).slice(0, n)
}

/** Unique numeric distractors near a value. */
export function numericDistractors(rng: Rng, correct: number, candidates: number[], count = 3, places = 2): string[] {
  const seen = new Set<string>([String(Math.round(correct * 10 ** places) / 10 ** places)])
  const out: string[] = []
  for (const c of rng.shuffle(candidates)) {
    if (!Number.isFinite(c)) continue
    const s = String(Math.round(c * 10 ** places) / 10 ** places)
    if (seen.has(s)) continue
    seen.add(s)
    out.push(s)
    if (out.length === count) break
  }
  let k = 1
  while (out.length < count) {
    const s = String(Math.round((correct + k * (rng.bool() ? 1 : -1) * Math.max(1, Math.abs(correct) * 0.1)) * 10 ** places) / 10 ** places)
    if (!seen.has(s)) {
      seen.add(s)
      out.push(s)
    }
    k++
  }
  return out
}
