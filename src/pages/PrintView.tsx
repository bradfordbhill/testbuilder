import { useState } from 'react'
import { MathText } from '../components/MathText'
import { hashString, QuestionView } from '../components/QuestionView'
import { questionForVersion } from '../gen'
import { versionLetter } from '../lib/mathfmt'
import { makeRng, mixSeed } from '../lib/rng'
import type { Question, Test } from '../model/types'
import { href } from '../router'
import { useStore } from '../store/store'
import { itemPoints } from './TestPages'

export interface RenderedItem {
  q: Question
  points: number
  pageBreakBefore?: boolean
  number: number
}

/** The questions of a test for one version, in order, with version-specific numbers. */
export function versionItems(test: Test, questions: Record<string, Question>, v: number) {
  let n = 0
  return test.sections.map((sec) => {
    let items = sec.items.filter((it) => questions[it.questionId])
    if (v > 0 && test.shuffleQuestions) items = makeRng(mixSeed(hashString(test.id), v, test.versionSalt, 11)).shuffle(items)
    return {
      section: sec,
      items: items.map((it) => {
        const base = questions[it.questionId]
        return {
          q: questionForVersion(base, v, test.versionSalt),
          points: itemPoints(it, base),
          pageBreakBefore: it.pageBreakBefore,
          number: ++n,
        }
      }),
    }
  })
}

export function PrintView({ id }: { id: string }) {
  const test = useStore((s) => s.tests[id])
  const questions = useStore((s) => s.questions)
  const [versions, setVersions] = useState<number[] | null>(null)
  const [student, setStudent] = useState(true)
  const [key, setKey] = useState(true)
  const [solutions, setSolutions] = useState(true)
  const [fontSize, setFontSize] = useState(12)
  const [spacing, setSpacing] = useState(1)

  if (!test) return <div className="page">Test not found.</div>
  const allVersions = Array.from({ length: test.versions }, (_, i) => i)
  const chosen = versions ?? allVersions
  const total = test.sections.reduce((s, sec) => s + sec.items.reduce((a, it) => a + itemPoints(it, questions[it.questionId]), 0), 0)

  const docs: { v: number; mode: 'student' | 'key' }[] = []
  for (const v of chosen) if (student) docs.push({ v, mode: 'student' })
  for (const v of chosen) if (key) docs.push({ v, mode: 'key' })

  return (
    <div className="print-page">
      <div className="print-toolbar no-print">
        <a href={href(`/test/${test.id}`)}>← Back to test</a>
        {test.versions > 1 && (
          <span>
            Forms:{' '}
            {allVersions.map((v) => (
              <label key={v}>
                <input
                  type="checkbox"
                  checked={chosen.includes(v)}
                  onChange={(e) => setVersions(e.target.checked ? [...chosen, v].sort() : chosen.filter((x) => x !== v))}
                />{' '}
                {versionLetter(v)}
              </label>
            ))}
          </span>
        )}
        <label>
          <input type="checkbox" checked={student} onChange={(e) => setStudent(e.target.checked)} /> Student copies
        </label>
        <label>
          <input type="checkbox" checked={key} onChange={(e) => setKey(e.target.checked)} /> Answer keys
        </label>
        {key && (
          <label>
            <input type="checkbox" checked={solutions} onChange={(e) => setSolutions(e.target.checked)} /> Worked solutions on key
          </label>
        )}
        <label>
          Font{' '}
          <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}>
            {[10, 11, 12, 13, 14].map((s) => (
              <option key={s} value={s}>
                {s} pt
              </option>
            ))}
          </select>
        </label>
        <label>
          Work space{' '}
          <select value={spacing} onChange={(e) => setSpacing(Number(e.target.value))}>
            <option value={0.5}>Compact</option>
            <option value={1}>Normal</option>
            <option value={1.5}>Roomy</option>
          </select>
        </label>
        <button type="button" className="primary" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>
      <p className="no-print muted print-tip">Tip: in the print dialog choose “Save as PDF”, turn off headers and footers, and keep margins at Default.</p>
      <div className="print-docs" style={{ fontSize: `${fontSize}pt`, ['--work-scale' as string]: spacing }}>
        {docs.map(({ v, mode }) => (
          <TestDocument key={`${mode}-${v}`} test={test} questions={questions} v={v} mode={mode} total={total} solutions={solutions} />
        ))}
      </div>
    </div>
  )
}

function TestDocument({
  test,
  questions,
  v,
  mode,
  total,
  solutions,
}: {
  test: Test
  questions: Record<string, Question>
  v: number
  mode: 'student' | 'key'
  total: number
  solutions: boolean
}) {
  const sections = versionItems(test, questions, v)
  const form = test.versions > 1 ? `Form ${versionLetter(v)}` : ''
  return (
    <div className={`test-doc ${mode}`}>
      <header className="test-header">
        {(test.header.name || test.header.date || test.header.period) && mode === 'student' && (
          <div className="name-line">
            {test.header.name && (
              <span>
                Name <span className="line long" />
              </span>
            )}
            {test.header.date && (
              <span>
                Date <span className="line" />
              </span>
            )}
            {test.header.period && (
              <span>
                Period <span className="line short" />
              </span>
            )}
          </div>
        )}
        <h1>
          {test.title}
          {mode === 'key' && <span className="key-badge">ANSWER KEY</span>}
        </h1>
        <div className="subtitle">
          {[test.subtitle, form, test.showPoints ? `${total} points` : ''].filter(Boolean).join(' · ')}
        </div>
        {test.instructions && mode === 'student' && (
          <div className="instructions">
            <MathText text={test.instructions} />
          </div>
        )}
      </header>
      {sections.map(({ section, items }) => (
        <section key={section.id} className="test-sec">
          {(section.title || section.instructions) && (
            <div className="sec-head">
              {section.title && <h2>{section.title}</h2>}
              {section.instructions && <MathText text={section.instructions} />}
            </div>
          )}
          {items.map((it) => (
            <div key={it.number} className={`print-item ${it.pageBreakBefore ? 'page-break' : ''}`}>
              <QuestionView q={it.q} number={it.number} points={it.points} showPoints={test.showPoints} mode={mode} version={v} showSolution={solutions} />
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
