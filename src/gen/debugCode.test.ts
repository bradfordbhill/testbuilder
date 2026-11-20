import { describe, expect, it } from 'vitest'
import { debugCode, parseDebugCode } from './debugCode'
import { generators, newQuestionFromGenerator, problemToQuestionFields, questionForVersion, runGenerator } from './index'

/** Regenerate a question from its debug code alone. */
function reproduce(code: string) {
  const p = parseDebugCode(code)
  if (!p || p.kind !== 'generated') throw new Error(`bad code ${code}`)
  const g = generators.find((x) => x.id === p.generatorId)!
  return problemToQuestionFields(runGenerator(g, p.seed, p.options))
}

const strip = (q: object) => {
  const { prompt, diagram, ...rest } = q as Record<string, unknown>
  const keep = ['answers', 'choices', 'correct', 'items', 'pairs', 'rows', 'given', 'prove', 'answer']
  return JSON.stringify({ prompt, diagram, ...Object.fromEntries(keep.filter((k) => k in rest).map((k) => [k, rest[k]])) })
}

describe('debug codes', () => {
  it('reproduce every generator exactly, for Form A and later forms', () => {
    for (const g of generators) {
      for (const format of ['native', 'mc']) {
        const opts = format === 'mc' ? { format: 'mc' } : {}
        const q = newQuestionFromGenerator(g, 424242, opts, 'q')
        for (const v of [0, 1, 3]) {
          const qv = questionForVersion(q, v, 2)
          const code = debugCode(qv)
          expect(code.startsWith(`G:${g.id}:`), code).toBe(true)
          expect(strip(reproduce(code)), `${g.id} v${v} ${code}`).toBe(strip(qv))
        }
      }
    }
  })

  it('keeps non-default options in the code', () => {
    const g = generators.find((x) => x.id === 'side-splitter')!
    const q = newQuestionFromGenerator(g, 99, { variant: 'quadratic' }, 'q')
    expect(debugCode(q)).toMatch(/:variant=quadratic$/)
  })

  it('identifies hand-written questions by id', () => {
    const q = { id: 'abc123', gen: undefined } as never
    expect(debugCode(q)).toBe('Q:abc123')
    expect(parseDebugCode('Q:abc123')).toEqual({ kind: 'question', id: 'abc123' })
  })

  it('rejects junk', () => {
    expect(parseDebugCode('hello')).toBeNull()
    expect(parseDebugCode('G:not-a-generator:1')).toBeNull()
  })
})
