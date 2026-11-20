import { useState } from 'react'
import { DebugTag } from '../components/DebugTag'
import { promptSummary } from '../components/QuestionView'
import { LessonCodes } from '../components/TopicPicker'
import { versionLetter } from '../lib/mathfmt'
import { type Question, QUESTION_TYPE_LABELS, type Test, type TestItem, type TestSection } from '../model/types'
import { href, navigate } from '../router'
import { deleteTest, downloadJSON, exportData, newTest, saveTest, uid, useStore } from '../store/store'
import { BankFiltersBar, emptyFilters, useFilteredQuestions } from './BankPage'

export function TestsPage() {
  const tests = useStore((s) => s.tests)
  const list = Object.values(tests).sort((a, b) => b.updatedAt - a.updatedAt)
  return (
    <div className="page">
      <div className="page-head">
        <h2>Tests & quizzes</h2>
        <div className="actions">
          <button
            type="button"
            className="primary"
            onClick={() => {
              const t = newTest()
              saveTest(t)
              navigate(`/test/${t.id}`)
            }}
          >
            + New test
          </button>
        </div>
      </div>
      {list.length === 0 ? (
        <div className="empty">No tests yet. Create one, then add questions from the bank or generate them.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Questions</th>
              <th>Versions</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id}>
                <td>
                  <a href={href(`/test/${t.id}`)}>{t.title}</a>
                </td>
                <td>{t.sections.reduce((n, s) => n + s.items.length, 0)}</td>
                <td>{t.versions}</td>
                <td>{new Date(t.updatedAt).toLocaleDateString()}</td>
                <td className="nowrap">
                  <a href={href(`/print/${t.id}`)}>Print</a>{' '}
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => {
                      const copy: Test = { ...structuredClone(t), id: uid(), title: `${t.title} (copy)`, createdAt: Date.now() }
                      saveTest(copy)
                    }}
                  >
                    Duplicate
                  </button>{' '}
                  <button type="button" className="linkish danger" onClick={() => confirm(`Delete “${t.title}”? Questions stay in the bank.`) && deleteTest(t.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export function itemPoints(item: TestItem, q: Question | undefined): number {
  return item.points ?? q?.points ?? 0
}

export function TestBuilder({ id }: { id: string }) {
  const test = useStore((s) => s.tests[id])
  const questions = useStore((s) => s.questions)
  const [adding, setAdding] = useState<string | null>(null)
  if (!test) return <div className="page">Test not found. <a href={href('/tests')}>Back to tests</a></div>

  const set = (patch: Partial<Test>) => saveTest({ ...test, ...patch })
  const setSection = (sid: string, patch: Partial<TestSection>) => set({ sections: test.sections.map((s) => (s.id === sid ? { ...s, ...patch } : s)) })
  const setItem = (sid: string, i: number, patch: Partial<TestItem>) =>
    set({ sections: test.sections.map((s) => (s.id === sid ? { ...s, items: s.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) } : s)) })
  const moveItem = (sid: string, i: number, d: number) => {
    const sec = test.sections.find((s) => s.id === sid)!
    const items = sec.items.slice()
    const [x] = items.splice(i, 1)
    items.splice(i + d, 0, x)
    setSection(sid, { items })
  }
  const moveToSection = (from: string, i: number, to: string) => {
    const item = test.sections.find((s) => s.id === from)!.items[i]
    set({
      sections: test.sections.map((s) =>
        s.id === from ? { ...s, items: s.items.filter((_, j) => j !== i) } : s.id === to ? { ...s, items: [...s.items, item] } : s,
      ),
    })
  }

  let n = 0
  const totalPoints = test.sections.reduce((sum, s) => sum + s.items.reduce((a, it) => a + itemPoints(it, questions[it.questionId]), 0), 0)
  const totalQ = test.sections.reduce((a, s) => a + s.items.length, 0)
  const generatedCount = test.sections.reduce((a, s) => a + s.items.filter((it) => questions[it.questionId]?.gen).length, 0)

  return (
    <div className="page">
      <div className="page-head">
        <input className="title-input" value={test.title} onChange={(e) => set({ title: e.target.value })} />
        <div className="actions">
          <a className="button primary" href={href(`/print/${test.id}`)}>
            Preview & print
          </a>
          <button type="button" onClick={() => downloadJSON(exportData({ testIds: [test.id] }), `${test.title.replace(/[^\w-]+/g, '_')}.json`)}>
            Export JSON
          </button>
        </div>
      </div>

      <div className="test-settings">
        <label>
          Subtitle <input value={test.subtitle ?? ''} placeholder="e.g. Unit 3 Test · Similarity" onChange={(e) => set({ subtitle: e.target.value || undefined })} />
        </label>
        <label className="block">
          Instructions
          <textarea rows={2} value={test.instructions ?? ''} placeholder="Show all work. Give exact answers unless told to round." onChange={(e) => set({ instructions: e.target.value || undefined })} />
        </label>
        <div className="row wrap">
          <span>Header:</span>
          {(['name', 'date', 'period'] as const).map((k) => (
            <label key={k}>
              <input type="checkbox" checked={test.header[k]} onChange={(e) => set({ header: { ...test.header, [k]: e.target.checked } })} /> {k[0].toUpperCase() + k.slice(1)}
            </label>
          ))}
          <label>
            <input type="checkbox" checked={test.showPoints} onChange={(e) => set({ showPoints: e.target.checked })} /> Show points
          </label>
        </div>
        <div className="row wrap">
          <label>
            Versions{' '}
            <select value={test.versions} onChange={(e) => set({ versions: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6].map((v) => (
                <option key={v} value={v}>
                  {v === 1 ? '1 (Form A only)' : `${v} (Forms A–${versionLetter(v - 1)})`}
                </option>
              ))}
            </select>
          </label>
          {test.versions > 1 && (
            <>
              <label>
                <input type="checkbox" checked={!!test.shuffleQuestions} onChange={(e) => set({ shuffleQuestions: e.target.checked || undefined })} /> Shuffle question order in Forms B+
              </label>
              <button type="button" onClick={() => set({ versionSalt: test.versionSalt + 1 })} title="Generate new numbers for every generated question in Forms B and later">
                ↻ New numbers for Forms B+
              </button>
              <span className="muted">
                {generatedCount} of {totalQ} questions are generated and get new numbers in each form; the rest stay the same.
              </span>
            </>
          )}
        </div>
      </div>

      <div className="muted">
        {totalQ} questions · {totalPoints} points
      </div>

      {test.sections.map((sec) => (
        <div key={sec.id} className="test-section">
          <div className="row section-head">
            <input className="section-title" value={sec.title} placeholder={test.sections.length > 1 ? 'Section title (e.g. Part I: Short answer)' : 'Section title (optional)'} onChange={(e) => setSection(sec.id, { title: e.target.value })} />
            {test.sections.length > 1 && (
              <button type="button" className="danger" onClick={() => confirm('Remove this section and its items from the test?') && set({ sections: test.sections.filter((s) => s.id !== sec.id) })}>
                Remove section
              </button>
            )}
          </div>
          <textarea rows={1} className="section-instr" value={sec.instructions ?? ''} placeholder="Section instructions (optional)" onChange={(e) => setSection(sec.id, { instructions: e.target.value || undefined })} />
          <ol className="test-items">
            {sec.items.map((it, i) => {
              const q = questions[it.questionId]
              n++
              return (
                <li key={`${it.questionId}-${i}`}>
                  <span className="item-num">{n}.</span>
                  {q ? (
                    <>
                      <LessonCodes codes={q.lessons} />
                      <span className="type-tag">{QUESTION_TYPE_LABELS[q.type].split(' ')[0]}</span>
                      {q.gen && <span className="tag" title="New numbers in each version">varies by form</span>}
                      <a className="summary-text" href={href(`/q/${q.id}?return=${encodeURIComponent(`/test/${test.id}`)}`)}>
                        {promptSummary(q, 110) || '(no prompt)'}
                      </a>
                    </>
                  ) : (
                    <span className="muted">(missing question)</span>
                  )}
                  {q && <DebugTag q={q} />}
                  <span className="item-controls">
                    <label title="Points">
                      <input type="number" min={0} step={0.5} value={itemPoints(it, q)} style={{ width: 52 }} onChange={(e) => setItem(sec.id, i, { points: Number(e.target.value) })} /> pts
                    </label>
                    <label title="Start this question on a new page">
                      <input type="checkbox" checked={!!it.pageBreakBefore} onChange={(e) => setItem(sec.id, i, { pageBreakBefore: e.target.checked || undefined })} /> new page
                    </label>
                    <button type="button" disabled={i === 0} onClick={() => moveItem(sec.id, i, -1)}>
                      ↑
                    </button>
                    <button type="button" disabled={i === sec.items.length - 1} onClick={() => moveItem(sec.id, i, 1)}>
                      ↓
                    </button>
                    {test.sections.length > 1 && (
                      <select value="" onChange={(e) => e.target.value && moveToSection(sec.id, i, e.target.value)}>
                        <option value="">Move to…</option>
                        {test.sections
                          .filter((s) => s.id !== sec.id)
                          .map((s, k) => (
                            <option key={s.id} value={s.id}>
                              {s.title || `Section ${k + 1}`}
                            </option>
                          ))}
                      </select>
                    )}
                    <button type="button" onClick={() => setSection(sec.id, { items: sec.items.filter((_, j) => j !== i) })} title="Remove from test (stays in bank)">
                      ✕
                    </button>
                  </span>
                </li>
              )
            })}
          </ol>
          <div className="row wrap add-row">
            <button type="button" onClick={() => setAdding(adding === sec.id ? null : sec.id)}>
              {adding === sec.id ? 'Close bank' : '+ From bank'}
            </button>
            <a className="button" href={href(`/generate?test=${test.id}`)}>
              + Generate
            </a>
            <a className="button" href={href(`/q/new?addToTest=${test.id}&return=${encodeURIComponent(`/test/${test.id}`)}`)}>
              + Write new
            </a>
          </div>
          {adding === sec.id && (
            <BankChooser
              exclude={new Set(test.sections.flatMap((s) => s.items.map((x) => x.questionId)))}
              onAdd={(ids) => setSection(sec.id, { items: [...sec.items, ...ids.map((questionId) => ({ questionId }))] })}
            />
          )}
        </div>
      ))}
      <button type="button" onClick={() => set({ sections: [...test.sections, { id: uid(), title: `Part ${toRoman(test.sections.length + 1)}`, items: [] }] })}>
        + Add section
      </button>
    </div>
  )
}

function toRoman(n: number): string {
  return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][n] ?? String(n)
}

function BankChooser({ exclude, onAdd }: { exclude: Set<string>; onAdd: (ids: string[]) => void }) {
  const [f, setF] = useState(emptyFilters)
  const list = useFilteredQuestions(f).filter((q) => !exclude.has(q.id))
  const [sel, setSel] = useState<string[]>([])
  return (
    <div className="bank-chooser">
      <BankFiltersBar f={f} setF={setF} />
      <ul className="q-list compact">
        {list.map((q) => (
          <li key={q.id}>
            <label className="q-row">
              <input type="checkbox" checked={sel.includes(q.id)} onChange={() => setSel(sel.includes(q.id) ? sel.filter((x) => x !== q.id) : [...sel, q.id])} />
              <LessonCodes codes={q.lessons} />
              <span className="type-tag">{QUESTION_TYPE_LABELS[q.type].split(' ')[0]}</span>
              <span className="summary-text">{promptSummary(q, 120)}</span>
            </label>
          </li>
        ))}
        {list.length === 0 && <li className="muted">No matching questions in the bank.</li>}
      </ul>
      <button
        type="button"
        className="primary"
        disabled={!sel.length}
        onClick={() => {
          onAdd(sel)
          setSel([])
        }}
      >
        Add {sel.length || ''} selected
      </button>
    </div>
  )
}
