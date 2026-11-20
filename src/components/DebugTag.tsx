import { useState } from 'react'
import { debugCode } from '../gen/debugCode'
import type { Question } from '../model/types'

/** Small copyable debug identifier. Hidden when printing. */
export function DebugTag({ q, prefix }: { q: Question; prefix?: string }) {
  const code = debugCode(q)
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="debug-tag no-print"
      title="Debug code: identifies exactly how this question was produced. Click to copy. Paste it into Generate → “Look up a debug code” to reproduce it."
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        navigator.clipboard?.writeText(code).then(
          () => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1200)
          },
          () => {},
        )
      }}
    >
      {prefix}
      {copied ? 'copied!' : code}
    </button>
  )
}
