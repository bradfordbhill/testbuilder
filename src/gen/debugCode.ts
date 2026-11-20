// Debug identifier codes: short strings that pinpoint exactly how a question was produced,
// so a bad output can be found and regenerated. Shown in the builder only, never printed.
//
//   Generated:  G:<generatorId>:<seed in base 36>[:key=value,key=value][:edited]
//               e.g. G:side-splitter:1x9k2f:variant=quadratic
//   Written:    Q:<question id>
//
// For Forms B and later the seed is the form's actual seed, so the code reproduces that form's numbers.

import type { Question } from '../model/types'
import { generatorById, resolveOptions } from './index'

export function debugCode(q: Question): string {
  if (!q.gen) return `Q:${q.id}`
  const g = generatorById.get(q.gen.generatorId)
  const defaults = g ? resolveOptions(g, {}) : {}
  // Only list options that differ from the defaults, to keep codes short.
  const opts = Object.entries(q.gen.options ?? {})
    .filter(([k, v]) => defaults[k] !== String(v))
    .map(([k, v]) => `${k}=${v}`)
    .join(',')
  const parts = ['G', q.gen.generatorId, (q.gen.seed >>> 0).toString(36)]
  if (opts) parts.push(opts)
  if (q.gen.edited) parts.push('edited')
  return parts.join(':')
}

export type ParsedCode =
  | { kind: 'generated'; generatorId: string; seed: number; options: Record<string, string>; edited: boolean }
  | { kind: 'question'; id: string }

export function parseDebugCode(code: string): ParsedCode | null {
  const c = code.trim()
  if (c.startsWith('Q:')) return c.length > 2 ? { kind: 'question', id: c.slice(2) } : null
  const parts = c.split(':')
  if (parts[0] !== 'G' || parts.length < 3) return null
  const [, generatorId, seed36, ...rest] = parts
  const seed = parseInt(seed36, 36)
  if (!generatorById.has(generatorId) || !Number.isFinite(seed)) return null
  const edited = rest.includes('edited')
  const optStr = rest.find((r) => r !== 'edited' && r.includes('='))
  const options: Record<string, string> = {}
  if (optStr)
    for (const kv of optStr.split(',')) {
      const [k, v] = kv.split('=')
      if (k && v !== undefined) options[k] = v
    }
  return { kind: 'generated', generatorId, seed: seed >>> 0, options, edited }
}
