import type { Question, QuestionType } from './types'

/** Convert (or create) a question of the given type, keeping shared fields. */
export function withType(q: Partial<Question> & { id: string }, type: QuestionType): Question {
  const now = Date.now()
  const base = {
    id: q.id,
    lessons: q.lessons ?? [],
    prompt: q.prompt ?? '',
    diagram: q.diagram,
    diagramPos: q.diagramPos,
    points: q.points ?? defaultPoints(type),
    difficulty: q.difficulty,
    honors: q.honors,
    tags: q.tags,
    solution: q.solution,
    workLines: q.workLines ?? (type === 'short' ? 4 : type === 'free' ? 8 : undefined),
    gen: q.gen,
    createdAt: q.createdAt ?? now,
    updatedAt: now,
  }
  const prev = q as Record<string, unknown>
  switch (type) {
    case 'short':
      return { ...base, type, answers: (prev.answers as never) ?? [{ label: 'x', value: '' }] }
    case 'free':
      return { ...base, type, answer: (prev.answer as string) ?? '' }
    case 'proof':
      return {
        ...base,
        type,
        given: (prev.given as string) ?? '',
        prove: (prev.prove as string) ?? '',
        format: (prev.format as 'two-column') ?? 'two-column',
        rows: (prev.rows as never) ?? [
          { statement: '', reason: 'Given', showStatement: false, showReason: false },
          { statement: '', reason: '', showStatement: false, showReason: false },
          { statement: '', reason: '', showStatement: false, showReason: false },
        ],
      }
    case 'tf':
      return {
        ...base,
        type,
        mode: (prev.mode as 'tf') ?? 'tf',
        items: (prev.items as never) ?? [{ text: '', answer: 'T' }],
        prompt: q.prompt || 'Write T if the statement is true or F if it is false.',
      }
    case 'matching':
      return {
        ...base,
        type,
        pairs: (prev.pairs as never) ?? [
          { left: '', right: '' },
          { left: '', right: '' },
          { left: '', right: '' },
        ],
        distractors: prev.distractors as string[] | undefined,
        prompt: q.prompt || 'Match each item on the left with the best choice on the right.',
      }
    case 'mc':
      return { ...base, type, choices: (prev.choices as string[]) ?? ['', '', '', ''], correct: (prev.correct as number) ?? 0, shuffle: true }
  }
}

export function defaultPoints(type: QuestionType): number {
  return { short: 2, free: 4, proof: 6, tf: 1, matching: 1, mc: 1 }[type]
}

