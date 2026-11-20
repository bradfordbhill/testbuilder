import { BookOpen, Keyboard, Library, ListChecks, Search, Shapes, Wand2 } from 'lucide-react'
import { BankPage } from './pages/BankPage'
import { CourseMapPage } from './pages/CourseMapPage'
import { GeneratePage } from './pages/GeneratePage'
import { PrintView } from './pages/PrintView'
import { QuestionEditor } from './pages/QuestionEditor'
import { TestBuilder, TestsPage } from './pages/TestPages'
import { href, navigate, useRoute } from './router'
import { CommandPalette, openPalette, setHelpOpen, usePaletteOpen } from './ui/CommandPalette'
import { DialogHost } from './ui/dialog'
import { ShortcutHelp } from './ui/ShortcutHelp'
import { useShortcuts } from './ui/shortcuts'
import { Toaster } from './ui/toast'

const NAV = [
  { to: '/bank', label: 'Bank', key: 'B', icon: Library, match: ['bank', 'q', ''] },
  { to: '/generate', label: 'Generate', key: 'G', icon: Wand2, match: ['generate'] },
  { to: '/tests', label: 'Tests', key: 'T', icon: ListChecks, match: ['tests', 'test', 'print'] },
  { to: '/course', label: 'Topics', key: 'C', icon: BookOpen, match: ['course'] },
]

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export default function App() {
  const route = useRoute()
  const paletteOpen = usePaletteOpen()
  const [page, arg] = route.path

  useShortcuts({
    'ctrl+k': () => openPalette(),
    '?': () => setHelpOpen(true),
    b: () => navigate('/bank'),
    g: () => navigate('/generate'),
    t: () => navigate('/tests'),
    c: () => navigate('/course'),
    n: () => navigate('/q/new'),
    '/': () => {
      const el = document.querySelector<HTMLInputElement>('[data-page-search]')
      if (!el) return false
      el.focus()
      el.select()
    },
  }, !paletteOpen)

  let body
  switch (page) {
    case 'q':
      body = <QuestionEditor key={`${arg}-${route.query.toString()}`} id={arg ?? 'new'} query={route.query} />
      break
    case 'generate':
      body = <GeneratePage key={route.query.toString()} query={route.query} />
      break
    case 'tests':
      body = <TestsPage />
      break
    case 'test':
      body = <TestBuilder key={arg} id={arg} />
      break
    case 'print':
      body = <PrintView id={arg} />
      break
    case 'course':
      body = <CourseMapPage />
      break
    default:
      body = <BankPage />
  }
  return (
    <div className="app">
      <nav className="topnav no-print">
        <a className="brand" href={href('/bank')}>
          <Shapes size={17} /> Test Builder
        </a>
        <div className="nav-links">
          {NAV.map((n) => (
            <a key={n.to} href={href(n.to)} className={n.match.includes(page ?? '') ? 'active' : ''} title={`${n.label} (${n.key})`}>
              <n.icon size={15} />
              {n.label}
            </a>
          ))}
        </div>
        <button type="button" className="cmdk-btn" onClick={openPalette}>
          <Search size={14} />
          <span>Search or run a command…</span>
          <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
        </button>
        <button type="button" className="icon-btn" title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts" onClick={() => setHelpOpen(true)}>
          <Keyboard size={16} />
        </button>
      </nav>
      <main>{body}</main>
      <CommandPalette />
      <ShortcutHelp />
      <DialogHost />
      <Toaster />
    </div>
  )
}
