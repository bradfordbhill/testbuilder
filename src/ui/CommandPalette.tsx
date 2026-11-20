import {
  BookOpen,
  CornerDownLeft,
  FilePlus2,
  FileText,
  Hash,
  Keyboard,
  Library,
  ListChecks,
  Printer,
  Search,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { promptSummary } from '../components/QuestionView'
import { generators } from '../gen'
import { parseDebugCode } from '../gen/debugCode'
import { courseMap } from '../lib/courseMap'
import { QUESTION_TYPE_LABELS, type QuestionType } from '../model/types'
import { navigate } from '../router'
import { newTest, saveTest, useStore } from '../store/store'
import { toast } from './toast'

// ---------------------------------------------------------------- open / close

let open = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
export const openPalette = () => {
  open = true
  emit()
}
export const closePalette = () => {
  open = false
  emit()
}
export const usePaletteOpen = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => open,
  )

let helpOpen = false
const helpListeners = new Set<() => void>()
export const setHelpOpen = (v: boolean) => {
  helpOpen = v
  helpListeners.forEach((l) => l())
}
export const useHelpOpen = () =>
  useSyncExternalStore(
    (l) => {
      helpListeners.add(l)
      return () => helpListeners.delete(l)
    },
    () => helpOpen,
  )

// ---------------------------------------------------------------- commands

interface Command {
  id: string
  group: string
  label: string
  hint?: string
  keywords?: string
  icon: ReactNode
  run: () => void
}

function score(c: Command, words: string[]): number {
  if (!words.length) return 1
  const hay = `${c.label} ${c.hint ?? ''} ${c.keywords ?? ''}`.toLowerCase()
  let s = 0
  for (const w of words) {
    const i = hay.indexOf(w)
    if (i < 0) return 0
    s += i === 0 ? 3 : hay[i - 1] === ' ' ? 2 : 1
  }
  if (c.label.toLowerCase().startsWith(words.join(' '))) s += 5
  return s
}

const GROUP_ORDER = ['Debug code', 'Actions', 'Go to', 'Tests', 'Generators', 'Questions', 'Lessons']

export function CommandPalette() {
  const isOpen = usePaletteOpen()
  if (!isOpen) return null
  return <PaletteBody />
}

function PaletteBody() {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const tests = useStore((s) => s.tests)
  const questions = useStore((s) => s.questions)

  useEffect(() => inputRef.current?.focus(), [])

  const commands = useMemo<Command[]>(() => {
    const go = (to: string) => () => navigate(to)
    const out: Command[] = [
      { id: 'nav-bank', group: 'Go to', label: 'Question bank', hint: 'B', icon: <Library size={15} />, run: go('/bank') },
      { id: 'nav-gen', group: 'Go to', label: 'Generate problems', hint: 'G', icon: <Wand2 size={15} />, run: go('/generate') },
      { id: 'nav-tests', group: 'Go to', label: 'Tests', hint: 'T', icon: <ListChecks size={15} />, run: go('/tests') },
      { id: 'nav-course', group: 'Go to', label: 'Course topics', hint: 'C', icon: <BookOpen size={15} />, run: go('/course') },
      {
        id: 'new-test',
        group: 'Actions',
        label: 'New test',
        icon: <FilePlus2 size={15} />,
        run: () => {
          const t = newTest()
          saveTest(t)
          navigate(`/test/${t.id}`)
        },
      },
      ...(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => ({
        id: `new-${t}`,
        group: 'Actions',
        label: `New question: ${QUESTION_TYPE_LABELS[t]}`,
        hint: t === 'short' ? 'N' : undefined,
        keywords: 'add write create',
        icon: <FilePlus2 size={15} />,
        run: go(`/q/new?type=${t}`),
      })),
      { id: 'help', group: 'Actions', label: 'Keyboard shortcuts', hint: '?', icon: <Keyboard size={15} />, run: () => setHelpOpen(true) },
    ]
    for (const t of Object.values(tests).sort((a, b) => b.updatedAt - a.updatedAt)) {
      out.push({ id: `test-${t.id}`, group: 'Tests', label: t.title, hint: 'open', keywords: `test quiz ${t.subtitle ?? ''}`, icon: <ListChecks size={15} />, run: go(`/test/${t.id}`) })
      out.push({ id: `print-${t.id}`, group: 'Tests', label: `Print ${t.title}`, hint: 'print', keywords: 'pdf answer key', icon: <Printer size={15} />, run: go(`/print/${t.id}`) })
    }
    for (const g of generators) {
      out.push({
        id: `gen-${g.id}`,
        group: 'Generators',
        label: g.title,
        hint: g.lessons.join(' '),
        keywords: `generate random ${g.description}`,
        icon: <Sparkles size={15} />,
        run: go(`/generate?gen=${g.id}`),
      })
    }
    for (const l of courseMap.lessons) {
      out.push({
        id: `lesson-${l.code}`,
        group: 'Lessons',
        label: `${l.code} ${l.title}`,
        hint: 'new question',
        keywords: [...l.topics, ...l.newTerms, ...l.theorems].join(' '),
        icon: <Hash size={15} />,
        run: go(`/q/new?lesson=${l.code}`),
      })
    }
    return out
  }, [tests])

  const results = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const code = parseDebugCode(q)
    const list: (Command & { s: number })[] = []
    if (code) {
      list.push({
        id: 'code',
        group: 'Debug code',
        label: `Look up ${q.trim()}`,
        icon: <Hash size={15} />,
        s: 100,
        run: () => {
          if (code.kind === 'question') {
            if (questions[code.id]) navigate(`/q/${code.id}`)
            else toast('No question with that id in this browser’s bank.', { kind: 'error' })
          } else navigate(`/generate?code=${encodeURIComponent(q.trim())}`)
        },
      })
    }
    for (const c of commands) {
      // Lessons only appear once the user types something.
      if (c.group === 'Lessons' && !words.length) continue
      if (c.group === 'Tests' && c.id.startsWith('print-') && !words.length) continue
      const s = score(c, words)
      if (s > 0) list.push({ ...c, s })
    }
    if (words.length >= 1 && q.trim().length >= 2) {
      for (const qu of Object.values(questions)) {
        const c: Command = {
          id: `q-${qu.id}`,
          group: 'Questions',
          label: promptSummary(qu, 90) || '(no prompt)',
          hint: qu.lessons.join(' '),
          keywords: `${qu.type} ${(qu.tags ?? []).join(' ')}`,
          icon: <FileText size={15} />,
          run: () => navigate(`/q/${qu.id}`),
        }
        const s = score(c, words)
        if (s > 0) list.push({ ...c, s })
      }
    }
    // Rank within groups, keep groups in a fixed order, cap the list.
    list.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || b.s - a.s)
    const capped: typeof list = []
    const perGroup = new Map<string, number>()
    for (const c of list) {
      const n = perGroup.get(c.group) ?? 0
      if (n >= (words.length ? 8 : 6)) continue
      perGroup.set(c.group, n + 1)
      capped.push(c)
    }
    return capped
  }, [q, commands, questions])

  useEffect(() => setActive(0), [q])
  useEffect(() => {
    listRef.current?.querySelector('.pal-item.active')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const run = (c: Command) => {
    closePalette()
    c.run()
  }

  let lastGroup = ''
  return (
    <div className="modal-backdrop cmdk-backdrop" onMouseDown={closePalette}>
      <div className="cmdk" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
        <div className="pal-input">
          <Search size={16} />
          <input
            ref={inputRef}
            value={q}
            placeholder="Search tests, generators, lessons, questions… or paste a debug code"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(a + 1, results.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                if (results[active]) run(results[active])
              } else if (e.key === 'Escape') {
                e.preventDefault()
                closePalette()
              }
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="pal-list" ref={listRef}>
          {results.length === 0 && <div className="pal-empty">No matches.</div>}
          {results.map((c, i) => {
            const header = c.group !== lastGroup ? c.group : null
            lastGroup = c.group
            return (
              <div key={c.id}>
                {header && <div className="pal-group">{header}</div>}
                <button
                  type="button"
                  className={`pal-item ${i === active ? 'active' : ''}`}
                  onMouseMove={() => setActive(i)}
                  onClick={() => run(c)}
                >
                  <span className="pal-icon">{c.icon}</span>
                  <span className="pal-label">{c.label}</span>
                  {c.hint && <span className="pal-hint">{c.hint}</span>}
                  {i === active && <CornerDownLeft size={13} className="pal-enter" />}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
