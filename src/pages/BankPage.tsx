import { useMemo, useRef, useState } from 'react'
import { DebugTag } from '../components/DebugTag'
import { promptSummary, QuestionView } from '../components/QuestionView'
import { LessonCodes } from '../components/TopicPicker'
import { generatorById } from '../gen'
import { compareCodes, courseMap } from '../lib/courseMap'
import { type Question, QUESTION_TYPE_LABELS, type QuestionType } from '../model/types'
import { href, navigate } from '../router'
import {
  addQuestionsToTest,
  deleteQuestion,
  downloadJSON,
  duplicateQuestion,
  exportData,
  type ExportFile,
  importData,
  newTest,
  saveTest,
  useStore,
} from '../store/store'

export interface BankFilters {
  unit: string
  lesson: string
  type: string
  text: string
  source: string
}

export function useFilteredQuestions(f: BankFilters): Question[] {
  const questions = useStore((s) => s.questions)
  return useMemo(() => {
    const t = f.text.trim().toLowerCase()
    return Object.values(questions)
      .filter((q) => {
        if (f.type && q.type !== f.type) return false
        if (f.lesson && !q.lessons.includes(f.lesson)) return false
        if (f.unit && !q.lessons.some((c) => courseMap.byCode.get(c)?.unit === Number(f.unit))) return false
        if (f.source === 'generated' && !q.gen) return false
        if (f.source === 'written' && q.gen) return false
        if (f.source === 'honors' && !q.honors) return false
        if (t) {
          const hay = `${q.prompt} ${(q.tags ?? []).join(' ')} ${q.lessons.join(' ')} ${q.gen ? (generatorById.get(q.gen.generatorId)?.title ?? '') : ''}`.toLowerCase()
          if (!hay.includes(t)) return false
        }
        return true
      })
      .sort((a, b) => compareCodes(a.lessons[0] ?? 'zz', b.lessons[0] ?? 'zz') || b.updatedAt - a.updatedAt)
  }, [questions, f])
}

export function BankFiltersBar({ f, setF }: { f: BankFilters; setF: (f: BankFilters) => void }) {
  const unitLessons = f.unit ? courseMap.units.find((u) => u.unit === Number(f.unit))?.sections.flatMap((s) => s.lessons) ?? [] : courseMap.lessons
  return (
    <div className="filters">
      <input type="search" placeholder="Search text, tags…" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
      <select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value, lesson: '' })}>
        <option value="">All units</option>
        {courseMap.units.map((u) => (
          <option key={u.unit} value={u.unit}>
            Unit {u.unit}: {u.title}
          </option>
        ))}
      </select>
      <select value={f.lesson} onChange={(e) => setF({ ...f, lesson: e.target.value })}>
        <option value="">All lessons</option>
        {unitLessons.map((l) => (
          <option key={l.code} value={l.code}>
            {l.code} {l.title}
          </option>
        ))}
      </select>
      <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
        <option value="">All types</option>
        {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
          <option key={t} value={t}>
            {QUESTION_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
      <select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>
        <option value="">Written + generated</option>
        <option value="written">Written by hand</option>
        <option value="generated">Generated</option>
        <option value="honors">Honors only</option>
      </select>
    </div>
  )
}

export const emptyFilters: BankFilters = { unit: '', lesson: '', type: '', text: '', source: '' }

export function BankPage() {
  const [f, setF] = useState<BankFilters>(emptyFilters)
  const list = useFilteredQuestions(f)
  const tests = useStore((s) => s.tests)
  const total = useStore((s) => Object.keys(s.questions).length)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const testList = Object.values(tests).sort((a, b) => b.updatedAt - a.updatedAt)

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const addSelectedTo = (testId: string) => {
    if (testId === '__new') {
      const t = newTest()
      saveTest(t)
      testId = t.id
    }
    addQuestionsToTest(testId, [...selected])
    setSelected(new Set())
    navigate(`/test/${testId}`)
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>Question bank</h2>
        <div className="actions">
          <a className="button primary" href={href('/q/new')}>
            + Add question
          </a>
          <a className="button" href={href('/generate')}>
            Generate problems
          </a>
          <button type="button" onClick={() => downloadJSON(exportData(), `question-bank-${new Date().toISOString().slice(0, 10)}.json`)}>
            Export all (JSON)
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                const data = JSON.parse(await file.text()) as ExportFile
                const copies = confirm('Import as copies? (OK = copies with new ids; Cancel = merge, replacing items with the same id)')
                const r = importData(data, copies)
                alert(`Imported ${r.questions} questions and ${r.tests} tests.`)
              } catch (err) {
                alert(`Could not import: ${(err as Error).message}`)
              }
            }}
          />
        </div>
      </div>

      <BankFiltersBar f={f} setF={setF} />

      {selected.size > 0 && (
        <div className="bulk-bar">
          {selected.size} selected
          <select value="" onChange={(e) => e.target.value && addSelectedTo(e.target.value)}>
            <option value="">Add to test…</option>
            <option value="__new">+ New test</option>
            {testList.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => downloadJSON(exportData({ questionIds: [...selected] }), 'questions.json')}>
            Export selected
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => {
              if (confirm(`Delete ${selected.size} questions?`)) {
                selected.forEach((id) => deleteQuestion(id))
                setSelected(new Set())
              }
            }}
          >
            Delete selected
          </button>
          <button type="button" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      {total === 0 ? (
        <div className="empty">
          <p>Your question bank is empty.</p>
          <p>
            <a className="button primary" href={href('/q/new')}>
              Write a question
            </a>{' '}
            or{' '}
            <a className="button" href={href('/generate')}>
              generate problems
            </a>{' '}
            from the course topics.
          </p>
        </div>
      ) : (
        <>
          <div className="muted list-count">
            {list.length} of {total} questions{' '}
            {list.length > 0 && (
              <button type="button" className="linkish" onClick={() => setSelected(new Set(list.map((q) => q.id)))}>
                select all shown
              </button>
            )}
          </div>
          <ul className="q-list">
            {list.map((q) => (
              <li key={q.id} className={selected.has(q.id) ? 'selected' : ''}>
                <div className="q-row">
                  <input type="checkbox" checked={selected.has(q.id)} onChange={() => toggle(q.id)} />
                  <button type="button" className="q-summary" onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
                    <LessonCodes codes={q.lessons} />
                    <span className="type-tag">{QUESTION_TYPE_LABELS[q.type].split(' ')[0]}</span>
                    {q.gen && <span className="tag">generated</span>}
                    {q.honors && <span className="tag honors">honors</span>}
                    <span className="summary-text">{promptSummary(q) || <em>(no prompt)</em>}</span>
                  </button>
                  <DebugTag q={q} />
                  <span className="row-actions">
                    <a href={href(`/q/${q.id}?return=${encodeURIComponent('/bank')}`)}>Edit</a>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => {
                        const id = duplicateQuestion(q.id)
                        if (id) navigate(`/q/${id}?return=${encodeURIComponent('/bank')}`)
                      }}
                    >
                      Duplicate
                    </button>
                  </span>
                </div>
                {expanded === q.id && (
                  <div className="q-expand">
                    <div className="paper">
                      <QuestionView q={q} mode="student" showPoints />
                    </div>
                    <div className="paper">
                      <QuestionView q={q} mode="key" showSolution />
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
