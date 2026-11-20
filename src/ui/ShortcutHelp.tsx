import { X } from 'lucide-react'
import { SHORTCUTS } from './shortcuts'
import { setHelpOpen, useHelpOpen } from './CommandPalette'

export function ShortcutHelp() {
  const open = useHelpOpen()
  if (!open) return null
  const groups = [...new Set(SHORTCUTS.map((s) => s.group))]
  return (
    <div className="modal-backdrop" onMouseDown={() => setHelpOpen(false)}>
      <div className="modal help" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Keyboard shortcuts">
        <div className="modal-head">
          <h3>Keyboard shortcuts</h3>
          <button type="button" className="icon-btn" aria-label="Close" onClick={() => setHelpOpen(false)}>
            <X size={16} />
          </button>
        </div>
        <div className="help-grid">
          {groups.map((g) => (
            <div key={g}>
              <h4>{g}</h4>
              {SHORTCUTS.filter((s) => s.group === g).map((s) => (
                <div key={s.keys} className="help-row">
                  <span>
                    {s.keys.split(' ').map((k) => (
                      <kbd key={k}>{k}</kbd>
                    ))}
                  </span>
                  <span>{s.description}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
