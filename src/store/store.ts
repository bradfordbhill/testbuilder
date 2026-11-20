// Tiny persistent store (localStorage) with a React hook.
import { useSyncExternalStore } from 'react'
import type { AppData, Question, Test } from '../model/types'

const KEY = 'testbuilder.data.v1'

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const d = JSON.parse(raw) as AppData
      if (d && d.version === 1) return { version: 1, questions: d.questions ?? {}, tests: d.tests ?? {} }
    }
  } catch {
    // ignore corrupt storage
  }
  return { version: 1, questions: {}, tests: {} }
}

let state: AppData = typeof localStorage === 'undefined' ? { version: 1, questions: {}, tests: {} } : load()
const listeners = new Set<() => void>()
let saveTimer: ReturnType<typeof setTimeout> | null = null

function emit() {
  listeners.forEach((l) => l())
  if (typeof localStorage === 'undefined') return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch (e) {
      console.error('Could not save', e)
      alert('Could not save to browser storage (it may be full). Export your bank as JSON to keep a copy.')
    }
  }, 150)
}

export function getState(): AppData {
  return state
}

export function setState(fn: (s: AppData) => AppData) {
  state = fn(state)
  emit()
}

export function useStore<T>(select: (s: AppData) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => select(state),
  )
}

export const uid = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)).slice(0, 12)

// ---------------------------------------------------------------- questions

export function saveQuestion(q: Question) {
  setState((s) => ({ ...s, questions: { ...s.questions, [q.id]: { ...q, updatedAt: Date.now() } } }))
}

export function saveQuestions(qs: Question[]) {
  setState((s) => {
    const questions = { ...s.questions }
    for (const q of qs) questions[q.id] = q
    return { ...s, questions }
  })
}

export function deleteQuestion(id: string) {
  setState((s) => {
    const questions = { ...s.questions }
    delete questions[id]
    // Remove from tests too.
    const tests: Record<string, Test> = {}
    for (const [tid, t] of Object.entries(s.tests)) {
      tests[tid] = { ...t, sections: t.sections.map((sec) => ({ ...sec, items: sec.items.filter((i) => i.questionId !== id) })) }
    }
    return { ...s, questions, tests }
  })
}

export function duplicateQuestion(id: string): string | null {
  const q = state.questions[id]
  if (!q) return null
  const copy = { ...structuredClone(q), id: uid(), createdAt: Date.now(), updatedAt: Date.now() }
  saveQuestion(copy)
  return copy.id
}

// ---------------------------------------------------------------- tests

export function newTest(title = 'Untitled test'): Test {
  const now = Date.now()
  return {
    id: uid(),
    title,
    sections: [{ id: uid(), title: '', items: [] }],
    versions: 1,
    showPoints: true,
    header: { name: true, date: true, period: true },
    versionSalt: 0,
    createdAt: now,
    updatedAt: now,
  }
}

export function saveTest(t: Test) {
  setState((s) => ({ ...s, tests: { ...s.tests, [t.id]: { ...t, updatedAt: Date.now() } } }))
}

export function deleteTest(id: string) {
  setState((s) => {
    const tests = { ...s.tests }
    delete tests[id]
    return { ...s, tests }
  })
}

export function addQuestionsToTest(testId: string, questionIds: string[], sectionId?: string) {
  const t = state.tests[testId]
  if (!t) return
  const sections = t.sections.map((s) => ({ ...s, items: [...s.items] }))
  const sec = sections.find((s) => s.id === sectionId) ?? sections[sections.length - 1]
  for (const qid of questionIds) sec.items.push({ questionId: qid })
  saveTest({ ...t, sections })
}

// ---------------------------------------------------------------- import / export

export interface ExportFile {
  format: 'testbuilder'
  version: 1
  exportedAt: string
  questions: Question[]
  tests: Test[]
}

export function exportData(opts: { questionIds?: string[]; testIds?: string[] } = {}): ExportFile {
  const tests = opts.testIds ? opts.testIds.map((id) => state.tests[id]).filter(Boolean) : Object.values(state.tests)
  const qids = new Set(opts.questionIds ?? (opts.testIds ? [] : Object.keys(state.questions)))
  for (const t of tests) for (const s of t.sections) for (const i of s.items) qids.add(i.questionId)
  return {
    format: 'testbuilder',
    version: 1,
    exportedAt: new Date().toISOString(),
    questions: [...qids].map((id) => state.questions[id]).filter(Boolean),
    tests,
  }
}

/** Merge an export file into the store. Existing ids are overwritten unless `asCopies`. */
export function importData(file: ExportFile, asCopies = false): { questions: number; tests: number } {
  if (file.format !== 'testbuilder') throw new Error('Not a Test Builder file')
  const idMap = new Map<string, string>()
  const qs = file.questions.map((q) => {
    if (!asCopies) return q
    const id = uid()
    idMap.set(q.id, id)
    return { ...q, id }
  })
  const ts = file.tests.map((t) => {
    if (!asCopies) return t
    return {
      ...t,
      id: uid(),
      sections: t.sections.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i, questionId: idMap.get(i.questionId) ?? i.questionId })) })),
    }
  })
  setState((s) => {
    const questions = { ...s.questions }
    for (const q of qs) questions[q.id] = q
    const tests = { ...s.tests }
    for (const t of ts) tests[t.id] = t
    return { ...s, questions, tests }
  })
  return { questions: qs.length, tests: ts.length }
}

export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
