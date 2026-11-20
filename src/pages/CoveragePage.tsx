import { ChevronDown, ChevronRight, FilePlus2, Library, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { LessonChips } from '../components/QuestionRow'
import { generators, questionTypes } from '../gen'
import { catalog, type CoverageMode, coverageMode, GROUP_LABELS, type ProblemType } from '../lib/catalog'
import { href } from '../router'
import { useStore } from '../store/store'

const MODE_LABEL: Record<CoverageMode, string> = { generate: 'Generated', write: 'Write by hand', classroom: 'Classroom only' }

type Status = 'generator' | 'gap' | 'write' | 'classroom'

export function CoveragePage({ query }: { query: URLSearchParams }) {
  const questions = useStore((s) => s.questions)
  const tests = useStore((s) => s.tests)
  const [search, setSearch] = useState('')
  const [unit, setUnit] = useState('')
  const [group, setGroup] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState<string | null>(query.get('type'))

  const stats = useMemo(() => {
    const gens = new Map<string, string[]>()
    for (const g of generators) for (const t of g.types) gens.set(t, [...(gens.get(t) ?? []), g.id])
    const bank = new Map<string, number>()
    const qTypes = new Map<string, string[]>()
    for (const q of Object.values(questions)) {
      const ts = questionTypes(q)
      qTypes.set(q.id, ts)
      for (const t of ts) bank.set(t, (bank.get(t) ?? 0) + 1)
    }
    const onTests = new Map<string, number>()
    for (const t of Object.values(tests))
      for (const s of t.sections) for (const it of s.items) for (const ty of qTypes.get(it.questionId) ?? []) onTests.set(ty, (onTests.get(ty) ?? 0) + 1)
    return { gens, bank, onTests }
  }, [questions, tests])

  const statusOf = (t: ProblemType): Status => {
    const m = coverageMode(t)
    if (m === 'classroom') return 'classroom'
    if (stats.gens.get(t.id)?.length) return 'generator'
    return m === 'write' ? 'write' : 'gap'
  }

  const needle = search.trim().toLowerCase()
  const list = catalog.types.filter(
    (t) =>
      (!unit || t.units.includes(Number(unit))) &&
      (!group || t.group === group) &&
      (!status || (status === 'nobank' ? coverageMode(t) !== 'classroom' && !stats.bank.get(t.id) : statusOf(t) === status)) &&
      (!needle || `${t.id} ${t.name} ${t.task} ${t.lessons.join(' ')}`.toLowerCase().includes(needle)),
  )
  const counts = {
    total: catalog.types.length,
    generator: catalog.types.filter((t) => statusOf(t) === 'generator').length,
    gap: catalog.types.filter((t) => statusOf(t) === 'gap').length,
    write: catalog.types.filter((t) => statusOf(t) === 'write').length,
    classroom: catalog.types.filter((t) => statusOf(t) === 'classroom').length,
    inBank: catalog.types.filter((t) => stats.bank.get(t.id)).length,
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>
          Problem-type coverage <span className="count">{counts.total}</span>
        </h2>
        <span className="muted small">
          {catalog.title.replace(/ \(machine-readable\)/, '')} · v{catalog.version}
        </span>
      </div>

      <div className="cov-stats">
        <button type="button" className={`cov-stat ok ${status === 'generator' ? 'on' : ''}`} onClick={() => setStatus(status === 'generator' ? '' : 'generator')}>
          <strong>{counts.generator}</strong> have generators
        </button>
        <button type="button" className={`cov-stat bad ${status === 'gap' ? 'on' : ''}`} onClick={() => setStatus(status === 'gap' ? '' : 'gap')}>
          <strong>{counts.gap}</strong> gaps
        </button>
        <button type="button" className={`cov-stat ${status === 'write' ? 'on' : ''}`} onClick={() => setStatus(status === 'write' ? '' : 'write')}>
          <strong>{counts.write}</strong> write by hand
        </button>
        <button type="button" className={`cov-stat ${status === 'classroom' ? 'on' : ''}`} onClick={() => setStatus(status === 'classroom' ? '' : 'classroom')}>
          <strong>{counts.classroom}</strong> classroom only
        </button>
        <button type="button" className={`cov-stat ${status === 'nobank' ? 'on' : ''}`} onClick={() => setStatus(status === 'nobank' ? '' : 'nobank')}>
          <strong>{counts.inBank}</strong> in your bank
        </button>
      </div>

      <div className="qfilters">
        <input type="search" className="search" data-page-search placeholder="Search types, tasks, lessons…   ( / )" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="chips">
          <button type="button" className={`chip-btn ${!unit ? 'on' : ''}`} onClick={() => setUnit('')}>
            All units
          </button>
          {[1, 2, 3, 4].map((u) => (
            <button key={u} type="button" className={`chip-btn u${u} ${unit === String(u) ? 'on' : ''}`} onClick={() => setUnit(unit === String(u) ? '' : String(u))}>
              U{u}
            </button>
          ))}
        </div>
        <select value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">All families</option>
          {catalog.groups.map((g) => (
            <option key={g.prefix} value={g.prefix}>
              {g.prefix} · {g.label}
            </option>
          ))}
        </select>
      </div>

      <div className="cov-list">
        {catalog.groups.map((g) => {
          const rows = list.filter((t) => t.group === g.prefix)
          if (!rows.length) return null
          return (
            <div key={g.prefix} className="cov-group">
              <div className="cov-group-head">
                <span className={`ptype-chip g-${g.prefix}`}>{g.prefix}</span> {GROUP_LABELS[g.prefix] ?? g.prefix}
                <span className="muted small">{rows.length}</span>
              </div>
              {rows.map((t) => {
                const st = statusOf(t)
                const isOpen = open === t.id
                const gens = stats.gens.get(t.id) ?? []
                return (
                  <div key={t.id} className={`cov-row-wrap ${isOpen ? 'open' : ''}`}>
                    <div className="cov-row" onClick={() => setOpen(isOpen ? null : t.id)}>
                      {isOpen ? <ChevronDown size={13} className="muted" /> : <ChevronRight size={13} className="muted" />}
                      <span className="cov-id">{t.id}</span>
                      <span className="cov-name">{t.name}</span>
                      <LessonChips codes={t.lessons} max={3} />
                      <span className={`cov-status s-${st}`}>{st === 'generator' ? `${gens.length} generator${gens.length > 1 ? 's' : ''}` : st === 'gap' ? 'gap' : MODE_LABEL[coverageMode(t)]}</span>
                      <span className="cov-num" title="Questions in your bank">
                        <Library size={12} /> {stats.bank.get(t.id) ?? 0}
                      </span>
                      <span className="cov-num" title="Uses on tests">
                        {stats.onTests.get(t.id) ?? 0} on tests
                      </span>
                    </div>
                    {isOpen && <TypeDetail t={t} gens={gens} />}
                  </div>
                )
              })}
            </div>
          )
        })}
        {list.length === 0 && <div className="empty small">No types match.</div>}
      </div>
    </div>
  )
}

function TypeDetail({ t, gens }: { t: ProblemType; gens: string[] }) {
  const firstLesson = t.lessons[0]
  const seen = [
    ['Decks', t.seenIn.decks],
    ['Homework', t.seenIn.homework],
    ['Assessments', t.seenIn.assessments],
  ] as const
  return (
    <div className="cov-detail">
      <p>{t.task}</p>
      <div className="cov-grid">
        <div>
          <span className="field-label">Formats</span> {t.formats.map((f) => f.replace(/_/g, ' ')).join(' · ')}
        </div>
        <div>
          <span className="field-label">Answer format</span> {t.answerFormat}
        </div>
        {t.figure && (
          <div>
            <span className="field-label">Figure</span> {t.figure}
          </div>
        )}
        {t.scoring && (
          <div>
            <span className="field-label">Scoring</span> {t.scoring}
          </div>
        )}
        {t.misconceptions.length > 0 && (
          <div>
            <span className="field-label">Misconceptions / distractors</span>
            <ul>
              {t.misconceptions.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        {(t.notes || t.honors || t.algebraFoldIn) && (
          <div>
            <span className="field-label">Notes</span> {[t.notes, t.honors && `Honors: ${t.honors}`, t.algebraFoldIn && `Algebra: ${t.algebraFoldIn}`].filter(Boolean).join(' ')}
          </div>
        )}
        {seen.map(([k, v]) =>
          v.length ? (
            <div key={k}>
              <span className="field-label">Seen in: {k}</span>
              <ul>
                {v.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
      </div>
      <div className="row wrap">
        {gens.map((id) => (
          <a key={id} className="button small" href={href(`/generate?gen=${id}`)}>
            <Sparkles size={13} /> {generators.find((g) => g.id === id)?.title}
          </a>
        ))}
        <a className="button small" href={href(`/q/new?ptype=${t.id}${firstLesson ? `&lesson=${firstLesson}` : ''}&return=${encodeURIComponent(`/coverage?type=${t.id}`)}`)}>
          <FilePlus2 size={13} /> Write a question of this type
        </a>
        <a className="button small ghost" href={href(`/bank?ptype=${t.id}`)}>
          <Library size={13} /> Bank questions
        </a>
      </div>
    </div>
  )
}
