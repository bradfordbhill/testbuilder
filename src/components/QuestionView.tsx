import { DiagramView } from '../diagram/DiagramView'
import { makeRng, mixSeed } from '../lib/rng'
import type { MatchingQuestion, MCQuestion, Question } from '../model/types'
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

function Body({ q, keyMode, version }: { q: Question; keyMode: boolean; version: number }) {
  switch (q.type) {
    case 'short':
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
      if (q.format === 'paragraph') {
        return keyMode ? (
          <div className="key-answer">
            {q.rows.map((r, i) => (
              <span key={i}>
                <MathText text={r.statement} inline /> (<MathText text={r.reason} inline />){'. '}
              </span>
            ))}
          </div>
        ) : (
          <WorkSpace lines={q.workLines ?? 10} />
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
    case 'tf':
      return (
        <ol className="tf-list">
          {q.items.map((it, i) => (
            <li key={i}>
              <span className={`tf-blank ${keyMode ? 'filled' : ''}`}>{keyMode ? it.answer : ' '}</span>
              <MathText text={it.text} inline />
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
      )
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
