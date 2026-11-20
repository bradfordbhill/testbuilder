import { AlignLeft, ArrowLeftRight, CircleDot, ListOrdered, PencilLine, ToggleLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { courseMap } from '../lib/courseMap'
import { type Question, QUESTION_TYPE_LABELS, type QuestionType } from '../model/types'
import { questionTypes } from '../gen'
import { DebugTag } from './DebugTag'
import { TypeChips } from './ProblemTypes'
import { promptSummary } from './QuestionView'

export const TYPE_ICONS: Record<QuestionType, typeof PencilLine> = {
  short: PencilLine,
  free: AlignLeft,
  proof: ListOrdered,
  tf: ToggleLeft,
  matching: ArrowLeftRight,
  mc: CircleDot,
}

export const TYPE_SHORT: Record<QuestionType, string> = {
  short: 'Short',
  free: 'Free',
  proof: 'Proof',
  tf: 'T/F',
  matching: 'Match',
  mc: 'MC',
}

export function TypeBadge({ type }: { type: QuestionType }) {
  const Icon = TYPE_ICONS[type]
  return (
    <span className="type-badge" title={QUESTION_TYPE_LABELS[type]}>
      <Icon size={12} />
      {TYPE_SHORT[type]}
    </span>
  )
}

export function LessonChips({ codes, max = 2 }: { codes: string[]; max?: number }) {
  return (
    <span className="lesson-chips">
      {codes.slice(0, max).map((c) => (
        <span key={c} className={`code-chip u${courseMap.byCode.get(c)?.unit ?? 0}`} title={courseMap.byCode.get(c)?.title}>
          {c}
        </span>
      ))}
      {codes.length > max && <span className="code-chip more">+{codes.length - max}</span>}
    </span>
  )
}

/** Dense one-line question row. Actions appear on hover. */
export function QuestionRow({
  q,
  lead,
  actions,
  trail,
  onClick,
  className = '',
  summaryLength = 160,
  showDebug = true,
}: {
  q: Question
  lead?: ReactNode
  actions?: ReactNode
  trail?: ReactNode
  onClick?: (e: React.MouseEvent) => void
  className?: string
  summaryLength?: number
  showDebug?: boolean
}) {
  return (
    <div className={`qrow ${className}`} onClick={onClick}>
      {lead}
      <LessonChips codes={q.lessons} />
      <TypeBadge type={q.type} />
      <span className="qrow-summary">
        {promptSummary(q, summaryLength) || <em className="muted">(no prompt)</em>}
        {q.diagram && <span className="mini-tag" title="Has a diagram">◭</span>}
        {q.honors && <span className="mini-tag honors">H</span>}
        {q.gen && <span className="mini-tag gen" title="Generated: new numbers per form">gen</span>}
      </span>
      <TypeChips ids={questionTypes(q)} max={1} />
      {trail}
      {showDebug && <DebugTag q={q} />}
      {actions && <span className="qrow-actions" onClick={(e) => e.stopPropagation()}>{actions}</span>}
    </div>
  )
}
