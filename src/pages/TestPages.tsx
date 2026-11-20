import {
  closestCenter,
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FilePlus2,
  FileStack,
  GripVertical,
  Library,
  Pencil,
  Plus,
  Printer,
  Quote,
  RefreshCw,
  Scissors,
  Settings2,
  Trash2,
  Wand2,
  X,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { DebugTag } from '../components/DebugTag'
import { TestBalance } from '../components/TestBalance'
import { LessonChips, QuestionRow, TypeBadge } from '../components/QuestionRow'
import { promptSummary, QuestionView } from '../components/QuestionView'
import { firstLesson, generators, newQuestionFromGenerator } from '../gen'
import type { Generator } from '../gen/types'
import { compareCodes, courseMap } from '../lib/courseMap'
import { versionLetter } from '../lib/mathfmt'
import { randomSeed } from '../lib/rng'
import type { Question, SharedStem, Test, TestItem, TestSection } from '../model/types'
import { href, navigate } from '../router'
import {
  deleteTestUndoable,
  downloadJSON,
  exportData,
  getState,
  itemKey,
  newTest,
  saveQuestions,
  saveTest,
  uid,
  undoable,
  useStore,
  withKeys,
} from '../store/store'
import { toast } from '../ui/toast'
import { emptyFilters, QuestionFilters, useFilteredQuestions } from './BankPage'

// ================================================================ tests list

export function TestsPage() {
  const tests = useStore((s) => s.tests)
  const questions = useStore((s) => s.questions)
  const list = Object.values(tests).sort((a, b) => b.updatedAt - a.updatedAt)
  const create = () => {
    const t = newTest()
    saveTest(t)
    navigate(`/test/${t.id}`)
  }
  return (
    <div className="page">
      <div className="page-head">
        <h2>
          Tests & quizzes <span className="count">{list.length}</span>
        </h2>
        <div className="actions">
          <button type="button" className="primary" onClick={create}>
            <FilePlus2 size={14} /> New test
          </button>
        </div>
      </div>
      {list.length === 0 ? (
        <div className="empty">
          <h3>No tests yet</h3>
          <p className="muted">Create a test, then drag questions in from the bank or straight from a generator.</p>
          <button type="button" className="primary" onClick={create}>
            <FilePlus2 size={14} /> New test
          </button>
        </div>
      ) : (
        <div className="tlist">
          {list.map((t) => {
            const items = t.sections.flatMap((s) => s.items)
            const pts = items.reduce((a, it) => a + itemPoints(it, questions[it.questionId]), 0)
            const units = [...new Set(items.flatMap((it) => questions[it.questionId]?.lessons ?? []).map((c) => courseMap.byCode.get(c)?.unit).filter(Boolean))].sort()
            return (
              <div key={t.id} className="trow" onClick={() => navigate(`/test/${t.id}`)}>
                <FileStack size={15} className="muted" />
                <span className="trow-title">{t.title}</span>
                {t.subtitle && <span className="muted">{t.subtitle}</span>}
                <span className="trow-meta">
                  {units.map((u) => (
                    <span key={u} className={`code-chip u${u}`}>
                      U{u}
                    </span>
                  ))}
                  <span>{items.length} q</span>
                  <span>{pts} pts</span>
                  <span>{t.versions > 1 ? `Forms A–${versionLetter(t.versions - 1)}` : 'Form A'}</span>
                  <span className="muted">{new Date(t.updatedAt).toLocaleDateString()}</span>
                </span>
                <span className="qrow-actions" onClick={(e) => e.stopPropagation()}>
                  <a className="icon-btn" href={href(`/print/${t.id}`)} title="Preview & print">
                    <Printer size={14} />
                  </a>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Duplicate"
                    onClick={() => {
                      const copy: Test = { ...structuredClone(t), id: uid(), title: `${t.title} (copy)`, createdAt: Date.now() }
                      saveTest(copy)
                      toast('Test duplicated', { kind: 'success', action: { label: 'Open', run: () => navigate(`/test/${copy.id}`) } })
                    }}
                  >
                    <Copy size={14} />
                  </button>
                  <button type="button" className="icon-btn danger" title="Delete (questions stay in the bank)" onClick={() => deleteTestUndoable(t.id)}>
                    <Trash2 size={14} />
                  </button>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function itemPoints(item: TestItem, q: Question | undefined): number {
  return item.points ?? q?.points ?? 0
}

// ================================================================ builder

type DragData =
  | { type: 'item'; key: string }
  | { type: 'bank'; qid: string }
  | { type: 'gen'; q: Question }

const NEW_KEY = '__new__'
const secId = (id: string) => `sec:${id}`

/** Prefer item targets under the pointer, then section containers, then nearest. */
const collision: CollisionDetection = (args) => {
  const within = pointerWithin(args)
  const items = within.filter((c) => !String(c.id).startsWith('sec:'))
  if (items.length) return items
  if (within.length) return within
  return closestCenter(args)
}

export function TestBuilder({ id }: { id: string }) {
  const test = useStore((s) => s.tests[id])
  const questions = useStore((s) => s.questions)
  const [panel, setPanel] = useState<'bank' | 'generate'>('bank')
  const [showSettings, setShowSettings] = useState(false)
  const [showBalance, setShowBalance] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [layout, setLayout] = useState<Record<string, string[]> | null>(null)
  const [dragging, setDragging] = useState<DragData | null>(null)

  // Make sure every item has a stable key for drag-and-drop.
  useEffect(() => {
    if (test && test.sections.some((s) => s.items.some((i) => !i.key))) {
      saveTest({ ...test, sections: test.sections.map((s) => ({ ...s, items: withKeys(s.items) })) })
    }
  }, [test])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const itemsByKey = useMemo(() => {
    const m = new Map<string, TestItem>()
    test?.sections.forEach((s) => s.items.forEach((i) => i.key && m.set(i.key, i)))
    return m
  }, [test])

  if (!test) return <div className="page">Test not found. <a href={href('/tests')}>Back to tests</a></div>

  const inTest = new Set(test.sections.flatMap((s) => s.items.map((i) => i.questionId)))
  const baseLayout = (): Record<string, string[]> => Object.fromEntries(test.sections.map((s) => [s.id, s.items.map((i) => i.key ?? '')]))
  const current = layout ?? baseLayout()
  const findSection = (key: string, l = current) => Object.keys(l).find((sid) => l[sid].includes(key))

  const set = (patch: Partial<Test>) => saveTest({ ...test, ...patch })
  const setSection = (sid: string, patch: Partial<TestSection>) => set({ sections: test.sections.map((s) => (s.id === sid ? { ...s, ...patch } : s)) })
  const setItem = (key: string, patch: Partial<TestItem>) =>
    set({ sections: test.sections.map((s) => ({ ...s, items: s.items.map((it) => (it.key === key ? { ...it, ...patch } : it)) })) })

  const removeItem = (key: string) =>
    undoable('Removed from test', { tests: [test.id] }, () =>
      set({ sections: test.sections.map((s) => ({ ...s, items: s.items.filter((it) => it.key !== key) })) }),
    )

  const append = (qids: string[], sectionId?: string) => {
    const sid = sectionId ?? test.sections[test.sections.length - 1].id
    set({ sections: test.sections.map((s) => (s.id === sid ? { ...s, items: [...s.items, ...qids.map((questionId) => ({ key: itemKey(), questionId }))] } : s)) })
  }

  // ------------------------------------------------ drag handlers
  const onDragStart = (e: DragStartEvent) => {
    setDragging(e.active.data.current as DragData)
    setLayout(baseLayout())
  }

  const activeKey = (d: DragData | null) => (d?.type === 'item' ? d.key : NEW_KEY)

  const onDragOver = (e: DragOverEvent) => {
    const { over } = e
    const data = e.active.data.current as DragData
    if (!over || !layout) return
    if (data.type === 'bank' && inTest.has(data.qid)) return
    const key = activeKey(data)
    const overId = String(over.id)
    const toSec = overId.startsWith('sec:') ? overId.slice(4) : findSection(overId, layout)
    if (!toSec) return
    const fromSec = findSection(key, layout)
    if (fromSec === toSec) return
    const next = { ...layout }
    if (fromSec) next[fromSec] = next[fromSec].filter((k) => k !== key)
    const target = [...next[toSec]]
    const idx = overId.startsWith('sec:') ? target.length : Math.max(0, target.indexOf(overId))
    target.splice(idx, 0, key)
    next[toSec] = target
    setLayout(next)
  }

  const onDragEnd = (e: DragEndEvent) => {
    const data = e.active.data.current as DragData
    const l = layout
    setDragging(null)
    setLayout(null)
    if (!l || !e.over) return
    if (data.type === 'bank' && inTest.has(data.qid)) {
      toast('That question is already in this test.', { kind: 'info' })
      return
    }
    const key = activeKey(data)
    const sec = findSection(key, l)
    if (!sec) return
    // Same-section reorder.
    const overId = String(e.over.id)
    let keys = l[sec]
    if (!overId.startsWith('sec:') && keys.includes(overId) && overId !== key) {
      keys = arrayMove(keys, keys.indexOf(key), keys.indexOf(overId))
    }
    const final = { ...l, [sec]: keys }
    let newItem: TestItem | null = null
    if (data.type === 'bank') newItem = { key: itemKey(), questionId: data.qid }
    if (data.type === 'gen') {
      const q = { ...data.q, id: uid(), createdAt: Date.now(), updatedAt: Date.now() }
      saveQuestions([q])
      newItem = { key: itemKey(), questionId: q.id }
    }
    const before = JSON.stringify(baseLayout())
    if (!newItem && JSON.stringify(final) === before) return
    set({
      sections: test.sections.map((s) => ({
        ...s,
        items: (final[s.id] ?? []).map((k) => (k === NEW_KEY ? newItem! : itemsByKey.get(k)!)).filter(Boolean),
      })),
    })
    if (newItem) toast(data.type === 'gen' ? 'Generated question added (and saved to the bank)' : 'Added to test', { kind: 'success' })
  }

  // ------------------------------------------------ shared stems
  /** For an item: whether it starts a stem, and whether it is covered by one above it. */
  const stemInfo = (sid: string, key: string) => {
    const sec = test.sections.find((s) => s.id === sid)
    if (!sec) return { covered: false }
    const idx = sec.items.findIndex((i) => i.key === key)
    for (let j = idx - 1; j >= 0; j--) {
      const st = sec.items[j].stem
      if (st && idx - j < st.count) return { covered: true }
    }
    return { covered: false }
  }

  // ------------------------------------------------ render
  let n = 0
  const totalPoints = test.sections.reduce((sum, s) => sum + s.items.reduce((a, it) => a + itemPoints(it, questions[it.questionId]), 0), 0)
  const totalQ = test.sections.reduce((a, s) => a + s.items.length, 0)
  const generatedCount = test.sections.reduce((a, s) => a + s.items.filter((it) => questions[it.questionId]?.gen).length, 0)
  const dragQ = dragging?.type === 'bank' ? questions[dragging.qid] : dragging?.type === 'gen' ? dragging.q : dragging?.type === 'item' ? questions[itemsByKey.get(dragging.key)?.questionId ?? ''] : undefined

  return (
    <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => (setDragging(null), setLayout(null))}>
      <div className="builder">
        <aside className="builder-panel">
          <div className="seg-tabs">
            <button type="button" className={panel === 'bank' ? 'on' : ''} onClick={() => setPanel('bank')}>
              <Library size={14} /> Bank
            </button>
            <button type="button" className={panel === 'generate' ? 'on' : ''} onClick={() => setPanel('generate')}>
              <Wand2 size={14} /> Generate
            </button>
          </div>
          <div className="panel-hint">Drag into the test, or click + to add at the end.</div>
          {panel === 'bank' ? <BankPanel inTest={inTest} onAdd={(qid) => append([qid])} /> : <GeneratePanel onAdd={(q) => {
            const saved = { ...q, id: uid(), createdAt: Date.now(), updatedAt: Date.now() }
            saveQuestions([saved])
            append([saved.id])
            toast('Generated question added', { kind: 'success' })
          }} />}
        </aside>

        <section className="builder-main">
          <div className="builder-head">
            <input className="title-input" value={test.title} onChange={(e) => set({ title: e.target.value })} aria-label="Test title" />
            <div className="builder-stats">
              <span>{totalQ} questions</span>
              <span>{totalPoints} pts</span>
              <span>{test.versions > 1 ? `Forms A–${versionLetter(test.versions - 1)}` : 'Form A'}</span>
            </div>
            <div className="actions">
              <button type="button" className={`ghost ${showBalance ? 'on' : ''}`} onClick={() => setShowBalance(!showBalance)} title="Balance across problem types, formats and units">
                <BarChart3 size={14} /> Balance
              </button>
              <button type="button" className={`ghost ${showSettings ? 'on' : ''}`} onClick={() => setShowSettings(!showSettings)}>
                <Settings2 size={14} /> Settings
              </button>
              <button type="button" className="ghost" title="Export this test as JSON" onClick={() => downloadJSON(exportData({ testIds: [test.id] }), `${test.title.replace(/[^\w-]+/g, '_')}.json`)}>
                <Download size={14} />
              </button>
              <a className="button primary" href={href(`/print/${test.id}`)}>
                <Printer size={14} /> Preview & print
              </a>
            </div>
          </div>

          {showBalance && <TestBalance test={test} questions={questions} />}
          {showSettings && <TestSettings test={test} set={set} generatedCount={generatedCount} totalQ={totalQ} />}

          {test.sections.map((sec, si) => (
            <SectionBlock
              key={sec.id}
              sec={sec}
              keys={current[sec.id] ?? []}
              multiple={test.sections.length > 1}
              onChange={(patch) => setSection(sec.id, patch)}
              onRemove={() =>
                undoable('Section removed', { tests: [test.id] }, () => set({ sections: test.sections.filter((s) => s.id !== sec.id) }))
              }
              empty={(current[sec.id] ?? []).length === 0}
              index={si}
            >
              {(current[sec.id] ?? []).map((key) => {
                if (key === NEW_KEY) return <DropPlaceholder key={key} id={key} q={dragQ} />
                const it = itemsByKey.get(key)
                if (!it) return null
                const q = questions[it.questionId]
                n++
                return (
                  <SortableItem
                    stemInfo={stemInfo(sec.id, key)}
                    onStem={(stem) => setItem(key, { stem })}
                    key={key}
                    id={key}
                    num={n}
                    item={it}
                    q={q}
                    open={open === key}
                    onToggle={() => setOpen(open === key ? null : key)}
                    onPoints={(v) => setItem(key, { points: v })}
                    onBreak={() => setItem(key, { pageBreakBefore: !it.pageBreakBefore || undefined })}
                    onRemove={() => removeItem(key)}
                    testId={test.id}
                  />
                )
              })}
            </SectionBlock>
          ))}
          <button type="button" className="ghost add-section" onClick={() => set({ sections: [...test.sections, { id: uid(), title: `Part ${toRoman(test.sections.length + 1)}`, items: [] }] })}>
            <Plus size={14} /> Add section
          </button>
          <div className="builder-foot muted">
            <a href={href(`/q/new?addToTest=${test.id}&return=${encodeURIComponent(`/test/${test.id}`)}`)}>
              <FilePlus2 size={13} /> Write a new question for this test
            </a>
          </div>
        </section>
      </div>
      <DragOverlay dropAnimation={{ duration: 160, easing: 'ease-out' }}>{dragQ ? <DragCard q={dragQ} /> : null}</DragOverlay>
    </DndContext>
  )
}

function toRoman(n: number): string {
  return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][n] ?? String(n)
}

function TestSettings({ test, set, generatedCount, totalQ }: { test: Test; set: (p: Partial<Test>) => void; generatedCount: number; totalQ: number }) {
  return (
    <div className="settings-card">
      <div className="settings-grid">
        <label>
          <span>Subtitle</span>
          <input value={test.subtitle ?? ''} placeholder="e.g. Unit 3 Test · Similarity" onChange={(e) => set({ subtitle: e.target.value || undefined })} />
        </label>
        <label>
          <span>Forms</span>
          <select value={test.versions} onChange={(e) => set({ versions: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6].map((v) => (
              <option key={v} value={v}>
                {v === 1 ? 'Form A only' : `Forms A–${versionLetter(v - 1)}`}
              </option>
            ))}
          </select>
        </label>
        <label className="span2">
          <span>Instructions</span>
          <textarea rows={2} value={test.instructions ?? ''} placeholder="Show all work. Give exact answers unless told to round." onChange={(e) => set({ instructions: e.target.value || undefined })} />
        </label>
      </div>
      <div className="row wrap toggles">
        {(['name', 'date', 'period'] as const).map((k) => (
          <label key={k} className="toggle">
            <input type="checkbox" checked={test.header[k]} onChange={(e) => set({ header: { ...test.header, [k]: e.target.checked } })} /> {k[0].toUpperCase() + k.slice(1)} line
          </label>
        ))}
        <label className="toggle">
          <input type="checkbox" checked={test.showPoints} onChange={(e) => set({ showPoints: e.target.checked })} /> Show points
        </label>
        {test.versions > 1 && (
          <>
            <label className="toggle">
              <input type="checkbox" checked={!!test.shuffleQuestions} onChange={(e) => set({ shuffleQuestions: e.target.checked || undefined })} /> Shuffle order in Forms B+
            </label>
            <button
              type="button"
              className="ghost"
              title="New numbers for every generated question in Forms B and later"
              onClick={() => {
                set({ versionSalt: test.versionSalt + 1 })
                toast('New numbers for Forms B+', { kind: 'success' })
              }}
            >
              <RefreshCw size={13} /> Re-roll Forms B+
            </button>
          </>
        )}
      </div>
      {test.versions > 1 && (
        <div className="muted small">
          {generatedCount} of {totalQ} questions are generated and get new numbers in each form; the rest are identical across forms.
        </div>
      )}
    </div>
  )
}

function SectionBlock({
  sec,
  keys,
  multiple,
  onChange,
  onRemove,
  empty,
  index,
  children,
}: {
  sec: TestSection
  keys: string[]
  multiple: boolean
  onChange: (p: Partial<TestSection>) => void
  onRemove: () => void
  empty: boolean
  index: number
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: secId(sec.id) })
  const [instr, setInstr] = useState(!!sec.instructions)
  return (
    <div className={`section-block ${isOver ? 'over' : ''}`}>
      <div className="section-head">
        <input
          className="section-title"
          value={sec.title}
          placeholder={multiple ? `Section ${index + 1} title (e.g. Part I: Short answer)` : 'Section title (optional)'}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        {!instr && (
          <button type="button" className="ghost small" onClick={() => setInstr(true)}>
            + Instructions
          </button>
        )}
        {multiple && (
          <button type="button" className="icon-btn danger" title="Remove section" onClick={onRemove}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {instr && (
        <textarea rows={1} className="section-instr" value={sec.instructions ?? ''} placeholder="Section instructions" autoFocus={!sec.instructions} onChange={(e) => onChange({ instructions: e.target.value || undefined })} />
      )}
      <SortableContext items={keys} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={`section-items ${empty ? 'is-empty' : ''}`}>
          {children}
          {empty && <div className="drop-hint">Drop questions here</div>}
        </div>
      </SortableContext>
    </div>
  )
}

function SortableItem({
  id,
  num,
  item,
  q,
  open,
  onToggle,
  onPoints,
  onBreak,
  onRemove,
  testId,
  stemInfo,
  onStem,
}: {
  stemInfo: { covered: boolean }
  onStem: (s: SharedStem | undefined) => void
  id: string
  num: number
  item: TestItem
  q: Question | undefined
  open: boolean
  onToggle: () => void
  onPoints: (v: number) => void
  onBreak: () => void
  onRemove: () => void
  testId: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, data: { type: 'item', key: id } satisfies DragData })
  const [editStem, setEditStem] = useState(false)
  return (
    <div
      ref={setNodeRef}
      className={`titem ${isDragging ? 'dragging' : ''} ${open ? 'open' : ''} ${item.pageBreakBefore ? 'has-break' : ''} ${item.stem || stemInfo.covered ? 'in-stem' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      {item.stem && !editStem && (
        <button type="button" className="stem-preview" onClick={() => setEditStem(true)} title="Edit shared stem">
          <Quote size={12} /> <em>(#{num}–{num + item.stem.count - 1})</em> {item.stem.text || <span className="muted">(no stem text)</span>}
          {item.stem.bank && item.stem.bank.length > 0 && <span className="stem-bank">Bank: {item.stem.bank.join(' · ')}</span>}
        </button>
      )}
      {editStem && <StemEditor stem={item.stem} onChange={onStem} onClose={() => setEditStem(false)} />}
      {item.pageBreakBefore && (
        <div className="break-line">
          <Scissors size={11} /> page break
        </div>
      )}
      {q ? (
        <QuestionRow
          q={q}
          onClick={onToggle}
          lead={
            <>
              <button type="button" className="drag-handle" aria-label="Drag to reorder" {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}>
                <GripVertical size={14} />
              </button>
              <span className="titem-num">{num}.</span>
              {open ? <ChevronDown size={13} className="muted" /> : <ChevronRight size={13} className="muted" />}
            </>
          }
          trail={
            <span className="pts" onClick={(e) => e.stopPropagation()}>
              <input type="number" min={0} step={0.5} value={itemPoints(item, q)} onChange={(e) => onPoints(Number(e.target.value))} aria-label="Points" />
              pt
            </span>
          }
          actions={
            <>
              <button
                type="button"
                className={`icon-btn ${item.stem ? 'on' : ''}`}
                title="Shared stem / answer bank starting here"
                onClick={() => {
                  if (!item.stem) onStem({ text: '', count: 2 })
                  setEditStem(true)
                }}
              >
                <Quote size={14} />
              </button>
              <button type="button" className={`icon-btn ${item.pageBreakBefore ? 'on' : ''}`} title="Start on a new page" onClick={onBreak}>
                <Scissors size={14} />
              </button>
              <a className="icon-btn" href={href(`/q/${q.id}?return=${encodeURIComponent(`/test/${testId}`)}`)} title="Edit question">
                <Pencil size={14} />
              </a>
              <button type="button" className="icon-btn danger" title="Remove from test (stays in bank)" onClick={onRemove}>
                <X size={14} />
              </button>
            </>
          }
        />
      ) : (
        <div className="qrow muted">
          (missing question)
          <span className="qrow-actions">
            <button type="button" className="icon-btn" onClick={onRemove}>
              <X size={14} />
            </button>
          </span>
        </div>
      )}
      {open && q && (
        <div className="titem-preview">
          <div className="paper compact">
            <QuestionView q={q} number={num} points={itemPoints(item, q)} showPoints mode="student" />
          </div>
          <div className="paper compact">
            <QuestionView q={q} number={num} mode="key" showSolution />
          </div>
        </div>
      )}
    </div>
  )
}

function DropPlaceholder({ id, q }: { id: string; q?: Question }) {
  const { setNodeRef, transform, transition } = useSortable({ id })
  return (
    <div ref={setNodeRef} className="drop-placeholder" style={{ transform: CSS.Translate.toString(transform), transition }}>
      {q ? promptSummary(q, 80) : 'Drop here'}
    </div>
  )
}

function DragCard({ q }: { q: Question }) {
  return (
    <div className="drag-card">
      <GripVertical size={14} />
      <LessonChips codes={q.lessons} />
      <TypeBadge type={q.type} />
      <span className="qrow-summary">{promptSummary(q, 70)}</span>
    </div>
  )
}

// ================================================================ side panels

function DraggableBankRow({ q, used, onAdd }: { q: Question; used: boolean; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `bank:${q.id}`, data: { type: 'bank', qid: q.id } satisfies DragData, disabled: used })
  const [peek, setPeek] = useState(false)
  return (
    <div ref={setNodeRef} className={`panel-card ${isDragging ? 'dragging' : ''} ${used ? 'used' : ''}`}>
      <QuestionRow
        q={q}
        summaryLength={90}
        showDebug={false}
        onClick={() => setPeek(!peek)}
        lead={
          <button type="button" className="drag-handle" aria-label="Drag into test" disabled={used} {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}>
            <GripVertical size={14} />
          </button>
        }
        actions={
          used ? (
            <span className="in-test">in test</span>
          ) : (
            <button type="button" className="icon-btn" title="Add to end of test" onClick={onAdd}>
              <Plus size={14} />
            </button>
          )
        }
      />
      {peek && (
        <div className="paper mini">
          <QuestionView q={q} mode="student" />
          <DebugTag q={q} />
        </div>
      )}
    </div>
  )
}

function BankPanel({ inTest, onAdd }: { inTest: Set<string>; onAdd: (qid: string) => void }) {
  const [f, setF] = useState(emptyFilters)
  const list = useFilteredQuestions(f)
  const [hideUsed, setHideUsed] = useState(false)
  const shown = hideUsed ? list.filter((q) => !inTest.has(q.id)) : list
  return (
    <div className="panel-body">
      <QuestionFilters f={f} setF={setF} compact />
      <label className="toggle small">
        <input type="checkbox" checked={hideUsed} onChange={(e) => setHideUsed(e.target.checked)} /> Hide questions already in this test
      </label>
      <div className="panel-list">
        {shown.length === 0 && (
          <div className="empty small">
            {Object.keys(getState().questions).length === 0 ? 'The bank is empty. Try the Generate tab.' : 'No matches.'}
          </div>
        )}
        {shown.slice(0, 200).map((q) => (
          <DraggableBankRow key={q.id} q={q} used={inTest.has(q.id)} onAdd={() => onAdd(q.id)} />
        ))}
      </div>
    </div>
  )
}

function DraggableSample({ q, onAdd, onReroll }: { q: Question; onAdd: () => void; onReroll: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `gen:${q.id}`, data: { type: 'gen', q } satisfies DragData })
  return (
    <div ref={setNodeRef} className={`sample-card ${isDragging ? 'dragging' : ''}`}>
      <div className="sample-bar">
        <button type="button" className="drag-handle" aria-label="Drag into test" {...attributes} {...listeners}>
          <GripVertical size={14} />
        </button>
        <DebugTag q={q} />
        <span className="spacer" />
        <button type="button" className="icon-btn" title="New numbers" onClick={onReroll}>
          <RefreshCw size={13} />
        </button>
        <button type="button" className="icon-btn" title="Add to end of test" onClick={onAdd}>
          <Plus size={14} />
        </button>
      </div>
      <div className="paper mini" {...attributes} {...listeners}>
        <QuestionView q={q} mode="student" />
      </div>
    </div>
  )
}

function GeneratePanel({ onAdd }: { onAdd: (q: Question) => void }) {
  const [search, setSearch] = useState('')
  const [unit, setUnit] = useState('')
  const [g, setG] = useState<Generator | null>(null)
  const [opts, setOpts] = useState<Record<string, string>>({})
  const [seeds, setSeeds] = useState<number[]>(() => [randomSeed(), randomSeed(), randomSeed()])
  const list = useMemo(() => {
    const s = search.trim().toLowerCase()
    return generators
      .filter((x) => !unit || x.lessons.some((c) => courseMap.byCode.get(c)?.unit === Number(unit)))
      .filter((x) => !s || `${x.title} ${x.description} ${x.lessons.join(' ')}`.toLowerCase().includes(s))
      .sort((a, b) => compareCodes(firstLesson(a), firstLesson(b)))
  }, [search, unit])
  const samples = useMemo(() => (g ? seeds.map((seed) => newQuestionFromGenerator(g, seed, opts, `gen-${seed}`)) : []), [g, seeds, opts])

  if (!g) {
    return (
      <div className="panel-body">
        <div className="qfilters compact">
          <input type="search" className="search" placeholder="Search generators…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="chips">
            <button type="button" className={`chip-btn ${!unit ? 'on' : ''}`} onClick={() => setUnit('')}>
              All
            </button>
            {[1, 2, 3, 4].map((u) => (
              <button key={u} type="button" className={`chip-btn u${u} ${unit === String(u) ? 'on' : ''}`} onClick={() => setUnit(unit === String(u) ? '' : String(u))}>
                U{u}
              </button>
            ))}
          </div>
        </div>
        <div className="panel-list">
          {list.map((x) => (
            <button
              key={x.id}
              type="button"
              className="gen-pick"
              onClick={() => {
                setG(x)
                setOpts(Object.fromEntries((x.options ?? []).map((o) => [o.key, o.default])))
                setSeeds([randomSeed(), randomSeed(), randomSeed()])
              }}
            >
              <span className="gen-title">{x.title}</span>
              <span className="gen-meta">
                <LessonChips codes={x.lessons} max={3} />
                {x.honors && <span className="mini-tag honors">H</span>}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="panel-body">
      <div className="gen-head">
        <button type="button" className="ghost small" onClick={() => setG(null)}>
          ← All generators
        </button>
        <strong>{g.title}</strong>
      </div>
      {(g.options ?? []).length > 0 && (
        <div className="gen-opts">
          {(g.options ?? []).map((o) => (
            <label key={o.key}>
              <span>{o.label}</span>
              <select value={opts[o.key]} onChange={(e) => setOpts({ ...opts, [o.key]: e.target.value })}>
                {o.choices.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
      <button type="button" className="ghost small" onClick={() => setSeeds(seeds.map(() => randomSeed()))}>
        <RefreshCw size={13} /> New numbers for all
      </button>
      <div className="panel-list">
        {samples.map((q, i) => (
          <DraggableSample
            key={q.id}
            q={q}
            onAdd={() => {
              onAdd(q)
              setSeeds(seeds.map((s, j) => (j === i ? randomSeed() : s)))
            }}
            onReroll={() => setSeeds(seeds.map((s, j) => (j === i ? randomSeed() : s)))}
          />
        ))}
      </div>
    </div>
  )
}


const BANK_PRESETS: [string, string[]][] = [
  ['Congruence criteria', ['SSS', 'SAS', 'ASA', 'None']],
  ['Similarity criteria', ['AA', 'SAS similarity', 'SSS similarity', 'Not similar']],
  ['A / S / N', ['Always', 'Sometimes', 'Never']],
  ['Angle pairs', ['corresponding', 'alternate interior', 'alternate exterior', 'same-side interior', 'vertical', 'linear pair']],
  ['Which law', ['Law of Sines', 'Law of Cosines', 'Right-triangle trig', 'Not enough information']],
]

function StemEditor({ stem, onChange, onClose }: { stem?: SharedStem; onChange: (s: SharedStem | undefined) => void; onClose: () => void }) {
  const s = stem ?? { text: '', count: 2 }
  return (
    <div className="stem-editor" onClick={(e) => e.stopPropagation()}>
      <div className="row">
        <strong className="small">Shared stem</strong>
        <span className="muted small">Prints once before the group as “(#5–8) …”. Items in the group stay together when forms shuffle.</span>
        <span className="spacer" />
        <label className="inline small">
          Covers{' '}
          <input type="number" min={1} max={20} value={s.count} style={{ width: 52 }} onChange={(e) => onChange({ ...s, count: Math.max(1, Number(e.target.value) || 1) })} /> items
        </label>
      </div>
      <textarea rows={2} placeholder="e.g. Use the diagram for questions in this group. ($math$ allowed)" value={s.text} onChange={(e) => onChange({ ...s, text: e.target.value })} />
      <div className="row wrap">
        <span className="field-label">Answer bank</span>
        {BANK_PRESETS.map(([label, bank]) => (
          <button key={label} type="button" className="ghost small" onClick={() => onChange({ ...s, bank })}>
            {label}
          </button>
        ))}
      </div>
      <textarea rows={2} placeholder="One choice per line (optional). Printed as a. … b. … for every item in the group." value={(s.bank ?? []).join('\n')} onChange={(e) => onChange({ ...s, bank: e.target.value.split('\n').filter((x) => x.trim()) })} />
      <div className="row">
        <button type="button" className="ghost small danger" onClick={() => (onChange(undefined), onClose())}>
          <Trash2 size={13} /> Remove stem
        </button>
        <span className="spacer" />
        <button type="button" className="primary small" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}
