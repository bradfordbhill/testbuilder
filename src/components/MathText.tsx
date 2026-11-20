import katex from 'katex'
import 'katex/dist/katex.min.css'
import { memo } from 'react'

const cache = new Map<string, string>()

export function renderTex(tex: string, display = false): string {
  const key = `${display ? 'D' : 'I'}${tex}`
  let html = cache.get(key)
  if (html === undefined) {
    try {
      html = katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore' })
    } catch {
      html = `<span class="tex-error">${escapeHtml(tex)}</span>`
    }
    if (cache.size > 3000) cache.clear()
    cache.set(key, html)
  }
  return html
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
}

/** Minimal inline markup outside math: **bold**, _italic_. */
function inlineMarkup(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_(\S(?:.*?\S)?)_(?=[\s.,;:!?)]|$)/g, '$1<em>$2</em>')
}

/** Convert prompt text with $inline$ and $$display$$ math to HTML. */
export function textToHtml(text: string): string {
  const paragraphs = text.split(/\n\s*\n/)
  return paragraphs
    .map((para) => {
      let html = ''
      const re = /\$\$([\s\S]+?)\$\$|\$((?:\\\$|[^$])+?)\$/g
      let last = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(para))) {
        html += inlineMarkup(para.slice(last, m.index)).replace(/\n/g, '<br>')
        html += m[1] !== undefined ? renderTex(m[1], true) : renderTex(m[2])
        last = m.index + m[0].length
      }
      html += inlineMarkup(para.slice(last)).replace(/\n/g, '<br>')
      return `<p>${html}</p>`
    })
    .join('')
}

/** Render text containing $math$. `inline` renders without paragraph margins. */
export const MathText = memo(function MathText({
  text,
  inline,
  className,
}: {
  text: string
  inline?: boolean
  className?: string
}) {
  const html = textToHtml(text ?? '')
  if (inline) {
    const inner = html.replace(/^<p>/, '').replace(/<\/p>$/, '').replace(/<\/p><p>/g, '<br>')
    return <span className={className} dangerouslySetInnerHTML={{ __html: inner }} />
  }
  return <div className={`mathtext ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />
})

/** Render a bare LaTeX string. */
export function Tex({ tex, display }: { tex: string; display?: boolean }) {
  return <span dangerouslySetInnerHTML={{ __html: renderTex(tex, display) }} />
}
