import { useMemo, useState } from 'react'
import { compareCodes, courseMap, type Lesson, lessonKeywords } from '../lib/courseMap'

/** Multi-select of course lessons, grouped by unit and section, with search over all topic keywords. */
export function TopicPicker({
  value,
  onChange,
  maxUnit,
}: {
  value: string[]
  onChange: (codes: string[]) => void
  /** Only show units up to this number. */
  maxUnit?: number
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<number | null>(() => {
    const first = value[0] ? courseMap.byCode.get(value[0]) : undefined
    return first?.unit ?? null
  })
  const q = query.trim().toLowerCase()
  const matches = useMemo(() => {
    if (!q) return null
    return new Set(courseMap.lessons.filter((l) => matchesLesson(l, q)).map((l) => l.code))
  }, [q])

  const toggle = (code: string) => {
    const next = value.includes(code) ? value.filter((c) => c !== code) : [...value, code]
    onChange(next.sort(compareCodes))
  }

  return (
    <div className="topic-picker">
      <div className="tp-selected">
        {value.length === 0 && <span className="muted">No lessons selected</span>}
        {value.map((c) => (
          <button key={c} type="button" className="chip" onClick={() => toggle(c)} title="Remove">
            {c} {courseMap.byCode.get(c)?.title ?? ''} ×
          </button>
        ))}
      </div>
      <input
        type="search"
        placeholder="Search topics, theorems, terms… (e.g. “midsegment”, “law of sines”)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="tp-units">
        {courseMap.units
          .filter((u) => !maxUnit || u.unit <= maxUnit)
          .map((u) => {
            const lessons = u.sections.flatMap((s) => s.lessons)
            const visible = matches ? lessons.filter((l) => matches.has(l.code)) : lessons
            if (matches && visible.length === 0) return null
            const isOpen = !!matches || open === u.unit
            const count = lessons.filter((l) => value.includes(l.code)).length
            return (
              <div key={u.unit} className="tp-unit">
                <button type="button" className="tp-unit-head" onClick={() => setOpen(isOpen && !matches ? null : u.unit)}>
                  <span>{isOpen ? '▾' : '▸'}</span> Unit {u.unit}: {u.title}
                  {count > 0 && <span className="badge">{count}</span>}
                </button>
                {isOpen &&
                  u.sections.map((s) => {
                    const ls = s.lessons.filter((l) => !matches || matches.has(l.code))
                    if (!ls.length) return null
                    return (
                      <div key={s.letter} className="tp-section">
                        <div className="tp-section-title">
                          {u.unit}
                          {s.letter}. {s.title}
                        </div>
                        {ls.map((l) => (
                          <label key={l.code} className="tp-lesson" title={lessonKeywords(l).slice(1).join(' · ')}>
                            <input type="checkbox" checked={value.includes(l.code)} onChange={() => toggle(l.code)} />
                            <span className="code">{l.code}</span> {l.title}
                            {l.optional && <span className="tag">optional</span>}
                            {l.source === 'teacher-addition' && <span className="tag">teacher addition</span>}
                            {matches && <LessonHit l={l} q={q} />}
                          </label>
                        ))}
                      </div>
                    )
                  })}
              </div>
            )
          })}
      </div>
    </div>
  )
}

function matchesLesson(l: Lesson, q: string): boolean {
  if (l.code.toLowerCase() === q) return true
  return lessonKeywords(l).some((k) => k.toLowerCase().includes(q))
}

function LessonHit({ l, q }: { l: Lesson; q: string }) {
  const hit = lessonKeywords(l)
    .slice(1)
    .find((k) => k.toLowerCase().includes(q))
  return hit ? <span className="tp-hit">— {hit}</span> : null
}

/** Short display of lesson codes. */
export function LessonCodes({ codes }: { codes: string[] }) {
  return (
    <span className="lesson-codes">
      {codes.map((c) => (
        <span key={c} className="code-chip" title={courseMap.byCode.get(c)?.title}>
          {c}
        </span>
      ))}
    </span>
  )
}
