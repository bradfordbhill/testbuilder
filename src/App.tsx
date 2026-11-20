import { BankPage } from './pages/BankPage'
import { CourseMapPage } from './pages/CourseMapPage'
import { GeneratePage } from './pages/GeneratePage'
import { PrintView } from './pages/PrintView'
import { QuestionEditor } from './pages/QuestionEditor'
import { TestBuilder, TestsPage } from './pages/TestPages'
import { href, useRoute } from './router'

const NAV = [
  { to: '/bank', label: 'Question bank', match: ['bank', 'q', ''] },
  { to: '/generate', label: 'Generate', match: ['generate'] },
  { to: '/tests', label: 'Tests', match: ['tests', 'test', 'print'] },
  { to: '/course', label: 'Course topics', match: ['course'] },
]

export default function App() {
  const route = useRoute()
  const [page, arg] = route.path
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
      body = <TestBuilder id={arg} />
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
        <span className="brand">Geometry Test Builder</span>
        {NAV.map((n) => (
          <a key={n.to} href={href(n.to)} className={n.match.includes(page ?? '') ? 'active' : ''}>
            {n.label}
          </a>
        ))}
      </nav>
      <main>{body}</main>
    </div>
  )
}
