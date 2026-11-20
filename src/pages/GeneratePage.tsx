import { useMemo, useState } from 'react'
import { DebugTag } from '../components/DebugTag'
import { parseDebugCode } from '../gen/debugCode'
import { QuestionView } from '../components/QuestionView'
import { LessonCodes } from '../components/TopicPicker'
import { firstLesson, generatorById, generators, newQuestionFromGenerator, runGenerator, supportsMC, unitOf } from '../gen'
import type { Generator } from '../gen/types'
import { compareCodes, courseMap } from '../lib/courseMap'
import { randomSeed } from '../lib/rng'
import type { Question } from '../model/types'
import { navigate } from '../router'
import { addQuestionsToTest, newTest, saveQuestions, saveTest, uid, useStore } from '../store/store'

export function GeneratePage({ query }: { query: URLSearchParams }) {
  const [unit, setUnit] = useState(() => {
    const l = query.get('lesson')
    return l ? String(courseMap.byCode.get(l)?.unit ?? '') : ''
  })
  const [lesson, setLesson] = useState(query.get('lesson') ?? '')
  const [search, setSearch] = useState('')
  const codeParam = query.get('code')
  const parsed = codeParam ? parseDebugCode(codeParam) : null
  const fromCode = parsed?.kind === 'generated' ? parsed : null
  const [genId, setGenId] = useState<string | null>(fromCode?.generatorId ?? query.get('gen'))
  const targetTest = query.get('test')

  const list = useMemo(() => {
    const s = search.trim().toLowerCase()
    return generators
      .filter((g) => (!unit || unitOf(g) === Number(unit) || g.lessons.some((c) => courseMap.byCode.get(c)?.unit === Number(unit))))
      .filter((g) => !lesson || g.lessons.includes(lesson))
      .filter((g) => !s || `${g.title} ${g.description} ${g.lessons.join(' ')}`.toLowerCase().includes(s))
      .sort((a, b) => compareCodes(firstLesson(a), firstLesson(b)))
  }, [unit, lesson, search])

  const unitLessons = unit ? courseMap.units.find((u) => u.unit === Number(unit))?.sections.flatMap((s) => s.lessons) ?? [] : []
  const gen = genId ? generatorById.get(genId) : undefined

  return (
    <div className="page">
      <div className="page-head">
        <h2>Generate problems</h2>
        <CodeLookup initial={codeParam ?? ''} error={codeParam && !parsed ? 'Not a valid debug code.' : parsed?.kind === 'question' ? 'That code is for a hand-written question.' : ''} />
        {targetTest && <span className="tag">Adding to a test</span>}
      </div>
      <div className="gen-layout">
        <aside className="gen-list">
          <div className="filters vertical">
            <input type="search" placeholder="Search generators…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value)
                setLesson('')
              }}
            >
              <option value="">Units 1–4</option>
              {courseMap.units
                .filter((u) => u.unit <= 4)
                .map((u) => (
                  <option key={u.unit} value={u.unit}>
                    Unit {u.unit}: {u.title}
                  </option>
                ))}
            </select>
            {unit && (
              <select value={lesson} onChange={(e) => setLesson(e.target.value)}>
                <option value="">All lessons in Unit {unit}</option>
                {unitLessons.map((l) => {
                  const n = generators.filter((g) => g.lessons.includes(l.code)).length
                  return (
                    <option key={l.code} value={l.code} disabled={n === 0}>
                      {l.code} {l.title} ({n})
                    </option>
                  )
                })}
              </select>
            )}
          </div>
          <ul>
            {list.map((g) => (
              <li key={g.id}>
                <button type="button" className={g.id === genId ? 'active' : ''} onClick={() => setGenId(g.id)}>
                  <span className="gen-title">{g.title}</span>
                  <span className="gen-meta">
                    <LessonCodes codes={g.lessons} />
                    {g.honors && <span className="tag honors">honors</span>}
                  </span>
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="muted">No generators match.</li>}
          </ul>
        </aside>
        <section className="gen-detail">{gen ? <GeneratorPanel key={`${gen.id}-${codeParam ?? ''}`} g={gen} targetTest={targetTest} fromCode={fromCode && fromCode.generatorId === gen.id ? fromCode : null} /> : <p className="muted">Choose a problem type on the left.</p>}</section>
      </div>
    </div>
  )
}

function GeneratorPanel({
  g,
  targetTest,
  fromCode,
}: {
  g: Generator
  targetTest: string | null
  fromCode: { seed: number; options: Record<string, string> } | null
}) {
  const [opts, setOpts] = useState<Record<string, string>>(() => {
    const defaults = Object.fromEntries((g.options ?? []).map((o) => [o.key, o.default]))
    if (!fromCode) return defaults
    const { format: _f, ...rest } = fromCode.options
    void _f
    return { ...defaults, ...rest }
  })
  const [format, setFormat] = useState<'native' | 'mc'>(fromCode?.options.format === 'mc' ? 'mc' : 'native')
  const [count, setCount] = useState(fromCode ? 1 : 3)
  const [seeds, setSeeds] = useState<number[]>(() => (fromCode ? [fromCode.seed] : Array.from({ length: 3 }, randomSeed)))
  const [showKey, setShowKey] = useState(false)
  const tests = useStore((s) => s.tests)
  const fullOpts = { ...opts, ...(format === 'mc' ? { format: 'mc' } : {}) }

  const canMC = useMemo(() => {
    try {
      return supportsMC(runGenerator(g, 1, opts))
    } catch {
      return false
    }
  }, [g, opts])

  const samples: Question[] = useMemo(
    () => seeds.map((seed) => newQuestionFromGenerator(g, seed, fullOpts, `preview-${seed}`)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [g, seeds, JSON.stringify(fullOpts)],
  )

  const reroll = (i?: number) => setSeeds((s) => s.map((x, j) => (i === undefined || i === j ? randomSeed() : x)))

  const add = (indices: number[], testId?: string | null) => {
    const qs = indices.map((i) => ({ ...samples[i], id: uid() }))
    saveQuestions(qs)
    if (testId) {
      if (testId === '__new') {
        const t = newTest()
        saveTest(t)
        testId = t.id
      }
      addQuestionsToTest(testId, qs.map((q) => q.id))
      navigate(`/test/${testId}`)
      return
    }
    // Replace added samples with fresh ones so the teacher can keep going.
    setSeeds((s) => s.map((x, j) => (indices.includes(j) ? randomSeed() : x)))
  }

  return (
    <div>
      <h3>{g.title}</h3>
      <p>{g.description}</p>
      <p className="muted">
        Lessons:{' '}
        {g.lessons.map((c) => (
          <span key={c}>
            {c} {courseMap.byCode.get(c)?.title}
            {'; '}
          </span>
        ))}
      </p>
      <div className="row wrap gen-options">
        {(g.options ?? []).map((o) => (
          <label key={o.key}>
            {o.label}{' '}
            <select value={opts[o.key]} onChange={(e) => setOpts({ ...opts, [o.key]: e.target.value })}>
              {o.choices.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        {canMC && (
          <label>
            Format{' '}
            <select value={format} onChange={(e) => setFormat(e.target.value as 'native' | 'mc')}>
              <option value="native">As written</option>
              <option value="mc">Multiple choice</option>
            </select>
          </label>
        )}
        <label>
          How many{' '}
          <select
            value={count}
            onChange={(e) => {
              const n = Number(e.target.value)
              setCount(n)
              setSeeds((s) => (n > s.length ? [...s, ...Array.from({ length: n - s.length }, randomSeed)] : s.slice(0, n)))
            }}
          >
            {[1, 2, 3, 4, 6, 8, 10].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={showKey} onChange={(e) => setShowKey(e.target.checked)} /> Show answers
        </label>
      </div>
      <div className="row wrap">
        <button type="button" onClick={() => reroll()}>
          ↻ New numbers for all
        </button>
        {targetTest ? (
          <button type="button" className="primary" onClick={() => add(samples.map((_, i) => i), targetTest)}>
            Add all {samples.length} to the test
          </button>
        ) : (
          <>
            <button type="button" className="primary" onClick={() => add(samples.map((_, i) => i))}>
              Add all {samples.length} to bank
            </button>
            <select value="" onChange={(e) => e.target.value && add(samples.map((_, i) => i), e.target.value)}>
              <option value="">Add all to a test…</option>
              <option value="__new">+ New test</option>
              {Object.values(tests)
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
          </>
        )}
      </div>
      <div className="samples">
        {samples.map((q, i) => (
          <div key={seeds[i]} className="sample">
            <div className="paper">
              <QuestionView q={q} number={i + 1} mode={showKey ? 'key' : 'student'} showSolution={showKey} />
            </div>
            <div className="sample-actions">
              <DebugTag q={q} />
              <button type="button" onClick={() => reroll(i)}>
                ↻ Re-roll
              </button>
              <button type="button" onClick={() => add([i], targetTest)}>
                {targetTest ? 'Add to test' : 'Add to bank'}
              </button>
              {!targetTest && (
                <button
                  type="button"
                  onClick={() => {
                    const q = { ...samples[i], id: uid() }
                    saveQuestions([q])
                    navigate(`/q/${q.id}?return=${encodeURIComponent('/generate')}`)
                  }}
                >
                  Add & edit
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Paste a debug code to reproduce the exact question it came from. */
function CodeLookup({ initial, error }: { initial: string; error: string }) {
  const [code, setCode] = useState(initial)
  const questions = useStore((st) => st.questions)
  const go = () => {
    const c = code.trim()
    const p = parseDebugCode(c)
    if (p?.kind === 'question') {
      if (questions[p.id]) navigate(`/q/${p.id}?return=${encodeURIComponent('/generate')}`)
      else alert('No question with that id is in this browser’s bank.')
      return
    }
    navigate(`/generate?code=${encodeURIComponent(c)}`)
  }
  return (
    <form
      className="code-lookup"
      onSubmit={(e) => {
        e.preventDefault()
        go()
      }}
    >
      <input value={code} placeholder="Look up a debug code (G:… or Q:…)" onChange={(e) => setCode(e.target.value)} />
      <button type="submit">Look up</button>
      {error && <span className="tag warn">{error}</span>}
    </form>
  )
}
