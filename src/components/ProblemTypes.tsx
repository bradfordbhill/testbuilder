import { useMemo, useState } from 'react'
import { catalog, GROUP_LABELS, typesForLessons } from '../lib/catalog'
import { href } from '../router'

/** Compact chips for catalog type ids (hover for the full name). */
export function TypeChips({ ids, max = 2, link }: { ids: string[]; max?: number; link?: boolean }) {
  if (!ids.length) return null
  return (
    <span className="ptype-chips">
      {ids.slice(0, max).map((id) =>
        link ? (
          <a key={id} className={`ptype-chip g-${id.split('.')[0]}`} href={href(`/coverage?type=${id}`)} title={catalog.byId.get(id)?.name} onClick={(e) => e.stopPropagation()}>
            {id}
          </a>
        ) : (
          <span key={id} className={`ptype-chip g-${id.split('.')[0]}`} title={catalog.byId.get(id)?.name}>
            {id}
          </span>
        ),
      )}
      {ids.length > max && (
        <span className="ptype-chip more" title={ids.slice(max).join(', ')}>
          +{ids.length - max}
        </span>
      )}
    </span>
  )
}

/** Select catalog types for a question: suggestions from its lessons first, then search everything. */
export function ProblemTypePicker({
  value,
  lessons,
  onChange,
  inherited,
}: {
  value: string[]
  lessons: string[]
  onChange: (ids: string[]) => void
  /** Types that apply when nothing is chosen (e.g. from the generator). */
  inherited?: string[]
}) {
  const [q, setQ] = useState('')
  const suggested = useMemo(() => typesForLessons(lessons), [lessons])
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  const needle = q.trim().toLowerCase()
  const results = needle
    ? catalog.types.filter((t) => `${t.id} ${t.name} ${t.task}`.toLowerCase().includes(needle)).slice(0, 12)
    : []
  return (
    <div className="ptype-picker">
      {inherited && value.length === 0 && inherited.length > 0 && <div className="muted small">From the generator: {inherited.join(', ')}</div>}
      {suggested.length > 0 && (
        <div className="ptype-suggest">
          <span className="field-label">Seen in these lessons</span>
          <div className="chips">
            {suggested.map((id) => (
              <button key={id} type="button" className={`chip-btn ${value.includes(id) ? 'on' : ''}`} title={catalog.byId.get(id)?.name} onClick={() => toggle(id)}>
                {catalog.byId.get(id)?.name ?? id}
              </button>
            ))}
          </div>
        </div>
      )}
      {value.filter((v) => !suggested.includes(v)).length > 0 && (
        <div className="chips">
          {value
            .filter((v) => !suggested.includes(v))
            .map((id) => (
              <button key={id} type="button" className="chip-btn on" onClick={() => toggle(id)} title="Remove">
                {catalog.byId.get(id)?.name ?? id} ×
              </button>
            ))}
        </div>
      )}
      <input type="search" placeholder="Search all 85 problem types…" value={q} onChange={(e) => setQ(e.target.value)} />
      {results.length > 0 && (
        <div className="ptype-results">
          {results.map((t) => (
            <label key={t.id} className="tp-lesson">
              <input type="checkbox" checked={value.includes(t.id)} onChange={() => toggle(t.id)} />
              <span className={`ptype-chip g-${t.group}`}>{t.id}</span> {t.name}
              <span className="muted small">{GROUP_LABELS[t.group]}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
