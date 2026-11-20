import { Sparkles } from 'lucide-react'
import { generators, questionTypes } from '../gen'
import { catalog, coverageMode, GROUP_LABELS } from '../lib/catalog'
import { courseMap } from '../lib/courseMap'
import { type Question, QUESTION_TYPE_LABELS, type QuestionType, type Test } from '../model/types'
import { href } from '../router'
import { TYPE_SHORT } from './QuestionRow'

function Bars({ rows, total, unit }: { rows: { key: string; label: string; n: number; pts: number; cls?: string }[]; total: number; unit: 'q' | 'pts' }) {
  const max = Math.max(1, ...rows.map((r) => (unit === 'q' ? r.n : r.pts)))
  return (
    <div className="bars">
      {rows.map((r) => {
        const v = unit === 'q' ? r.n : r.pts
        return (
          <div key={r.key} className="bar-row" title={`${r.n} question${r.n === 1 ? '' : 's'} · ${r.pts} pts · ${total ? Math.round((r.pts / total) * 100) : 0}% of points`}>
            <span className="bar-label">{r.label}</span>
            <span className="bar-track">
              <span className={`bar-fill ${r.cls ?? ''}`} style={{ width: `${(v / max) * 100}%` }} />
            </span>
            <span className="bar-val">
              {r.n} · {r.pts}pt
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** Balance of a test across catalog families, problem types, response formats and units. */
export function TestBalance({ test, questions }: { test: Test; questions: Record<string, Question> }) {
  const items = test.sections.flatMap((s) => s.items).filter((it) => questions[it.questionId])
  const rows = items.map((it) => {
    const q = questions[it.questionId]
    return { q, pts: it.points ?? q.points, types: questionTypes(q) }
  })
  const totalPts = rows.reduce((a, r) => a + r.pts, 0)

  const fam = new Map<string, { n: number; pts: number }>()
  const typ = new Map<string, { n: number; pts: number }>()
  const fmt = new Map<QuestionType, { n: number; pts: number }>()
  const units = new Map<number, { n: number; pts: number }>()
  let untagged = 0
  for (const r of rows) {
    if (!r.types.length) untagged++
    const groups = new Set(r.types.map((t) => t.split('.')[0]))
    for (const g of groups) fam.set(g, { n: (fam.get(g)?.n ?? 0) + 1, pts: (fam.get(g)?.pts ?? 0) + r.pts })
    for (const t of r.types) typ.set(t, { n: (typ.get(t)?.n ?? 0) + 1, pts: (typ.get(t)?.pts ?? 0) + r.pts })
    fmt.set(r.q.type, { n: (fmt.get(r.q.type)?.n ?? 0) + 1, pts: (fmt.get(r.q.type)?.pts ?? 0) + r.pts })
    const us = new Set(r.q.lessons.map((c) => courseMap.byCode.get(c)?.unit).filter(Boolean) as number[])
    for (const u of us) units.set(u, { n: (units.get(u)?.n ?? 0) + 1, pts: (units.get(u)?.pts ?? 0) + r.pts })
  }

  // Types the test's lessons feature in the catalog but the test does not use yet.
  const lessons = [...new Set(rows.flatMap((r) => r.q.lessons))]
  const present = new Set(typ.keys())
  const missing = [...new Set(lessons.flatMap((c) => catalog.byLesson.get(c) ?? []))]
    .filter((id) => !present.has(id))
    .map((id) => catalog.byId.get(id)!)
    .filter((t) => t && coverageMode(t) !== 'classroom')

  if (!rows.length) return <div className="balance-card muted">Add questions to see how the test is balanced across problem types.</div>

  return (
    <div className="balance-card">
      <div className="balance-grid">
        <div>
          <h4>Families</h4>
          <Bars
            unit="pts"
            total={totalPts}
            rows={[...fam.entries()].sort((a, b) => b[1].pts - a[1].pts).map(([g, v]) => ({ key: g, label: `${g} · ${GROUP_LABELS[g] ?? g}`, cls: `g-${g}`, ...v }))}
          />
          {untagged > 0 && <div className="muted small">{untagged} question(s) have no problem type yet.</div>}
        </div>
        <div>
          <h4>Response formats</h4>
          <Bars
            unit="pts"
            total={totalPts}
            rows={[...fmt.entries()].map(([t, v]) => ({ key: t, label: TYPE_SHORT[t], ...v }))}
          />
          <h4 style={{ marginTop: 10 }}>Units</h4>
          <Bars unit="pts" total={totalPts} rows={[...units.entries()].sort((a, b) => a[0] - b[0]).map(([u, v]) => ({ key: String(u), label: `Unit ${u}`, cls: `u${u}`, ...v }))} />
        </div>
        <div>
          <h4>Problem types ({typ.size})</h4>
          <div className="type-tally">
            {[...typ.entries()]
              .sort((a, b) => b[1].n - a[1].n)
              .map(([id, v]) => (
                <a key={id} href={href(`/coverage?type=${id}`)} className="tally-row" title={catalog.byId.get(id)?.task}>
                  <span className={`ptype-chip g-${id.split('.')[0]}`}>{id}</span>
                  <span className="tally-name">{catalog.byId.get(id)?.name}</span>
                  <span className="tally-n">×{v.n}</span>
                </a>
              ))}
          </div>
        </div>
      </div>
      {missing.length > 0 && (
        <div className="balance-missing">
          <h4>Seen in these lessons but not on this test</h4>
          <div className="chips">
            {missing.slice(0, 18).map((t) => {
              const g = generators.find((x) => x.types.includes(t.id))
              return g ? (
                <a key={t.id} className="chip-btn missing-gen" href={href(`/generate?gen=${g.id}&test=${test.id}`)} title={`${t.id}: generate with “${g.title}”`}>
                  <Sparkles size={11} /> {t.name}
                </a>
              ) : (
                <a key={t.id} className="chip-btn" href={href(`/q/new?ptype=${t.id}&addToTest=${test.id}&return=${encodeURIComponent(`/test/${test.id}`)}`)} title={`${t.id}: write one by hand`}>
                  {t.name}
                </a>
              )
            })}
          </div>
        </div>
      )}
      <div className="muted small balance-note">
        Catalog scoring: {catalog.scoring.free_response} {QUESTION_TYPE_LABELS.mc}: {catalog.scoring.mc}
      </div>
    </div>
  )
}
