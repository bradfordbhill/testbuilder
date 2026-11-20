// Global keyboard shortcuts.
import { useEffect, useRef } from 'react'

export interface ShortcutDef {
  keys: string
  description: string
  group: string
}

/** Documented shortcuts (shown in the ? help panel). */
export const SHORTCUTS: ShortcutDef[] = [
  { keys: 'Ctrl K', description: 'Command palette: jump anywhere, run a generator, look up a debug code', group: 'Anywhere' },
  { keys: '?', description: 'Show keyboard shortcuts', group: 'Anywhere' },
  { keys: 'B', description: 'Question bank', group: 'Go to' },
  { keys: 'G', description: 'Generate problems', group: 'Go to' },
  { keys: 'T', description: 'Tests', group: 'Go to' },
  { keys: 'C', description: 'Course topics', group: 'Go to' },
  { keys: 'P', description: 'Problem-type coverage', group: 'Go to' },
  { keys: 'N', description: 'New question', group: 'Create' },
  { keys: '/', description: 'Focus the search box on this page', group: 'Lists' },
  { keys: '↑ ↓', description: 'Move through questions', group: 'Lists' },
  { keys: 'Enter', description: 'Open (edit) the highlighted question', group: 'Lists' },
  { keys: 'Space', description: 'Expand / collapse preview', group: 'Lists' },
  { keys: 'X', description: 'Select / deselect the highlighted question', group: 'Lists' },
  { keys: 'Shift click', description: 'Select a range', group: 'Lists' },
  { keys: 'Ctrl S', description: 'Save the question', group: 'Editor' },
  { keys: 'Alt 1–4', description: 'Switch editor tab', group: 'Editor' },
  { keys: 'Esc', description: 'Close dialogs, cancel a diagram tool', group: 'Anywhere' },
]

/** True if the event target is a text field (single-key shortcuts should be ignored). */
export function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  if (!t) return false
  const tag = t.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable
}

/** Normalized key name like "ctrl+k", "shift+?", "n". */
export function keyName(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('ctrl')
  if (e.altKey) parts.push('alt')
  let k = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase()
  if (e.altKey && /^Digit\d$/.test(e.code)) k = e.code.slice(5)
  parts.push(k)
  return parts.join('+')
}

/**
 * Register key handlers while a component is mounted.
 * Handlers for plain keys are skipped while typing in a field; ctrl/alt combos always fire.
 * Return false from a handler to let the event continue.
 */
export function useShortcuts(map: Record<string, (e: KeyboardEvent) => boolean | void>, enabled = true) {
  const ref = useRef(map)
  ref.current = map
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('.modal-backdrop')) return
      const name = keyName(e)
      const fn = ref.current[name]
      if (!fn) return
      const combo = name.includes('ctrl+') || name.includes('alt+')
      if (!combo && isTyping(e)) return
      if (fn(e) !== false) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
