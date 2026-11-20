import { useSyncExternalStore } from 'react'

export interface Route {
  path: string[]
  query: URLSearchParams
}

function parse(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '')
  const [p, q] = hash.split('?')
  return { path: p ? p.split('/').map(decodeURIComponent) : [], query: new URLSearchParams(q ?? '') }
}

let current = parse()
const listeners = new Set<() => void>()
window.addEventListener('hashchange', () => {
  current = parse()
  listeners.forEach((l) => l())
})

export function useRoute(): Route {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}

export function navigate(to: string) {
  window.location.hash = to.startsWith('#') ? to : `#${to}`
}

export const href = (to: string) => `#${to}`
