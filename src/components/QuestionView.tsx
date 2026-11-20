import { DiagramView } from '../diagram/DiagramView'
import { makeRng, mixSeed } from '../lib/rng'
import type { MatchingQuestion, MCQuestion, OrderQuestion, Question, SelectQuestion } from '../model/types'
import { MathText, Tex } from './MathText'

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Matching right column order for a question/version. */
export function matchingOrder(q: MatchingQuestion, version: number): string[] {
  const right = [...q.pairs.map((p) => p.right), ...(q.distractors ?? [])]
  return makeRng(mixSeed(hashString(q.id), version, 3)).shuffle(right)
}

/** Choice order for multiple choice (indices into q.choices). */
export function mcOrder(q: MCQuestion, version: number): number[] {
  const idx = q.choices.map((_, i) => i)
  return q.shuffle ? makeRng(mixSeed(hashString(q.id), version, 5)).shuffle(idx) : idx
}

const LETTERS = 'ABCDEFGHIJKLMNOP'

interface Props {
  q: Question
  number?: number | string
  points?: number
  showPoints?: boolean
  mode: 'student' | 'key'
  version?: number
  showSolution?: boolean
}

export function QuestionView({ q, number, points, showPoints, mode, version = 0, showSolution }: Props) {
  const key = mode === 'key'
  const pts = points ?? q.points
  const diagramBelow = q.diagramPos === 'below' || (q.diagram && q.diagram.width > 320)
  const diagram = q.diagram ? (
    <div className="q-diagram">
      <DiagramView diagram={q.diagram} />
    </div>
  ) : null

  return (
    <div className={`question q-${q.type}`}>
      <div className="q-head">
        {number !== undefined && <span className="q-num">{number}.</span>}
        <div className="q-main">
          <div className={`q-top ${diagram && !diagramBelow ? 'q-side' : ''}`}>
            <div className="q-text">
              {showPoints && pts > 0 && <span className="q-points">({pts} pt{pts === 1 ? '' : 's'})</span>}
              <MathText text={q.prompt} />
              {q.type === 'proof' && (
                <div className="proof-gp">
                  <div>
                    <strong>Given:</strong> <MathText text={q.given} inline />
                  </div>
                  <div>
                    <strong>Prove:</strong> <MathText text={q.prove} inline />
                  </div>
                </div>
              )}
            </div>
            {!diagramBelow && diagram}
          </div>
          {diagramBelow && diagram}
          <Body q={q} keyMode={key} version={version} />
          {key && showSolution && q.solution && (
            <div className="q-solution">
              <MathText text={q.solution} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function WorkSpace({ lines }: { lines?: number }) {
  if (!lines) return null
  return <div className="workspace" style={{ height: `calc(${lines * 0.32}in * var(--work-scale, 1))` }} />
}

const TF_OPTIONS: Record<'tf' | 'asn' | 'mcc', { code: string; word: string }[]> = {
  tf: [
    { code: 'T', word: 'True' },
    { code: 'F', word: 'False' },
  ],
  asn: [
    { code: 'A', word: 'Always' },
    { code: 'S', word: 'Sometimes' },
    { code: 'N', word: 'Never' },
  ],
  mcc: [
    { code: 'M', word: 'Must be' },
    { code: 'C', word: 'Could be' },
    { code: 'X', word: 'Can’t be' },
  ],
}

/** Print code for a TF/ASN/MCC answer (the "can't" code prints as N). */
const tfCode = (mode: 'tf' | 'asn' | 'mcc', a: string) => (mode === 'mcc' && a === 'X' ? 'N' : a)

/** Select-all choice order (indices) for a question/version. */
export function selectOrder(q: SelectQuestion, version: number): number[] {
  const idx = q.choices.map((_, i) => i)
  return q.shuffle ? makeRng(mixSeed(hashString(q.id), version, 7)).shuffle(idx) : idx
}

/** Scrambled order of steps (indices into q.items) for a put-in-order question. */
export function orderScramble(q: OrderQuestion, version: number): number[] {
  const idx = q.items.map((_, i) => i)
  const rng = makeRng(mixSeed(hashString(q.id), version, 9))
  if (q.fixFirst) return [0, ...rng.shuffle(idx.slice(1))]
  let out = rng.shuffle(idx)
  // Never print the steps already in order.
  for (let k = 0; k < 5 && out.every((v, i) => v === i) && out.length > 1; k++) out = rng.shuffle(idx)
  return out
}

/** Split cloze text into literal text and [[answer]] blanks. */
export function clozeParts(text: string): { text?: string; blank?: string }[] {
  const out: { text?: string; blank?: string }[] = []
  const re = /\[\[([\s\S]+?)\]\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) })
    out.push({ blank: m[1] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}

function Lines({ n, label }: { n: number; label?: string }) {
  return (
    <div className="write-lines">
      {label && <div className="lines-label">{label}:</div>}
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="write-line" />
      ))}
    </div>
  )
}

function Body({ q, keyMode, version }: { q: Question; keyMode: boolean; version: number }) {
  switch (q.type) {
    case 'short':
      if (q.layout === 'pair') {
        return (
          <>
            {!keyMode && <WorkSpace lines={q.workLines} />}
            <div className="answer-blanks">
              <span className="answer-blank">
                Answer:{' '}
                <span className={`blank ${keyMode ? 'filled' : ''}`}>{keyMode && q.answers[0] ? <Tex tex={q.answers[0].value} /> : ' '}</span> and{' '}
                <span className={`blank ${keyMode ? 'filled' : ''}`}>{keyMode && q.answers[1] ? <Tex tex={q.answers[1].value} /> : ' '}</span>
              </span>
            </div>
          </>
        )
      }
      return (
        <>
          {!keyMode && <WorkSpace lines={q.workLines} />}
          <div className="answer-blanks">
            {q.answers.map((a, i) => (
              <span key={i} className="answer-blank">
                {a.label && (
                  <>
                    <Tex tex={partLabel(a.label)} />
                    {/^\(\w\)/.test(a.label) ? ' ' : ' = '}
                  </>
                )}
                <span className={`blank ${keyMode ? 'filled' : ''}`}>{keyMode ? <Tex tex={a.value} /> : ' '}</span>
              </span>
            ))}
          </div>
        </>
      )
    case 'free':
      return keyMode ? (
        <div className="key-answer">
          <MathText text={q.answer || '(see rubric)'} />
        </div>
      ) : (
        <WorkSpace lines={q.workLines ?? 8} />
      )
    case 'proof': {
      const n = keyMode ? q.rows.length : Math.max(q.studentRows ?? q.rows.length, 1)
      if (q.format === 'paragraph' || (q.format === 'any' && !keyMode)) {
        return keyMode ? (
          <div className="key-answer">
            {q.rows.map((r, i) => (
              <span key={i}>
                <MathText text={r.statement} inline /> (<MathText text={r.reason} inline />){'. '}
              </span>
            ))}
          </div>
        ) : (
          <>
            {q.format === 'any' && <div className="format-note">Write your proof in any format: two-column, paragraph, or flow.</div>}
            <WorkSpace lines={q.workLines ?? 12} />
          </>
        )
      }
      return (
        <table className="proof-table">
          <thead>
            <tr>
              <th style={{ width: '1.6em' }} />
              <th>Statements</th>
              <th>Reasons</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: n }, (_, i) => {
              const r = q.rows[i]
              const showS = keyMode || (r?.showStatement ?? false)
              const showR = keyMode || (r?.showReason ?? false)
              const hiddenS = keyMode && r && !r.showStatement
              const hiddenR = keyMode && r && !r.showReason
              return (
                <tr key={i}>
                  <td className="row-num">{i + 1}.</td>
                  <td className={hiddenS ? 'key-fill' : ''}>{r && showS ? <MathText text={r.statement} inline /> : ' '}</td>
                  <td className={hiddenR ? 'key-fill' : ''}>{r && showR ? <MathText text={r.reason} inline /> : ' '}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )
    }
    case 'tf': {
      const opts = TF_OPTIONS[q.mode ?? 'tf']
      return (
        <>
          {q.mode === 'mcc' && q.style !== 'choices' && <div className="format-note">M = must be, C = could be, N = can’t be</div>}
          <ol className={`tf-list ${q.style === 'choices' ? 'as-choices' : ''}`}>
            {q.items.map((it, i) => (
              <li key={i}>
                {q.style === 'choices' ? (
                  <>
                    <MathText text={it.text} inline />
                    <div className="tf-choices">
                      {opts.map((o, k) => (
                        <span key={o.code} className={keyMode && it.answer === o.code ? 'correct' : ''}>
                          <span className="mc-letter">{'abcdef'[k]}.</span> {o.word}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <span className={`tf-blank ${keyMode ? 'filled' : ''}`}>{keyMode ? tfCode(q.mode ?? 'tf', it.answer) : ' '}</span>
                    <MathText text={it.text} inline />
                  </>
                )}
                {keyMode && it.explanation && (
                  <span className="key-note">
                    {' '}
                    — <MathText text={it.explanation} inline />
                  </span>
                )}
                {!keyMode && q.requireJustification && <div className="tf-just" />}
              </li>
            ))}
          </ol>
        </>
      )
    }
    case 'matching': {
      const order = matchingOrder(q, version)
      return (
        <div className="matching">
          <ol className="match-left">
            {q.pairs.map((p, i) => (
              <li key={i}>
                <span className={`tf-blank ${keyMode ? 'filled' : ''}`}>{keyMode ? LETTERS[order.indexOf(p.right)] : ' '}</span>
                <MathText text={p.left} inline />
              </li>
            ))}
          </ol>
          <ul className="match-right">
            {order.map((r, i) => (
              <li key={i}>
                <strong>{LETTERS[i]}.</strong> <MathText text={r} inline />
              </li>
            ))}
          </ul>
        </div>
      )
    }
    case 'mc': {
      const order = mcOrder(q, version)
      return (
        <>
          {!keyMode && <WorkSpace lines={q.workLines} />}
          <ol className="mc-choices">
            {order.map((ci, i) => (
              <li key={i} className={keyMode && ci === q.correct ? 'correct' : ''}>
                <span className="mc-letter">{LETTERS[i]}.</span> <MathText text={wrapMath(q.choices[ci])} inline />
              </li>
            ))}
          </ol>
        </>
      )
    }
    case 'select': {
      const order = selectOrder(q, version)
      return (
        <>
          <div className="format-note">
            Select <u>all</u> that apply.
          </div>
          {!keyMode && <WorkSpace lines={q.workLines} />}
          <ol className="mc-choices select-choices">
            {order.map((ci, i) => (
              <li key={i} className={keyMode && q.correct.includes(ci) ? 'correct' : ''}>
                <span className="mc-letter">{LETTERS[i]}.</span> <MathText text={wrapMath(q.choices[ci])} inline />
              </li>
            ))}
          </ol>
        </>
      )
    }
    case 'decide':
      return (
        <>
          {!keyMode && <WorkSpace lines={q.workLines} />}
          <div className="decide-choices">
            <span className="muted-print">Circle one:</span>
            {q.choices.map((c, i) => (
              <span key={i} className={`decide-choice ${keyMode && i === q.correct ? 'correct' : ''}`}>
                <MathText text={wrapMath(c)} inline />
              </span>
            ))}
          </div>
          {keyMode ? (
            <div className="key-answer">
              <strong>{q.justifyLabel || 'Justify'}:</strong> <MathText text={q.justification || '(see rubric)'} inline />
            </div>
          ) : (
            <Lines n={q.justifyLines ?? 3} label={q.justifyLabel || 'Justify'} />
          )}
        </>
      )
    case 'cloze': {
      const parts = clozeParts(q.text)
      const answers = parts.filter((p) => p.blank).map((p) => p.blank!)
      const bank = q.wordBank ? makeRng(mixSeed(hashString(q.id), version, 11)).shuffle([...answers, ...(q.extraWords ?? [])]) : []
      let n = 0
      return (
        <>
          {q.wordBank && (
            <div className="word-bank">
              {bank.map((w, i) => (
                <span key={i}>
                  <MathText text={w} inline />
                </span>
              ))}
            </div>
          )}
          <div className="cloze">
            {parts.map((p, i) =>
              p.text !== undefined ? (
                <MathText key={i} text={p.text} inline />
              ) : (
                <span key={i} className={`cloze-blank ${keyMode ? 'filled' : ''}`} style={{ minWidth: `${Math.min(3.6, 0.9 + p.blank!.length * 0.07)}in` }}>
                  {keyMode ? <MathText text={p.blank!} inline /> : <span className="blank-num">{++n}</span>}
                </span>
              ),
            )}
          </div>
        </>
      )
    }
    case 'order': {
      const scr = orderScramble(q, version)
      const answer = q.items.map((_, ii) => LETTERS[scr.indexOf(ii)]).join(', ')
      return (
        <>
          <ol className="order-items">
            {scr.map((ii, k) => (
              <li key={k}>
                <span className="mc-letter">{LETTERS[k]}.</span> <MathText text={q.items[ii]} inline />
              </li>
            ))}
          </ol>
          <div className="answer-blanks">
            <span className="answer-blank">
              Order: <span className={`blank long ${keyMode ? 'filled' : ''}`}>{keyMode ? answer : ' '}</span>
            </span>
          </div>
        </>
      )
    }
    case 'error':
      return (
        <>
          <div className="student-work">
            <div className="student-work-label">{q.studentName || 'Student'}’s work</div>
            <MathText text={q.work} />
          </div>
          {keyMode ? (
            <div className="key-answer">
              <MathText text={q.answer || '(see rubric)'} />
            </div>
          ) : (
            <WorkSpace lines={q.workLines ?? 5} />
          )}
        </>
      )
    case 'table':
      return (
        <table className="fill-table">
          <thead>
            <tr>
              {q.headers.map((h, i) => (
                <th key={i}>
                  <MathText text={h} inline />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {q.rows.map((row, r) => (
              <tr key={r}>
                {row.map((c, k) => (
                  <td key={k} className={!c.given && keyMode ? 'key-fill' : ''}>
                    {c.given || keyMode ? <MathText text={wrapMath(c.value)} inline /> : ' '}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
  }
}

/** Choices from generators are bare LaTeX; teacher-written choices may use $...$. */
export function wrapMath(s: string): string {
  if (s.includes('$')) return s
  if (/\\|\^|_|\{/.test(s) || /^[-\d.\s,()°]+$/.test(s)) return `$${s}$`
  return s
}

/** Plain-text summary of a question prompt for lists. */
export function promptSummary(q: Question, max = 140): string {
  const t = q.prompt
    .replace(/\$\$?([^$]*)\$\$?/g, (_, m: string) =>
      m
        .replace(/\\(angle|triangle)\s*/g, (_x: string, w: string) => (w === 'angle' ? '∠' : '△'))
        .replace(/\\overline\{(\w+)\}/g, '$1')
        .replace(/\\parallel/g, '∥')
        .replace(/\\ell/g, 'ℓ')
        .replace(/\\cong/g, '≅')
        .replace(/\\sim/g, '~')
        .replace(/\\perp/g, '⊥')
        .replace(/\\theta/g, 'θ')
        .replace(/\\pi/g, 'π')
        .replace(/\\sqrt/g, '√')
        .replace(/\\approx/g, '≈')
        .replace(/\\cdot/g, '·')
        .replace(/\\(?:text|mathrm)\{([^}]*)\}/g, '$1')
        .replace(/\\circ/g, '°')
        .replace(/\^/g, '')
        .replace(/\\[a-zA-Z]+/g, '')
        .replace(/[{}]/g, ''),
    )
    .replace(/\s+/g, ' ')
    .trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

/** Render part labels like "(a)" upright. */
function partLabel(label: string): string {
  const m = /^\((\w)\)/.exec(label)
  return m ? `\\text{(${m[1]})}${label.slice(m[0].length)}` : label
}
