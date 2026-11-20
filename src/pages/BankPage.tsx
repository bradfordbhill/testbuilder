import { Copy, Download, FilePlus2, ListPlus, Pencil, Trash2, Upload, Wand2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { QuestionRow } from '../components/QuestionRow'
import { QuestionView } from '../components/QuestionView'
import { generatorById } from '../gen'
import { compareCodes, courseMap } from '../lib/courseMap'
import { type Question, QUESTION_TYPE_LABELS, type QuestionType } from '../model/types'
import { href, navigate } from '../router'
import {
  addQuestionsToTest,
  deleteQuestionsUndoable,
  downloadJSON,
  duplicateQuestion,
  exportData,
  type ExportFile,
  getState,
  importData,
  newTest,
  saveTest,
  useStore,
} from '../store/store'
import { ask } from '../ui/dialog'
import { useShortcuts } from '../ui/shortcuts'
import { toast } from '../ui/toast'

export interface BankFilters {
  unit: string
  lesson: string
  type: string
  text: string
  source: string
}

export const emptyFilters: BankFilters = { unit: '', lesson: '', type: '', text: '', source: '' }

export function filterQuestions(questions: Record<string, Question>, f: BankFilters): Question[] {
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
        if (!t.split(/\s+/).every((w) => hay.includes(w))) return false
      }
      return true
    })
    .sort((a, b) => compareCodes(a.lessons[0] ?? 'zz', b.lessons[0] ?? 'zz') || b.updatedAt - a.updatedAt)
}

export function useFilteredQuestions(f: BankFilters): Question[] {
  const questions = useStore((s) => s.questions)
  return useMemo(() => filterQuestions(questions, f), [questions, f])
}

/** Search box + unit chips + type/source selectors. `compact` for side panels. */
export function QuestionFilters({ f, setF, compact, autoFocusSearch }: { f: BankFilters; setF: (f: BankFilters) => void; compact?: boolean; autoFocusSearch?: boolean }) {
  const questions = useStore((s) => s.questions)
  const unitCounts = useMemo(() => {
    const m = new Map<number, number>()
    for (const q of Object.values(questions)) {
      const units = new Set(q.lessons.map((c) => courseMap.byCode.get(c)?.unit).filter(Boolean) as number[])
      units.forEach((u) => m.set(u, (m.get(u) ?? 0) + 1))
    }
    return m
  }, [questions])
  const unitLessons = f.unit ? (courseMap.units.find((u) => u.unit === Number(f.unit))?.sections.flatMap((s) => s.lessons) ?? []) : []
  return (
    <div className={`qfilters ${compact ? 'compact' : ''}`}>
      <input
        type="search"
        className="search"
        data-page-search={compact ? undefined : true}
        autoFocus={autoFocusSearch}
        placeholder={compact ? 'Search the bank…' : 'Search text, tags, lessons…   ( / )'}
        value={f.text}
        onChange={(e) => setF({ ...f, text: e.target.value })}
      />
      <div className="chips">
        <button type="button" className={`chip-btn ${!f.unit ? 'on' : ''}`} onClick={() => setF({ ...f, unit: '', lesson: '' })}>
          All
        </button>
        {courseMap.units.map((u) => (
          <button
            key={u.unit}
            type="button"
            className={`chip-btn u${u.unit} ${f.unit === String(u.unit) ? 'on' : ''}`}
            title={`Unit ${u.unit}: ${u.title}`}
            onClick={() => setF({ ...f, unit: f.unit === String(u.unit) ? '' : String(u.unit), lesson: '' })}
          >
            U{u.unit}
            {unitCounts.get(u.unit) ? <span className="chip-count">{unitCounts.get(u.unit)}</span> : null}
          </button>
        ))}
      </div>
      <div className="row">
        {f.unit && (
          <select value={f.lesson} onChange={(e) => setF({ ...f, lesson: e.target.value })}>
            <option value="">All lessons</option>
            {unitLessons.map((l) => (
              <option key={l.code} value={l.code}>
                {l.code} {l.title}
              </option>
            ))}
          </select>
        )}
        <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
          <option value="">All types</option>
          {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
            <option key={t} value={t}>
              {QUESTION_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>
          <option value="">Any source</option>
          <option value="written">Written</option>
          <option value="generated">Generated</option>
          <option value="honors">Honors</option>
        </select>
      </div>
    </div>
  )
}

export function BankPage() {
  const [f, setF] = useState<BankFilters>(emptyFilters)
  const list = useFilteredQuestions(f)
  const tests = useStore((s) => s.tests)
  const total = useStore((s) => Object.keys(s.questions).length)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const anchor = useRef<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const testList = Object.values(tests).sort((a, b) => b.updatedAt - a.updatedAt)

  useEffect(() => setActive((a) => Math.min(a, Math.max(list.length - 1, 0))), [list.length])
  useEffect(() => {
    listRef.current?.querySelector('.qrow.active')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const toggle = (id: string, index: number, shift: boolean) => {
    const next = new Set(selected)
    if (shift && anchor.current !== null) {
      const [a, b] = [Math.min(anchor.current, index), Math.max(anchor.current, index)]
      const on = !selected.has(id)
      for (let i = a; i <= b; i++) on ? next.add(list[i].id) : next.delete(list[i].id)
    } else if (next.has(id)) next.delete(id)
    else next.add(id)
    anchor.current = index
    setSelected(next)
  }

  const cur = list[active]
  useShortcuts({
    arrowdown: () => setActive((a) => Math.min(a + 1, list.length - 1)),
    arrowup: () => setActive((a) => Math.max(a - 1, 0)),
    j: () => setActive((a) => Math.min(a + 1, list.length - 1)),
    k: () => setActive((a) => Math.max(a - 1, 0)),
    enter: () => (cur ? navigate(`/q/${cur.id}?return=${encodeURIComponent('/bank')}`) : false),
    ' ': () => (cur ? setExpanded(expanded === cur.id ? null : cur.id) : false),
    x: () => (cur ? toggle(cur.id, active, false) : false),
    delete: () => (cur ? deleteQuestionsUndoable([cur.id]) : false),
    escape: () => (selected.size ? setSelected(new Set()) : false),
  })

  const addTo = (testId: string, ids: string[]) => {
    if (testId === '__new') {
      const t = newTest()
      saveTest(t)
      testId = t.id
    }
    addQuestionsToTest(testId, ids)
    const title = getState().tests[testId]?.title ?? 'test'
    toast(`Added ${ids.length} question${ids.length > 1 ? 's' : ''} to “${title}”`, {
      kind: 'success',
      action: { label: 'Open test', run: () => navigate(`/test/${testId}`) },
    })
  }

  const doImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as ExportFile
      const choice = await ask(
        `Import ${data.questions?.length ?? 0} questions and ${data.tests?.length ?? 0} tests?`,
        'Import as copies to keep everything you already have, or merge to replace items with the same id (for example, restoring your own backup).',
        [
          { label: 'Cancel', value: 'cancel' },
          { label: 'Merge', value: 'merge' },
          { label: 'Import as copies', value: 'copies', kind: 'primary' },
        ],
      )
      if (choice !== 'copies' && choice !== 'merge') return
      const r = importData(data, choice === 'copies')
      toast(`Imported ${r.questions} questions and ${r.tests} tests.`, { kind: 'success' })
    } catch (err) {
      toast(`Could not import: ${(err as Error).message}`, { kind: 'error' })
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>
          Question bank <span className="count">{total}</span>
        </h2>
        <div className="actions">
          <button type="button" className="ghost" onClick={() => fileRef.current?.click()} title="Import a JSON export">
            <Upload size={14} /> Import
          </button>
          <button type="button" className="ghost" onClick={() => downloadJSON(exportData(), `question-bank-${new Date().toISOString().slice(0, 10)}.json`)} title="Download everything as JSON">
            <Download size={14} /> Export
          </button>
          <a className="button" href={href('/generate')}>
            <Wand2 size={14} /> Generate
          </a>
          <a className="button primary" href={href('/q/new?return=%2Fbank')} title="New question (N)">
            <FilePlus2 size={14} /> New question
          </a>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void doImport(file)
            }}
          />
        </div>
      </div>

      <QuestionFilters f={f} setF={setF} />

      {total === 0 ? (
        <div className="empty">
          <h3>Your question bank is empty</h3>
          <p className="muted">Write your own questions or generate randomized ones from the course topics.</p>
          <div className="row center">
            <a className="button primary" href={href('/q/new')}>
              <FilePlus2 size={14} /> Write a question
            </a>
            <a className="button" href={href('/generate')}>
              <Wand2 size={14} /> Generate problems
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className="list-meta">
            <span>
              {list.length === total ? `${total} questions` : `${list.length} of ${total} questions`}
            </span>
            {list.length > 0 && (
              <button type="button" className="linkish" onClick={() => setSelected(new Set(list.map((q) => q.id)))}>
                Select all shown
              </button>
            )}
            <span className="muted hint">↑↓ move · Enter edit · Space preview · X select</span>
          </div>
          <div className="qlist" ref={listRef}>
            {list.length === 0 && <div className="empty small">No questions match these filters.</div>}
            {list.map((q, i) => (
              <div key={q.id} className="qlist-item">
                <QuestionRow
                  q={q}
                  className={`${selected.has(q.id) ? 'selected' : ''} ${i === active ? 'active' : ''} ${expanded === q.id ? 'open' : ''}`}
                  onClick={(e) => {
                    setActive(i)
                    if (e.shiftKey || e.metaKey || e.ctrlKey) toggle(q.id, i, e.shiftKey)
                    else setExpanded(expanded === q.id ? null : q.id)
                  }}
                  lead={
                    <input
                      type="checkbox"
                      className={`row-check ${selected.size ? 'visible' : ''}`}
                      checked={selected.has(q.id)}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggle(q.id, i, e.shiftKey)
                      }}
                      onChange={() => {}}
                      aria-label="Select"
                    />
                  }
                  actions={
                    <>
                      <a className="icon-btn" href={href(`/q/${q.id}?return=${encodeURIComponent('/bank')}`)} title="Edit (Enter)">
                        <Pencil size={14} />
                      </a>
                      <button
                        type="button"
                        className="icon-btn"
                        title="Duplicate"
                        onClick={() => {
                          const id = duplicateQuestion(q.id)
                          if (id) toast('Duplicated', { kind: 'success', action: { label: 'Edit copy', run: () => navigate(`/q/${id}?return=%2Fbank`) } })
                        }}
                      >
                        <Copy size={14} />
                      </button>
                      <AddToTestMenu tests={testList} onPick={(tid) => addTo(tid, [q.id])} />
                      <button type="button" className="icon-btn danger" title="Delete (Del)" onClick={() => deleteQuestionsUndoable([q.id])}>
                        <Trash2 size={14} />
                      </button>
                    </>
                  }
                />
                {expanded === q.id && (
                  <div className="q-expand">
                    <div className="paper">
                      <div className="paper-label">Student</div>
                      <QuestionView q={q} mode="student" showPoints />
                    </div>
                    <div className="paper">
                      <div className="paper-label key">Key</div>
                      <QuestionView q={q} mode="key" showSolution />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {selected.size > 0 && (
        <div className="bulk-bar">
          <strong>{selected.size} selected</strong>
          <AddToTestMenu tests={testList} onPick={(tid) => {
            addTo(tid, [...selected])
            setSelected(new Set())
          }} label="Add to test" />
          <button type="button" className="ghost" onClick={() => downloadJSON(exportData({ questionIds: [...selected] }), 'questions.json')}>
            <Download size={14} /> Export
          </button>
          <button
            type="button"
            className="ghost danger"
            onClick={() => {
              deleteQuestionsUndoable([...selected])
              setSelected(new Set())
            }}
          >
            <Trash2 size={14} /> Delete
          </button>
          <button type="button" className="icon-btn" title="Clear selection (Esc)" onClick={() => setSelected(new Set())}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

/** Small dropdown: choose a test (or a new one). */
export function AddToTestMenu({ tests, onPick, label }: { tests: { id: string; title: string }[]; onPick: (id: string) => void; label?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [open])
  return (
    <span className="menu-wrap" ref={ref}>
      <button type="button" className={label ? 'ghost' : 'icon-btn'} title="Add to test" onClick={() => setOpen(!open)}>
        <ListPlus size={14} />
        {label}
      </button>
      {open && (
        <div className="menu">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onPick('__new')
            }}
          >
            <FilePlus2 size={13} /> New test
          </button>
          {tests.length > 0 && <div className="menu-sep" />}
          {tests.slice(0, 12).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setOpen(false)
                onPick(t.id)
              }}
            >
              {t.title}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}
