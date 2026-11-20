// Promise-based dialog to replace window.confirm with an in-app modal.
import { useEffect, useRef, useSyncExternalStore } from 'react'

interface DialogButton {
  label: string
  value: string
  kind?: 'primary' | 'danger' | 'default'
}

interface DialogState {
  title: string
  body?: string
  buttons: DialogButton[]
  resolve: (v: string | null) => void
}

let current: DialogState | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Show a dialog; resolves with the chosen button's value, or null if dismissed. */
export function ask(title: string, body: string | undefined, buttons: DialogButton[]): Promise<string | null> {
  return new Promise((resolve) => {
    current?.resolve(null)
    current = { title, body, buttons, resolve }
    emit()
  })
}

/** Yes/no confirmation. */
export async function confirmAsk(title: string, body?: string, okLabel = 'OK', danger = false): Promise<boolean> {
  const v = await ask(title, body, [
    { label: 'Cancel', value: 'cancel' },
    { label: okLabel, value: 'ok', kind: danger ? 'danger' : 'primary' },
  ])
  return v === 'ok'
}

function close(v: string | null) {
  const c = current
  current = null
  emit()
  c?.resolve(v)
}

export function DialogHost() {
  const d = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
  const primaryRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!d) return
    primaryRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close(null)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [d])
  if (!d) return null
  return (
    <div className="modal-backdrop" onMouseDown={() => close(null)}>
      <div className="modal dialog" role="dialog" aria-modal="true" aria-label={d.title} onMouseDown={(e) => e.stopPropagation()}>
        <h3>{d.title}</h3>
        {d.body && <p>{d.body}</p>}
        <div className="dialog-buttons">
          {d.buttons.map((b, i) => (
            <button
              key={b.value}
              type="button"
              ref={i === d.buttons.length - 1 ? primaryRef : undefined}
              className={b.kind === 'primary' ? 'primary' : b.kind === 'danger' ? 'danger-solid' : ''}
              onClick={() => close(b.value)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
