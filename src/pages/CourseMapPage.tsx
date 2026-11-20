import { useMemo, useState } from 'react'
import { generatorsForLesson } from '../gen'
import { courseMap, type Lesson, lessonKeywords } from '../lib/courseMap'
import { href } from '../router'
import { useStore } from '../store/store'

export function CourseMapPage() {
  const questions = useStore((s) => s.questions)
  const [q, setQ] = useState('')
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const x of Object.values(questions)) for (const c of x.lessons) m.set(c, (m.get(c) ?? 0) + 1)
    return m
  }, [questions])
  const needle = q.trim().toLowerCase()
  const match = (l: Lesson) => !needle || l.code.toLowerCase() === needle || lessonKeywords(l).some((k) => k.toLowerCase().includes(needle))

  return (
    <div className="page">
      <div className="page-head">
        <h2>
          {courseMap.name} {courseMap.year}: course topics
        </h2>
        <input type="search" placeholder="Search topics, terms, theorems…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <details className="notation">
        <summary>Notation and language conventions</summary>
        <ul>
          {courseMap.notation.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </details>
      {courseMap.units.map((u) => {
        const lessons = u.sections.flatMap((s) => s.lessons).filter(match)
        if (!lessons.length) return null
        return (
          <section key={u.unit} className="cm-unit">
            <h3>
              Unit {u.unit}: {u.title}
            </h3>
            <div className="muted">{u.status}</div>
            {u.topics.length > 0 && <div className="cm-topics">Topics: {u.topics.join(' · ')}</div>}
            {u.sections.map((s) => {
              const ls = s.lessons.filter(match)
              if (!ls.length) return null
              return (
                <div key={s.letter} className="cm-section">
                  <h4>
                    {u.unit}
                    {s.letter}. {s.title}
                  </h4>
                  <table className="table cm-table">
                    <tbody>
                      {ls.map((l) => {
                        const gens = generatorsForLesson(l.code)
                        const n = counts.get(l.code) ?? 0
                        return (
                          <tr key={l.code}>
                            <td className="code">{l.code}</td>
                            <td>
                              <strong>{l.title}</strong>
                              {l.optional && <span className="tag">optional</span>}
                              {l.source === 'teacher-addition' && <span className="tag">teacher addition</span>}
                              <LessonDetail l={l} />
                            </td>
                            <td className="nowrap cm-actions">
                              {gens.length > 0 && <a href={href(`/generate?lesson=${l.code}`)}>{gens.length} generator{gens.length > 1 ? 's' : ''}</a>}
                              <a href={href(`/q/new?lesson=${l.code}&return=${encodeURIComponent('/course')}`)}>+ question</a>
                              {n > 0 && <span className="muted">{n} in bank</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}

function LessonDetail({ l }: { l: Lesson }) {
  const rows: [string, string[]][] = [
    ['Topics', l.topics],
    ['New terms', l.newTerms],
    ['Theorems', l.theorems],
    ['Skills', l.skills],
    ['Honors', l.honors],
  ]
  return (
    <div className="cm-detail">
      {rows
        .filter(([, v]) => v.length)
        .map(([k, v]) => (
          <div key={k}>
            <span className="muted">{k}:</span> {v.join('; ')}
          </div>
        ))}
    </div>
  )
}
