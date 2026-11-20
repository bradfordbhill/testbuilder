// Toast notifications (replace alert()) with optional action buttons such as Undo.
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { useSyncExternalStore } from 'react'

export interface Toast {
  id: number
  message: string
  kind: 'info' | 'success' | 'error'
  action?: { label: string; run: () => void }
  timeout: number
}

let toasts: Toast[] = []
const listeners = new Set<() => void>()
let nextId = 1
const emit = () => listeners.forEach((l) => l())

export function toast(
  message: string,
  opts: { kind?: Toast['kind']; action?: Toast['action']; timeout?: number } = {},
): number {
  const t: Toast = { id: nextId++, message, kind: opts.kind ?? 'info', action: opts.action, timeout: opts.timeout ?? (opts.action ? 7000 : 3500) }
  toasts = [...toasts.slice(-3), t]
  emit()
  setTimeout(() => dismiss(t.id), t.timeout)
  return t.id
}

export function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function Toaster() {
  const list = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => toasts,
  )
  return (
    <div className="toaster no-print" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          {t.kind === 'success' ? <CheckCircle2 size={15} /> : t.kind === 'error' ? <TriangleAlert size={15} /> : <Info size={15} />}
          <span className="toast-msg">{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                t.action!.run()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
          <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
