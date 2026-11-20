import { describe, expect, it } from 'vitest'
import { generators, runGenerator } from '../gen'
import { catalog, coverageMode } from './catalog'
import { courseMap } from './courseMap'

describe('problem-type catalog', () => {
  it('parses all types and lesson index entries', () => {
    expect(catalog.types.length).toBe(85)
    for (const [code, ids] of catalog.byLesson) {
      expect(courseMap.byCode.has(code), code).toBe(true)
      for (const id of ids) expect(catalog.byId.has(id), id).toBe(true)
    }
  })

  it('every generator is tagged with valid catalog types (including per-problem overrides)', () => {
    for (const g of generators) {
      expect(g.types.length, g.id).toBeGreaterThan(0)
      for (const t of g.types) expect(catalog.byId.has(t), `${g.id}: ${t}`).toBe(true)
      for (let seed = 1; seed <= 10; seed++) {
        const p = runGenerator(g, seed * 977)
        for (const t of p.types ?? []) {
          expect(catalog.byId.has(t), `${g.id} override: ${t}`).toBe(true)
          // Per-problem tags must be among the generator's declared types (used by the Coverage page).
          expect(g.types, `${g.id} declares ${t}`).toContain(t)
        }
      }
    }
  })

  it('every generatable type has at least one generator', () => {
    const covered = new Set(generators.flatMap((g) => g.types))
    const gaps = catalog.types.filter((t) => coverageMode(t) === 'generate' && !covered.has(t.id)).map((t) => t.id)
    expect(gaps).toEqual([])
  })
})
