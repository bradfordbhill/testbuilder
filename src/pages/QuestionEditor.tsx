import { ArrowLeft, ArrowLeftRight, CheckCircle2, Circle, Eye, EyeOff, Plus, RefreshCw, Save, Sparkles, Trash2, Unlink, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { DebugTag } from '../components/DebugTag'
import { MathText } from '../components/MathText'
import { TYPE_ICONS, TypeBadge } from '../components/QuestionRow'
import { QuestionView, wrapMath } from '../components/QuestionView'
import { TopicPicker } from '../components/TopicPicker'
import { DiagramEditor } from '../diagram/DiagramEditor'
import { DiagramView } from '../diagram/DiagramView'
import { TEMPLATES } from '../diagram/templates'
import { generatorById, newQuestionFromGenerator } from '../gen'
import { randomSeed } from '../lib/rng'
import { withType } from '../model/defaults'
import { type Question, QUESTION_TYPE_LABELS, type QuestionType } from '../model/types'
import { navigate } from '../router'
import { addQuestionsToTest, deleteQuestionsUndoable, saveQuestion, uid, useStore } from '../store/store'
import { ask } from '../ui/dialog'
import { useShortcuts } from '../ui/shortcuts'
import { DragHandle, SortableList } from '../ui/SortableList'
import { toast } from '../ui/toast'

/** Notation palette: label, text to insert (cursor goes to |). */
const NOTATION: [string, string][] = [
  ['∠', '$\\angle |$'],
  ['m∠', '$m\\angle |$'],
  ['△', '$\\triangle |$'],
  ['AB̅ segment', '$\\overline{|}$'],
  ['line ↔', '$\\overleftrightarrow{|}$'],
  ['ray →', '$\\overrightarrow{|}$'],
  ['≅', '$\\cong$'],
  ['∼', '$\\sim$'],
  ['∥', '$\\parallel$'],
  ['⊥', '$\\perp$'],
  ['°', '$^\\circ$'],
  ['√', '$\\sqrt{|}$'],
  ['a/b', '$\\frac{|}{}$'],
  ['π', '$\\pi$'],
  ['θ', '$\\theta$'],
  ['ℓ', '$\\ell$'],
  ['x²', '$x^2$'],
  ['sin', '$\\sin|$'],
  ['cos', '$\\cos|$'],
  ['tan', '$\\tan|$'],
  ['≈', '$\\approx$'],
  ['arc', '$\\overset{\\frown}{|}$'],
]

export function NotationPalette({ target, onInsert }: { target: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>; onInsert: (v: string) => void }) {
  return (
    <div className="palette">
      {NOTATION.map(([label, ins]) => (
        <button
          key={label}
          type="button"
          title={ins.replace('|', '')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const el = target.current
            if (!el) return
            const start = el.selectionStart ?? el.value.length
            const end = el.selectionEnd ?? start
            const selectedText = el.value.slice(start, end)
            const [before, after] = ins.split('|')
            const text = after === undefined ? before : before + selectedText + after
            const next = el.value.slice(0, start) + text + el.value.slice(end)
            onInsert(next)
            const caret = start + (after === undefined ? text.length : before.length + selectedText.length)
            requestAnimationFrame(() => {
              el.focus()
              el.setSelectionRange(caret, caret)
            })
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** Text input with notation palette and live math preview. */
function RichField({
  value,
  onChange,
  rows = 2,
  placeholder,
  label,
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
  label?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [focus, setFocus] = useState(false)
  return (
    <div className="rich-field">
      {label && <div className="field-label">{label}</div>}
      <textarea
        ref={ref}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
      />
      {focus && <NotationPalette target={ref} onInsert={onChange} />}
      {value.includes('$') && (
        <div className="inline-preview">
          <MathText text={value} />
        </div>
      )}
    </div>
  )
}

type Tab = 'question' | 'answer' | 'diagram' | 'details'
const TABS: { id: Tab; label: string }[] = [
  { id: 'question', label: 'Question' },
  { id: 'answer', label: 'Answer' },
  { id: 'diagram', label: 'Diagram' },
  { id: 'details', label: 'Details' },
]

export function QuestionEditor({ id, query }: { id: string; query: URLSearchParams }) {
  const stored = useStore((s) => (id === 'new' ? undefined : s.questions[id]))
  const [draft, setDraft] = useState<Question>(() => {
    if (stored) return structuredClone(stored)
    const type = (query.get('type') as QuestionType) || 'short'
    const lesson = query.get('lesson')
    return withType({ id: uid(), lessons: lesson ? [lesson] : [] }, type)
  })
  const [dirty, setDirty] = useState(id === 'new')
  const [preview, setPreview] = useState<'student' | 'key'>('student')
  const [tab, setTab] = useState<Tab>('question')
  const returnTo = query.get('return')

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const set = (patch: Partial<Question>) => {
    setDraft((d) => {
      const next = { ...d, ...patch } as Question
      if (next.gen && !('gen' in patch)) next.gen = { ...next.gen, edited: true }
      return next
    })
    setDirty(true)
  }

  const save = (thenGo?: string) => {
    saveQuestion(draft)
    setDirty(false)
    const testId = query.get('addToTest')
    if (id === 'new' && testId) addQuestionsToTest(testId, [draft.id])
    toast(id === 'new' && testId ? 'Saved and added to the test' : 'Saved', { kind: 'success', timeout: 1800 })
    if (thenGo) navigate(thenGo)
    else if (id === 'new') navigate(`/q/${draft.id}${returnTo ? `?return=${encodeURIComponent(returnTo)}` : ''}`)
  }

  const back = async () => {
    const to = returnTo ?? '/bank'
    if (dirty) {
      const v = await ask('Unsaved changes', 'Save your changes before leaving?', [
        { label: 'Cancel', value: 'cancel' },
        { label: 'Discard', value: 'discard', kind: 'danger' },
        { label: 'Save', value: 'save', kind: 'primary' },
      ])
      if (v === 'save') return save(to)
      if (v !== 'discard') return
    }
    navigate(to)
  }

  useShortcuts({
    'ctrl+s': () => save(),
    'alt+1': () => setTab('question'),
    'alt+2': () => setTab('answer'),
    'alt+3': () => setTab('diagram'),
    'alt+4': () => setTab('details'),
  })

  const gen = draft.gen ? generatorById.get(draft.gen.generatorId) : undefined
  const answerCount =
    draft.type === 'short' ? draft.answers.length : draft.type === 'proof' ? draft.rows.length : draft.type === 'tf' ? draft.items.length : draft.type === 'matching' ? draft.pairs.length : draft.type === 'mc' ? draft.choices.length : 0

  return (
    <div className="page editor-page">
      <div className="editor-head">
        <button type="button" className="icon-btn" title="Back" onClick={back}>
          <ArrowLeft size={16} />
        </button>
        <h2>{id === 'new' ? 'New question' : 'Edit question'}</h2>
        <TypeBadge type={draft.type} />
        <DebugTag q={draft} />
        <span className="spacer" />
        <span className={`save-state ${dirty ? 'dirty' : ''}`}>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
        {id !== 'new' && (
          <button
            type="button"
            className="icon-btn danger"
            title="Delete question"
            onClick={() => {
              deleteQuestionsUndoable([draft.id])
              navigate(returnTo ?? '/bank')
            }}
          >
            <Trash2 size={15} />
          </button>
        )}
        <button type="button" className="primary" onClick={() => save(returnTo ?? undefined)} disabled={!dirty} title="Save (Ctrl+S)">
          <Save size={14} /> Save{returnTo ? ' & close' : ''}
        </button>
      </div>

      {gen && (
        <div className="gen-banner">
          <Sparkles size={14} /> Generated by <strong>{gen.title}</strong>
          {draft.gen?.edited && <span className="mini-tag warn">edited by hand · Forms B, C… still use fresh generator text</span>}
          <span className="spacer" />
          <button
            type="button"
            className="ghost small"
            onClick={() => {
              const fresh = newQuestionFromGenerator(gen, randomSeed(), draft.gen?.options ?? {}, draft.id)
              setDraft({ ...fresh, lessons: draft.lessons, points: draft.points, createdAt: draft.createdAt })
              setDirty(true)
            }}
          >
            <RefreshCw size={13} /> Re-roll numbers
          </button>
          <button
            type="button"
            className="ghost small"
            title="Stop treating this as a generated question (it will not change between test versions)"
            onClick={() => {
              setDraft({ ...draft, gen: undefined } as Question)
              setDirty(true)
            }}
          >
            <Unlink size={13} /> Detach
          </button>
        </div>
      )}

      <div className="editor-grid">
        <div className="editor-form">
          <div className="tabs" role="tablist">
            {TABS.map((t, i) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)} title={`Alt+${i + 1}`}>
                {t.label}
                {t.id === 'answer' && answerCount > 0 && <span className="tab-count">{answerCount}</span>}
                {t.id === 'diagram' && draft.diagram && <span className="tab-dot" />}
                {t.id === 'question' && draft.lessons.length === 0 && <span className="tab-warn" title="No topic selected">!</span>}
              </button>
            ))}
          </div>

          {tab === 'question' && (
            <div className="tab-body">
              <div className="field">
                <div className="field-label">Type</div>
                <div className="type-tabs">
                  {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => {
                    const Icon = TYPE_ICONS[t]
                    return (
                      <button
                        key={t}
                        type="button"
                        className={`type-card ${draft.type === t ? 'on' : ''}`}
                        onClick={() => {
                          if (t === draft.type) return
                          setDraft(withType(draft, t))
                          setDirty(true)
                        }}
                      >
                        <Icon size={15} />
                        {QUESTION_TYPE_LABELS[t]}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="field">
                <div className="field-label">Prompt</div>
                <RichField
                  value={draft.prompt}
                  rows={5}
                  onChange={(prompt) => set({ prompt })}
                  placeholder="Type the question. Use $...$ for math, e.g. Find $m\angle ABC$. Leave a blank line between parts (a), (b)…"
                />
              </div>
              <div className="field">
                <div className="field-label">Topic</div>
                <TopicPicker value={draft.lessons} onChange={(lessons) => set({ lessons })} />
              </div>
            </div>
          )}

          {tab === 'answer' && (
            <div className="tab-body">
              <AnswerEditor q={draft} set={set} />
            </div>
          )}

          {tab === 'diagram' && (
            <div className="tab-body">
              {draft.diagram ? (
                <>
                  <div className="row">
                    <label className="inline">
                      Position{' '}
                      <select value={draft.diagramPos ?? 'right'} onChange={(e) => set({ diagramPos: e.target.value as 'right' | 'below' })}>
                        <option value="right">Beside the text</option>
                        <option value="below">Below the text</option>
                      </select>
                    </label>
                    <span className="spacer" />
                    <button
                      type="button"
                      className="ghost small danger"
                      onClick={() => {
                        const old = draft.diagram
                        set({ diagram: undefined })
                        toast('Diagram removed', { action: { label: 'Undo', run: () => set({ diagram: old }) } })
                      }}
                    >
                      <Trash2 size={13} /> Remove diagram
                    </button>
                  </div>
                  <DiagramEditor value={draft.diagram} onChange={(diagram) => set({ diagram })} />
                </>
              ) : (
                <>
                  <p className="muted">Start from a template, then drag points and add marks and labels.</p>
                  <div className="template-grid">
                    {TEMPLATES.map((t) => (
                      <button key={t.id} type="button" className="template-tile" onClick={() => set({ diagram: t.make() })}>
                        <span className="tile-art">
                          <DiagramView diagram={{ ...t.make(), width: 120 }} />
                        </span>
                        <span>{t.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'details' && (
            <div className="tab-body">
              <div className="details-grid">
                <label>
                  <span>Points</span>
                  <input type="number" min={0} step={0.5} value={draft.points} onChange={(e) => set({ points: Number(e.target.value) })} />
                </label>
                <label>
                  <span>Difficulty</span>
                  <select value={draft.difficulty ?? ''} onChange={(e) => set({ difficulty: (Number(e.target.value) || undefined) as 1 | 2 | 3 | undefined })}>
                    <option value="">—</option>
                    <option value="1">1 · basic</option>
                    <option value="2">2 · standard</option>
                    <option value="3">3 · challenge</option>
                  </select>
                </label>
                {draft.type !== 'tf' && draft.type !== 'matching' && (
                  <label>
                    <span>Work space (lines)</span>
                    <input type="number" min={0} max={40} value={draft.workLines ?? 0} onChange={(e) => set({ workLines: Number(e.target.value) || undefined })} />
                  </label>
                )}
                <label>
                  <span>Tags</span>
                  <input value={(draft.tags ?? []).join(', ')} placeholder="review, quiz 3" onChange={(e) => set({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} />
                </label>
                <label className="toggle">
                  <input type="checkbox" checked={!!draft.honors} onChange={(e) => set({ honors: e.target.checked || undefined })} /> Honors extension
                </label>
              </div>
              <RichField label="Worked solution (answer key only)" value={draft.solution ?? ''} rows={4} onChange={(solution) => set({ solution: solution || undefined })} />
            </div>
          )}
        </div>

        <div className="editor-preview">
          <div className="seg-tabs">
            <button type="button" className={preview === 'student' ? 'on' : ''} onClick={() => setPreview('student')}>
              Student copy
            </button>
            <button type="button" className={preview === 'key' ? 'on' : ''} onClick={() => setPreview('key')}>
              Answer key
            </button>
          </div>
          <div className="paper">
            <QuestionView q={draft} number={1} showPoints mode={preview} showSolution />
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- type-specific answer editors

function AnswerEditor({ q, set }: { q: Question; set: (p: Partial<Question>) => void }) {
  switch (q.type) {
    case 'short':
      return (
        <div className="list-editor">
          <p className="muted small">Each blank prints as “label = ____”. LaTeX allowed: label <code>m\angle A</code>, value <code>4\sqrt{3}</code>.</p>
          <SortableList
            items={q.answers}
            onReorder={(answers) => set({ answers })}
            render={(a, i, h) => (
              <div className="edit-row">
                <DragHandle handle={h} />
                <input placeholder="label (x, m\angle B…)" value={a.label ?? ''} className="w-label" onChange={(e) => set({ answers: q.answers.map((x, j) => (j === i ? { ...x, label: e.target.value || undefined } : x)) })} />
                <span className="muted">=</span>
                <input placeholder="answer (LaTeX)" value={a.value} onChange={(e) => set({ answers: q.answers.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} />
                <span className="preview-chip">
                  <MathText text={`${a.label ? `$${a.label} = $ ` : ''}${wrapMath(a.value || '?')}`} inline />
                </span>
                <RemoveBtn onClick={() => set({ answers: q.answers.filter((_, j) => j !== i) })} />
              </div>
            )}
          />
          <button type="button" className="ghost small" onClick={() => set({ answers: [...q.answers, { value: '' }] })}>
            <Plus size={13} /> Answer blank
          </button>
        </div>
      )
    case 'free':
      return <RichField label="Model answer / rubric" value={q.answer} rows={5} onChange={(answer) => set({ answer })} />
    case 'proof':
      return (
        <div className="list-editor">
          <RichField label="Given" value={q.given} onChange={(given) => set({ given })} />
          <RichField label="Prove" value={q.prove} onChange={(prove) => set({ prove })} />
          <div className="row">
            <label className="inline">
              Format{' '}
              <select value={q.format} onChange={(e) => set({ format: e.target.value as 'two-column' | 'paragraph' })}>
                <option value="two-column">Two-column</option>
                <option value="paragraph">Paragraph</option>
              </select>
            </label>
            <label className="inline">
              Student rows{' '}
              <input type="number" min={1} max={20} value={q.studentRows ?? q.rows.length} style={{ width: 56 }} onChange={(e) => set({ studentRows: Number(e.target.value) || undefined })} />
            </label>
          </div>
          <p className="muted small">
            <Eye size={12} /> marks a cell printed on the student copy (fill-in-the-blank proofs). Unmarked cells are blank for students and appear on the key.
          </p>
          <div className="proof-head">
            <span />
            <span>#</span>
            <span>Statement</span>
            <span>Reason</span>
            <span />
          </div>
          <SortableList
            items={q.rows}
            onReorder={(rows) => set({ rows })}
            render={(r, i, h) => (
              <div className="edit-row proof-row">
                <DragHandle handle={h} />
                <span className="muted">{i + 1}</span>
                <span className="cell">
                  <input value={r.statement} onChange={(e) => set({ rows: q.rows.map((x, j) => (j === i ? { ...x, statement: e.target.value } : x)) })} />
                  <ShowToggle on={!!r.showStatement} onClick={() => set({ rows: q.rows.map((x, j) => (j === i ? { ...x, showStatement: !x.showStatement } : x)) })} />
                </span>
                <span className="cell">
                  <input list="proof-reasons" value={r.reason} onChange={(e) => set({ rows: q.rows.map((x, j) => (j === i ? { ...x, reason: e.target.value } : x)) })} />
                  <ShowToggle on={!!r.showReason} onClick={() => set({ rows: q.rows.map((x, j) => (j === i ? { ...x, showReason: !x.showReason } : x)) })} />
                </span>
                <RemoveBtn onClick={() => set({ rows: q.rows.filter((_, j) => j !== i) })} />
              </div>
            )}
          />
          <datalist id="proof-reasons">
            {PROOF_REASONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
          <div className="row">
            <button type="button" className="ghost small" onClick={() => set({ rows: [...q.rows, { statement: '', reason: '' }] })}>
              <Plus size={13} /> Row
            </button>
            <button type="button" className="ghost small" onClick={() => set({ rows: q.rows.map((r) => ({ ...r, showStatement: true, showReason: false })) })}>
              Show all statements
            </button>
            <button type="button" className="ghost small" onClick={() => set({ rows: q.rows.map((r) => ({ ...r, showStatement: false, showReason: false })) })}>
              Blank all
            </button>
          </div>
        </div>
      )
    case 'tf':
      return (
        <div className="list-editor">
          <div className="row">
            <div className="seg-tabs small">
              {(['tf', 'asn'] as const).map((mode) => (
                <button key={mode} type="button" className={q.mode === mode ? 'on' : ''} onClick={() => mode !== q.mode && set({ mode, items: q.items.map((it) => ({ ...it, answer: mode === 'tf' ? 'T' : 'A' })) })}>
                  {mode === 'tf' ? 'True / False' : 'Always / Sometimes / Never'}
                </button>
              ))}
            </div>
            <label className="toggle">
              <input type="checkbox" checked={!!q.requireJustification} onChange={(e) => set({ requireJustification: e.target.checked || undefined })} /> Space for justification
            </label>
          </div>
          <SortableList
            items={q.items}
            onReorder={(items) => set({ items })}
            render={(it, i, h) => (
              <div className="edit-row">
                <DragHandle handle={h} />
                <span className="answer-pills">
                  {(q.mode === 'tf' ? ['T', 'F'] : ['A', 'S', 'N']).map((v) => (
                    <button key={v} type="button" className={it.answer === v ? 'on' : ''} onClick={() => set({ items: q.items.map((x, j) => (j === i ? { ...x, answer: v } : x)) })}>
                      {v}
                    </button>
                  ))}
                </span>
                <input placeholder="Statement ($math$ allowed)" value={it.text} className="grow2" onChange={(e) => set({ items: q.items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
                <input placeholder="Key note (optional)" value={it.explanation ?? ''} onChange={(e) => set({ items: q.items.map((x, j) => (j === i ? { ...x, explanation: e.target.value || undefined } : x)) })} />
                <RemoveBtn onClick={() => set({ items: q.items.filter((_, j) => j !== i) })} />
              </div>
            )}
          />
          <button type="button" className="ghost small" onClick={() => set({ items: [...q.items, { text: '', answer: q.mode === 'tf' ? 'T' : 'A' }] })}>
            <Plus size={13} /> Statement
          </button>
        </div>
      )
    case 'matching':
      return (
        <div className="list-editor">
          <p className="muted small">The right column is shuffled on the printed test (differently for each form).</p>
          <SortableList
            items={q.pairs}
            onReorder={(pairs) => set({ pairs })}
            render={(p, i, h) => (
              <div className="edit-row">
                <DragHandle handle={h} />
                <input placeholder="Left ($math$ allowed)" value={p.left} onChange={(e) => set({ pairs: q.pairs.map((x, j) => (j === i ? { ...x, left: e.target.value } : x)) })} />
                <ArrowLeftRight size={14} className="muted" />
                <input placeholder="Matching item" value={p.right} onChange={(e) => set({ pairs: q.pairs.map((x, j) => (j === i ? { ...x, right: e.target.value } : x)) })} />
                <RemoveBtn onClick={() => set({ pairs: q.pairs.filter((_, j) => j !== i) })} />
              </div>
            )}
          />
          <button type="button" className="ghost small" onClick={() => set({ pairs: [...q.pairs, { left: '', right: '' }] })}>
            <Plus size={13} /> Pair
          </button>
          <label className="block">
            <span className="field-label">Extra choices that match nothing (one per line)</span>
            <textarea rows={2} value={(q.distractors ?? []).join('\n')} onChange={(e) => set({ distractors: e.target.value.split('\n').filter((s) => s.trim()) })} />
          </label>
        </div>
      )
    case 'mc': {
      const rows = q.choices.map((text, i) => ({ text, correct: i === q.correct }))
      return (
        <div className="list-editor">
          <p className="muted small">Click the circle to mark the correct answer.</p>
          <SortableList
            items={rows}
            onReorder={(next) => set({ choices: next.map((r) => r.text), correct: Math.max(0, next.findIndex((r) => r.correct)) })}
            render={(r, i, h) => (
              <div className={`edit-row ${r.correct ? 'correct' : ''}`}>
                <DragHandle handle={h} />
                <button type="button" className={`correct-dot ${r.correct ? 'on' : ''}`} title="Mark correct" onClick={() => set({ correct: i })}>
                  {r.correct ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                </button>
                <span className="muted">{'ABCDEFGH'[i]}.</span>
                <input placeholder={`Choice ${'ABCDEF'[i]} ($math$ allowed)`} value={r.text} onChange={(e) => set({ choices: q.choices.map((x, j) => (j === i ? e.target.value : x)) })} />
                <span className="preview-chip">
                  <MathText text={wrapMath(r.text || ' ')} inline />
                </span>
                <RemoveBtn onClick={() => set({ choices: q.choices.filter((_, j) => j !== i), correct: q.correct > i ? q.correct - 1 : q.correct === i ? 0 : q.correct })} />
              </div>
            )}
          />
          <div className="row">
            <button type="button" className="ghost small" onClick={() => set({ choices: [...q.choices, ''] })}>
              <Plus size={13} /> Choice
            </button>
            <label className="toggle">
              <input type="checkbox" checked={!!q.shuffle} onChange={(e) => set({ shuffle: e.target.checked })} /> Shuffle choices per form
            </label>
          </div>
        </div>
      )
    }
  }
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="icon-btn row-remove" title="Remove" onClick={onClick}>
      <X size={14} />
    </button>
  )
}

function ShowToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`show-toggle ${on ? 'on' : ''}`} title={on ? 'Printed on the student copy' : 'Blank on the student copy'} onClick={onClick}>
      {on ? <Eye size={13} /> : <EyeOff size={13} />}
    </button>
  )
}

const PROOF_REASONS = [
  'Given',
  'Definition of midpoint',
  'Definition of angle bisector',
  'Definition of perpendicular',
  'Definition of parallelogram',
  'Definition of congruent segments',
  'Vertical angles are congruent',
  'All right angles are congruent',
  'A segment is congruent to itself',
  'An angle is congruent to itself',
  'Alternate interior angles are congruent (parallel lines)',
  'Corresponding angles are congruent (parallel lines)',
  'Same-side interior angles are supplementary (parallel lines)',
  'Triangle Angle Sum Theorem',
  'Perpendicular Bisector Theorem',
  'Side-Angle-Side Triangle Congruence Theorem (SAS)',
  'Angle-Side-Angle Triangle Congruence Theorem (ASA)',
  'Side-Side-Side Triangle Congruence Theorem (SSS)',
  'Corresponding parts of congruent triangles are congruent',
  'Angle-Angle Triangle Similarity Theorem',
  'Side-Angle-Side Triangle Similarity Theorem',
  'Side-Side-Side Triangle Similarity Theorem',
  'Addition property of equality',
  'Subtraction property of equality',
  'Substitution',
  'Segment addition',
  'Angle addition',
  'Two points determine a line (auxiliary segment)',
]
