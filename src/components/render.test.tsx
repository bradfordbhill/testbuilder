import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { generators, newQuestionFromGenerator, questionForVersion } from '../gen'
import { withType } from '../model/defaults'
import { QUESTION_TYPE_LABELS, type QuestionType } from '../model/types'
import { QuestionView } from './QuestionView'

describe('QuestionView renders every format', () => {
  it('renders generated questions (student and key, Forms A and B)', () => {
    for (const g of generators) {
      const q = newQuestionFromGenerator(g, 2024, {}, `q-${g.id}`)
      for (const v of [0, 1]) {
        const qv = questionForVersion(q, v)
        for (const mode of ['student', 'key'] as const) {
          const html = renderToStaticMarkup(<QuestionView q={qv} number={1} mode={mode} version={v} showSolution />)
          expect(html.length, `${g.id} ${mode}`).toBeGreaterThan(50)
          // (unit-circle answers legitimately include the word “undefined”)
          expect(html, g.id).not.toMatch(g.id === 'unit-circle' ? /NaN/ : /undefined|NaN/)
        }
      }
    }
  })

  it('renders a blank question of every type', () => {
    for (const t of Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]) {
      const q = withType({ id: `blank-${t}` }, t)
      for (const mode of ['student', 'key'] as const) {
        expect(renderToStaticMarkup(<QuestionView q={q} mode={mode} />).length, t).toBeGreaterThan(20)
      }
    }
  })

  it('hides answers on the student copy and shows them on the key', () => {
    const q = withType({ id: 'c1' }, 'cloze')
    const student = renderToStaticMarkup(<QuestionView q={q} mode="student" />)
    const key = renderToStaticMarkup(<QuestionView q={q} mode="key" />)
    expect(student).not.toContain('three pairs of corresponding sides')
    expect(key).toContain('three pairs of corresponding sides')
  })
})
