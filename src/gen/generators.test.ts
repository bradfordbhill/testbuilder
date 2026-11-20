import { describe, expect, it } from 'vitest'
import { courseMap } from '../lib/courseMap'
import { generators, newQuestionFromGenerator, questionForVersion, runGenerator, toMultipleChoice } from './index'
import type { Generator } from './types'

function optionCombos(g: Generator): Record<string, string>[] {
  let combos: Record<string, string>[] = [{}]
  for (const o of g.options ?? []) {
    combos = combos.flatMap((c) => o.choices.map((ch) => ({ ...c, [o.key]: ch.value })))
  }
  return combos
}

const bad = /NaN|Infinity|\[object|(?<![{"])undefined/

function checkText(label: string, s: string | undefined) {
  if (s === undefined) return
  expect(s, label).not.toMatch(bad)
  // Balanced $ delimiters.
  const dollars = (s.match(/(?<!\\)\$/g) ?? []).length
  expect(dollars % 2, `${label}: unbalanced $ in ${s}`).toBe(0)
}

describe('generators', () => {
  it('have unique ids and valid lesson codes in Units 1-4', () => {
    const ids = new Set<string>()
    for (const g of generators) {
      expect(ids.has(g.id), g.id).toBe(false)
      ids.add(g.id)
      for (const code of g.lessons) {
        const lesson = courseMap.byCode.get(code)
        expect(lesson, `${g.id}: ${code}`).toBeDefined()
        expect(lesson!.unit).toBeLessThanOrEqual(4)
      }
    }
  })

  for (const g of generators) {
    it(`${g.id} produces well-formed problems`, () => {
      for (const opts of optionCombos(g)) {
        for (let seed = 1; seed <= 40; seed++) {
          const p = runGenerator(g, seed * 7919, opts)
          const where = `${g.id} seed=${seed} opts=${JSON.stringify(opts)}`
          checkText(`${where} prompt`, p.prompt)
          checkText(`${where} solution`, p.solution)
          if (p.diagram) {
            for (const pt of p.diagram.points) {
              expect(Number.isFinite(pt.x) && Number.isFinite(pt.y), `${where} point ${pt.id}`).toBe(true)
            }
            const ids = new Set(p.diagram.points.map((q) => q.id))
            for (const s of p.diagram.shapes) {
              const refs =
                s.kind === 'polygon' ? s.points : s.kind === 'angle' ? [s.a, s.vertex, s.b] : s.kind === 'circle' ? [s.center] : s.kind === 'arc' ? [s.center, s.a, s.b] : s.kind === 'text' ? [] : [s.a, s.b]
              for (const r of refs) expect(ids.has(r), `${where} shape ${s.id} references ${r}`).toBe(true)
              if ('label' in s) checkText(`${where} label`, s.label)
            }
            const v = p.diagram.view
            expect(v.xmax > v.xmin && v.ymax > v.ymin, `${where} view`).toBe(true)
          }
          switch (p.type) {
            case 'short':
              expect(p.answers.length, where).toBeGreaterThan(0)
              p.answers.forEach((a) => checkText(`${where} answer`, a.value))
              if (p.distractors) {
                const mc = toMultipleChoice(p, seed)
                if (mc.type === 'mc') {
                  expect(new Set(mc.choices).size, `${where} distinct choices ${mc.choices}`).toBe(mc.choices.length)
                  expect(mc.correct).toBeGreaterThanOrEqual(0)
                }
              }
              break
            case 'mc':
              expect(p.correct).toBeGreaterThanOrEqual(0)
              expect(p.correct).toBeLessThan(p.choices.length)
              break
            case 'tf':
              expect(p.items.length).toBeGreaterThan(0)
              break
            case 'matching':
              expect(p.pairs.length).toBeGreaterThan(1)
              break
            case 'select':
              expect(p.correct.length, where).toBeGreaterThan(0)
              expect(p.correct.every((i) => i >= 0 && i < p.choices.length), where).toBe(true)
              expect(new Set(p.choices).size, where).toBe(p.choices.length)
              break
            case 'decide':
              expect(p.correct).toBeGreaterThanOrEqual(0)
              expect(p.correct).toBeLessThan(p.choices.length)
              checkText(where, p.justification)
              break
            case 'cloze':
              expect(p.text, where).toMatch(/\[\[.+?\]\]/)
              checkText(where, p.text)
              break
            case 'order':
              expect(p.items.length, where).toBeGreaterThan(2)
              p.items.forEach((it) => checkText(where, it))
              break
            case 'error':
              expect(p.work.length, where).toBeGreaterThan(5)
              checkText(where, p.work)
              checkText(where, p.answer)
              break
            case 'table':
              expect(p.rows.every((r) => r.length === p.headers.length), where).toBe(true)
              expect(p.rows.flat().some((c) => !c.given), where).toBe(true)
              break
            case 'proof':
              expect(p.rows.length).toBeGreaterThan(1)
              p.rows.forEach((r) => {
                checkText(where, r.statement)
                checkText(where, r.reason)
              })
              break
          }
        }
      }
    })
  }

  it('ambiguous case produces 0, 1, and 2 triangles', () => {
    const g = generators.find((x) => x.id === 'ambiguous-case')!
    const seen = new Set<string>()
    for (let seed = 1; seed <= 60; seed++) {
      const p = runGenerator(g, seed * 104729)
      if (p.type === 'short') seen.add(p.answers[0].value)
    }
    expect([...seen].sort()).toEqual(['0', '1', '2'])
  })

  it('similar triangles have whole-number answers', () => {
    const g = generators.find((x) => x.id === 'similar-triangles')!
    for (let seed = 1; seed <= 60; seed++) {
      const p = runGenerator(g, seed * 31337)
      if (p.type === 'short') p.answers.forEach((a) => expect(Number.isInteger(Number(a.value)), a.value).toBe(true))
    }
  })

  it('triangle-splitter figures are real triangles (not collapsed)', () => {
    for (const id of ['side-splitter', 'nested-triangles', 'similarity-proof']) {
      const g = generators.find((x) => x.id === id)!
      for (const opts of optionCombos(g)) {
        for (let seed = 1; seed <= 40; seed++) {
          const p = runGenerator(g, seed * 7919, opts)
          const [a, b, c] = p.diagram!.points
          const cross = Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y))
          const maxSide = Math.max(Math.hypot(b.x - a.x, b.y - a.y), Math.hypot(c.x - a.x, c.y - a.y), Math.hypot(c.x - b.x, c.y - b.y))
          expect(cross / maxSide ** 2, `${id} seed=${seed} ${JSON.stringify(opts)}`).toBeGreaterThan(0.15)
        }
      }
    }
  })

  it('is deterministic for a given seed', () => {
    for (const g of generators) {
      expect(JSON.stringify(runGenerator(g, 12345))).toBe(JSON.stringify(runGenerator(g, 12345)))
    }
  })

  it('re-rolls generated questions for later versions', () => {
    const g = generators.find((x) => x.id === 'vertical-angles')!
    const q = newQuestionFromGenerator(g, 99, {}, 'q1')
    expect(questionForVersion(q, 0)).toBe(q)
    const b = questionForVersion(q, 1)
    expect(b.id).toBe('q1')
    expect(JSON.stringify(b)).not.toBe(JSON.stringify(q))
  })
})
