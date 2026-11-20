import { useEffect, useRef, useState } from 'react'
import { DebugTag } from '../components/DebugTag'
import { MathText } from '../components/MathText'
import { QuestionView, wrapMath } from '../components/QuestionView'
import { TopicPicker } from '../components/TopicPicker'
import { DiagramEditor } from '../diagram/DiagramEditor'
import { TEMPLATES } from '../diagram/templates'
import { generatorById, newQuestionFromGenerator } from '../gen'
import { randomSeed } from '../lib/rng'
import { withType } from '../model/defaults'
import { type Question, QUESTION_TYPE_LABELS, type QuestionType } from '../model/types'
import { navigate } from '../router'
import { addQuestionsToTest, deleteQuestion, saveQuestion, uid, useStore } from '../store/store'

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
  const [showDiagram, setShowDiagram] = useState(!!draft.diagram)
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
    if (thenGo) navigate(thenGo)
    else if (id === 'new') navigate(`/q/${draft.id}${returnTo ? `?return=${encodeURIComponent(returnTo)}` : ''}`)
  }

  const gen = draft.gen ? generatorById.get(draft.gen.generatorId) : undefined

  return (
    <div className="page editor-page">
      <div className="page-head">
        <h2>
          {id === 'new' ? 'Add question' : 'Edit question'} <DebugTag q={draft} />
        </h2>
        <div className="actions">
          {returnTo && (
            <button type="button" onClick={() => (!dirty || confirm('Discard unsaved changes?')) && navigate(returnTo)}>
              ← Back
            </button>
          )}
          <button type="button" className="primary" onClick={() => save(returnTo ?? undefined)} disabled={!dirty}>
            {dirty ? 'Save' : 'Saved'}
          </button>
          {id !== 'new' && (
            <button
              type="button"
              className="danger"
              onClick={() => {
                if (confirm('Delete this question? It will also be removed from any tests.')) {
                  deleteQuestion(draft.id)
                  navigate(returnTo ?? '/bank')
                }
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="editor-grid">
        <div className="editor-form">
          {gen && (
            <div className="gen-banner">
              Generated by <strong>{gen.title}</strong>
              {draft.gen?.edited && <span className="tag warn">edited by hand: Forms B, C… still use fresh generator text</span>}
              <button
                type="button"
                onClick={() => {
                  const fresh = newQuestionFromGenerator(gen, randomSeed(), draft.gen?.options ?? {}, draft.id)
                  setDraft({ ...fresh, lessons: draft.lessons, points: draft.points, createdAt: draft.createdAt })
                  setDirty(true)
                }}
              >
                Re-roll numbers
              </button>
              <button
                type="button"
                title="Stop treating this as a generated question (it will not change between test versions)"
                onClick={() => {
                  setDraft({ ...draft, gen: undefined } as Question)
                  setDirty(true)
                }}
              >
                Detach
              </button>
            </div>
          )}

          <section>
            <h3>Question type</h3>
            <div className="type-tabs">
              {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={draft.type === t ? 'active' : ''}
                  onClick={() => {
                    if (t === draft.type) return
                    setDraft(withType(draft, t))
                    setDirty(true)
                  }}
                >
                  {QUESTION_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3>Topic</h3>
            <TopicPicker value={draft.lessons} onChange={(lessons) => set({ lessons })} />
          </section>

          <section>
            <h3>Prompt</h3>
            <RichField
              value={draft.prompt}
              rows={4}
              onChange={(prompt) => set({ prompt })}
              placeholder="Type the question. Use $...$ for math, e.g. Find $m\angle ABC$. Leave a blank line between parts (a), (b)…"
            />
          </section>

          <section>
            <h3>
              Diagram{' '}
              {!showDiagram ? (
                <select
                  value=""
                  onChange={(e) => {
                    const t = TEMPLATES.find((x) => x.id === e.target.value)
                    if (!t) return
                    set({ diagram: t.make() })
                    setShowDiagram(true)
                  }}
                >
                  <option value="">{draft.diagram ? 'Replace with template…' : '+ Add diagram from template…'}</option>
                  {TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              ) : null}
              {draft.diagram && (
                <>
                  <button type="button" onClick={() => setShowDiagram(!showDiagram)}>
                    {showDiagram ? 'Hide editor' : 'Edit diagram'}
                  </button>
                  <select value={draft.diagramPos ?? 'right'} onChange={(e) => set({ diagramPos: e.target.value as 'right' | 'below' })}>
                    <option value="right">Beside the text</option>
                    <option value="below">Below the text</option>
                  </select>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      set({ diagram: undefined })
                      setShowDiagram(false)
                    }}
                  >
                    Remove
                  </button>
                </>
              )}
            </h3>
            {showDiagram && draft.diagram && <DiagramEditor value={draft.diagram} onChange={(diagram) => set({ diagram })} />}
          </section>

          <section>
            <h3>Answer</h3>
            <AnswerEditor q={draft} set={set} />
          </section>

          <section>
            <h3>Details</h3>
            <div className="row wrap">
              <label>
                Points <input type="number" min={0} step={0.5} value={draft.points} style={{ width: 60 }} onChange={(e) => set({ points: Number(e.target.value) })} />
              </label>
              <label>
                Difficulty{' '}
                <select value={draft.difficulty ?? ''} onChange={(e) => set({ difficulty: (Number(e.target.value) || undefined) as 1 | 2 | 3 | undefined })}>
                  <option value="">—</option>
                  <option value="1">1 · basic</option>
                  <option value="2">2 · standard</option>
                  <option value="3">3 · challenge</option>
                </select>
              </label>
              <label>
                <input type="checkbox" checked={!!draft.honors} onChange={(e) => set({ honors: e.target.checked || undefined })} /> Honors extension
              </label>
              {draft.type !== 'tf' && draft.type !== 'matching' && (
                <label>
                  Work space (lines){' '}
                  <input type="number" min={0} max={40} value={draft.workLines ?? 0} style={{ width: 60 }} onChange={(e) => set({ workLines: Number(e.target.value) || undefined })} />
                </label>
              )}
              <label>
                Tags <input value={(draft.tags ?? []).join(', ')} placeholder="e.g. review, quiz 3" onChange={(e) => set({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} />
              </label>
            </div>
            <RichField label="Worked solution (answer key only)" value={draft.solution ?? ''} rows={3} onChange={(solution) => set({ solution: solution || undefined })} />
          </section>
        </div>

        <div className="editor-preview">
          <div className="preview-tabs">
            <button type="button" className={preview === 'student' ? 'active' : ''} onClick={() => setPreview('student')}>
              Student copy
            </button>
            <button type="button" className={preview === 'key' ? 'active' : ''} onClick={() => setPreview('key')}>
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
          <p className="muted">Each answer blank shows as “label = ____”. Use LaTeX, e.g. label <code>m\angle A</code>, value <code>4\sqrt{3}</code>.</p>
          {q.answers.map((a, i) => (
            <div key={i} className="row">
              <input placeholder="label (x, m\angle B, …)" value={a.label ?? ''} style={{ width: 160 }} onChange={(e) => set({ answers: q.answers.map((x, j) => (j === i ? { ...x, label: e.target.value || undefined } : x)) })} />
              <span>=</span>
              <input placeholder="answer (LaTeX)" value={a.value} onChange={(e) => set({ answers: q.answers.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} />
              <span className="preview-chip">
                <MathText text={`${a.label ? `$${a.label} = $ ` : ''}${wrapMath(a.value || '?')}`} inline />
              </span>
              <button type="button" onClick={() => set({ answers: q.answers.filter((_, j) => j !== i) })}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={() => set({ answers: [...q.answers, { value: '' }] })}>
            + Answer blank
          </button>
        </div>
      )
    case 'free':
      return <RichField label="Model answer / rubric" value={q.answer} rows={4} onChange={(answer) => set({ answer })} />
    case 'proof':
      return (
        <div className="list-editor">
          <RichField label="Given" value={q.given} onChange={(given) => set({ given })} />
          <RichField label="Prove" value={q.prove} onChange={(prove) => set({ prove })} />
          <div className="row">
            <label>
              Format{' '}
              <select value={q.format} onChange={(e) => set({ format: e.target.value as 'two-column' | 'paragraph' })}>
                <option value="two-column">Two-column</option>
                <option value="paragraph">Paragraph</option>
              </select>
            </label>
            <label>
              Rows on student copy{' '}
              <input type="number" min={1} max={20} value={q.studentRows ?? q.rows.length} style={{ width: 60 }} onChange={(e) => set({ studentRows: Number(e.target.value) || undefined })} />
            </label>
          </div>
          <p className="muted">Check “show” to print a cell on the student copy (fill-in-the-blank proofs). Unchecked cells are blank for students and appear on the key.</p>
          <table className="proof-edit">
            <thead>
              <tr>
                <th>#</th>
                <th>Statement</th>
                <th>Reason</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {q.rows.map((r, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>
                    <input value={r.statement} onChange={(e) => set({ rows: q.rows.map((x, j) => (j === i ? { ...x, statement: e.target.value } : x)) })} />
                    <label className="small">
                      <input type="checkbox" checked={!!r.showStatement} onChange={(e) => set({ rows: q.rows.map((x, j) => (j === i ? { ...x, showStatement: e.target.checked } : x)) })} /> show
                    </label>
                  </td>
                  <td>
                    <input
                      list="proof-reasons"
                      value={r.reason}
                      onChange={(e) => set({ rows: q.rows.map((x, j) => (j === i ? { ...x, reason: e.target.value } : x)) })}
                    />
                    <label className="small">
                      <input type="checkbox" checked={!!r.showReason} onChange={(e) => set({ rows: q.rows.map((x, j) => (j === i ? { ...x, showReason: e.target.checked } : x)) })} /> show
                    </label>
                  </td>
                  <td className="nowrap">
                    <button type="button" disabled={i === 0} onClick={() => set({ rows: move(q.rows, i, -1) })}>
                      ↑
                    </button>
                    <button type="button" disabled={i === q.rows.length - 1} onClick={() => set({ rows: move(q.rows, i, 1) })}>
                      ↓
                    </button>
                    <button type="button" onClick={() => set({ rows: q.rows.filter((_, j) => j !== i) })}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <datalist id="proof-reasons">
            {PROOF_REASONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
          <div className="row">
            <button type="button" onClick={() => set({ rows: [...q.rows, { statement: '', reason: '' }] })}>
              + Row
            </button>
            <button type="button" onClick={() => set({ rows: q.rows.map((r) => ({ ...r, showStatement: true, showReason: false })) })}>
              Show all statements
            </button>
            <button type="button" onClick={() => set({ rows: q.rows.map((r) => ({ ...r, showStatement: false, showReason: false })) })}>
              Blank all
            </button>
          </div>
        </div>
      )
    case 'tf':
      return (
        <div className="list-editor">
          <div className="row">
            <label>
              Mode{' '}
              <select
                value={q.mode}
                onChange={(e) => {
                  const mode = e.target.value as 'tf' | 'asn'
                  set({ mode, items: q.items.map((it) => ({ ...it, answer: mode === 'tf' ? 'T' : 'A' })) })
                }}
              >
                <option value="tf">True / False</option>
                <option value="asn">Always / Sometimes / Never</option>
              </select>
            </label>
            <label>
              <input type="checkbox" checked={!!q.requireJustification} onChange={(e) => set({ requireJustification: e.target.checked || undefined })} /> Space for justification
            </label>
          </div>
          {q.items.map((it, i) => (
            <div key={i} className="row">
              <select value={it.answer} onChange={(e) => set({ items: q.items.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)) })}>
                {(q.mode === 'tf' ? ['T', 'F'] : ['A', 'S', 'N']).map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <input placeholder="Statement ($math$ allowed)" value={it.text} style={{ flex: 2 }} onChange={(e) => set({ items: q.items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
              <input placeholder="Key note (optional)" value={it.explanation ?? ''} style={{ flex: 1 }} onChange={(e) => set({ items: q.items.map((x, j) => (j === i ? { ...x, explanation: e.target.value || undefined } : x)) })} />
              <button type="button" onClick={() => set({ items: q.items.filter((_, j) => j !== i) })}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={() => set({ items: [...q.items, { text: '', answer: q.mode === 'tf' ? 'T' : 'A' }] })}>
            + Statement
          </button>
        </div>
      )
    case 'matching':
      return (
        <div className="list-editor">
          <p className="muted">The right column is shuffled on the printed test (differently for each version).</p>
          {q.pairs.map((p, i) => (
            <div key={i} className="row">
              <input placeholder="Left ($math$ allowed)" value={p.left} onChange={(e) => set({ pairs: q.pairs.map((x, j) => (j === i ? { ...x, left: e.target.value } : x)) })} />
              <span>↔</span>
              <input placeholder="Matching item" value={p.right} onChange={(e) => set({ pairs: q.pairs.map((x, j) => (j === i ? { ...x, right: e.target.value } : x)) })} />
              <button type="button" onClick={() => set({ pairs: q.pairs.filter((_, j) => j !== i) })}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={() => set({ pairs: [...q.pairs, { left: '', right: '' }] })}>
            + Pair
          </button>
          <label className="block">
            Extra choices that match nothing (one per line)
            <textarea rows={2} value={(q.distractors ?? []).join('\n')} onChange={(e) => set({ distractors: e.target.value.split('\n').filter((s) => s.trim()) })} />
          </label>
        </div>
      )
    case 'mc':
      return (
        <div className="list-editor">
          {q.choices.map((c, i) => (
            <div key={i} className="row">
              <input type="radio" name="correct" checked={q.correct === i} onChange={() => set({ correct: i })} title="Correct answer" />
              <input placeholder={`Choice ${'ABCDEF'[i]} ($math$ allowed)`} value={c} onChange={(e) => set({ choices: q.choices.map((x, j) => (j === i ? e.target.value : x)) })} />
              <span className="preview-chip">
                <MathText text={wrapMath(c || ' ')} inline />
              </span>
              <button
                type="button"
                onClick={() => set({ choices: q.choices.filter((_, j) => j !== i), correct: q.correct > i ? q.correct - 1 : q.correct === i ? 0 : q.correct })}
              >
                ✕
              </button>
            </div>
          ))}
          <div className="row">
            <button type="button" onClick={() => set({ choices: [...q.choices, ''] })}>
              + Choice
            </button>
            <label>
              <input type="checkbox" checked={!!q.shuffle} onChange={(e) => set({ shuffle: e.target.checked })} /> Shuffle choices per version
            </label>
          </div>
        </div>
      )
  }
}

function move<T>(arr: T[], i: number, d: number): T[] {
  const out = arr.slice()
  const [x] = out.splice(i, 1)
  out.splice(i + d, 0, x)
  return out
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
