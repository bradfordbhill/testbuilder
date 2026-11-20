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
    points: q.points === undefined || (q.type && q.points === defaultPoints(q.type)) ? defaultPoints(type) : q.points,
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
        items: Array.isArray(prev.items) && prev.items.every((x) => typeof x === 'object') ? (prev.items as never) : [{ text: '', answer: 'T' }],
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
      return { ...base, type, choices: (prev.choices as string[]) ?? ['', '', '', ''], correct: typeof prev.correct === 'number' ? prev.correct : 0, shuffle: true }
    case 'select':
      return {
        ...base,
        type,
        choices: (prev.choices as string[]) ?? ['', '', '', '', ''],
        correct: Array.isArray(prev.correct) ? (prev.correct as number[]) : typeof prev.correct === 'number' ? [prev.correct] : [],
        shuffle: true,
        prompt: q.prompt || 'Select all that apply.',
      }
    case 'decide':
      return {
        ...base,
        type,
        choices: (prev.choices as string[]) ?? ['Yes', 'No'],
        correct: typeof prev.correct === 'number' ? prev.correct : 0,
        justification: (prev.justification as string) ?? (prev.answer as string) ?? '',
        justifyLabel: (prev.justifyLabel as string) ?? 'Justify',
        justifyLines: (prev.justifyLines as number) ?? 3,
      }
    case 'cloze':
      return {
        ...base,
        type,
        text: (prev.text as string) ?? 'If there is a correspondence between two triangles so that [[three pairs of corresponding sides]] are congruent, then the triangles are congruent.',
        prompt: q.prompt || 'Complete the statement.',
      }
    case 'order':
      return { ...base, type, items: (prev.items as string[] | undefined)?.every((x) => typeof x === 'string') ? (prev.items as string[]) : ['', '', ''], prompt: q.prompt || 'Put the steps in order. Write the letters in order.' }
    case 'error':
      return {
        ...base,
        type,
        studentName: (prev.studentName as string) ?? 'Jordan',
        work: (prev.work as string) ?? '',
        answer: (prev.answer as string) ?? '',
        prompt: q.prompt || 'Find the error, explain why it is wrong, and correct it.',
      }
    case 'table':
      return {
        ...base,
        type,
        headers: (prev.headers as string[]) ?? ['Original', 'Image'],
        rows: (prev.rows as never) ?? [
          [
            { value: '', given: true },
            { value: '', given: false },
          ],
          [
            { value: '', given: true },
            { value: '', given: false },
          ],
        ],
      }
  }
}

export function defaultPoints(type: QuestionType): number {
  return { short: 2, free: 4, proof: 6, tf: 1, matching: 1, mc: 1, select: 4, decide: 2, cloze: 1, order: 2, error: 4, table: 1 }[type]
}

