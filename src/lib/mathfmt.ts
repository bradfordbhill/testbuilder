// Number and expression formatting helpers (LaTeX and plain text).

export function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) [a, b] = [b, a % b]
  return a
}

export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b)
}

/** Round to `places` decimals and drop trailing zeros. */
export function round(n: number, places = 2): number {
  const f = 10 ** places
  return Math.round(n * f + Number.EPSILON * Math.sign(n)) / f
}

export function fmt(n: number, places = 2): string {
  const r = round(n, places)
  return Object.is(r, -0) ? '0' : String(r)
}

/** Fixed number of decimals (keeps trailing zeros), e.g. for "nearest tenth". */
export function fixed(n: number, places: number): string {
  const s = round(n, places).toFixed(places)
  return s === '-0' || /^-0\.0+$/.test(s) ? s.slice(1) : s
}

/** Simplify √n into coef·√rad. */
export function simplifyRadical(n: number): { coef: number; rad: number } {
  if (n < 0) throw new Error('negative radicand')
  let coef = 1
  let rad = n
  for (let f = 2; f * f <= rad; f++) {
    while (rad % (f * f) === 0) {
      coef *= f
      rad /= f * f
    }
  }
  return { coef, rad }
}

/** LaTeX for k·√n in simplest radical form (n an integer). */
export function radicalLatex(n: number, k = 1): string {
  const { coef, rad } = simplifyRadical(n)
  const c = coef * k
  if (rad === 1) return String(c)
  if (c === 1) return `\\sqrt{${rad}}`
  if (c === -1) return `-\\sqrt{${rad}}`
  return `${c}\\sqrt{${rad}}`
}

/** LaTeX for a reduced fraction num/den. */
export function fracLatex(num: number, den: number): string {
  if (den === 0) throw new Error('zero denominator')
  if (den < 0) {
    num = -num
    den = -den
  }
  const g = gcd(num, den) || 1
  num /= g
  den /= g
  if (den === 1) return String(num)
  const sign = num < 0 ? '-' : ''
  return `${sign}\\frac{${Math.abs(num)}}{${den}}`
}

/** Plain-text reduced fraction ("3/4"). */
export function fracText(num: number, den: number): string {
  if (den < 0) {
    num = -num
    den = -den
  }
  const g = gcd(num, den) || 1
  num /= g
  den /= g
  return den === 1 ? String(num) : `${num}/${den}`
}

/** Coefficient of a term: 1 → "", -1 → "-", 3 → "3". */
function coefStr(a: number): string {
  if (a === 1) return ''
  if (a === -1) return '-'
  return String(a)
}

/**
 * Linear expression a·v + b as text, e.g. lin(3, -5) → "3x - 5", lin(1, 0) → "x".
 * Works for both LaTeX and plain text since it uses no special characters.
 */
export function lin(a: number, b: number, v = 'x'): string {
  if (a === 0) return String(b)
  const head = `${coefStr(a)}${v}`
  if (b === 0) return head
  return b > 0 ? `${head} + ${b}` : `${head} - ${-b}`
}

/** Quadratic a·x² + b·x + c in LaTeX. */
export function quadLatex(a: number, b: number, c: number, v = 'x'): string {
  const parts: string[] = []
  if (a !== 0) parts.push(`${coefStr(a)}${v}^2`)
  if (b !== 0) {
    const t = `${coefStr(Math.abs(b))}${v}`
    parts.push(parts.length === 0 ? (b < 0 ? `-${t}` : t) : b < 0 ? `- ${t}` : `+ ${t}`)
  }
  if (c !== 0 || parts.length === 0) {
    parts.push(parts.length === 0 ? String(c) : c < 0 ? `- ${-c}` : `+ ${c}`)
  }
  return parts.join(' ')
}

/** Plain-text quadratic using the Unicode superscript ². */
export function quadText(a: number, b: number, c: number, v = 'x'): string {
  return quadLatex(a, b, c, v).replace('^2', '²')
}

/** Angle label for a diagram: "(3x + 5)°" or "47°". */
export function degLabel(expr: string | number): string {
  if (typeof expr === 'number') return `${expr}°`
  return /^[-\d.]+$/.test(expr) ? `${expr}°` : `(${expr})°`
}

export const toRad = (deg: number) => (deg * Math.PI) / 180
export const toDeg = (rad: number) => (rad * 180) / Math.PI

/** LaTeX for (num/den)·π in lowest terms, e.g. 5π/6, π, -π/4. */
export function piLatex(num: number, den: number): string {
  if (num === 0) return '0'
  if (den < 0) {
    num = -num
    den = -den
  }
  const g = gcd(num, den)
  num /= g
  den /= g
  const sign = num < 0 ? '-' : ''
  const n = Math.abs(num)
  const top = n === 1 ? '\\pi' : `${n}\\pi`
  return den === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${den}}`
}

/** Radian measure of an angle in degrees as a LaTeX multiple of π. */
export function degToPiLatex(deg: number): string {
  return piLatex(deg, 180)
}

/** Exact values for special angles (degrees, any multiple of 30 or 45). */
export function exactTrig(fn: 'sin' | 'cos' | 'tan' | 'csc' | 'sec' | 'cot', deg: number): string {
  const d = ((deg % 360) + 360) % 360
  // Reference values in the first quadrant as [sin, cos] LaTeX.
  const ref = d % 180 === 0 ? 0 : d % 90 === 0 ? 90 : d % 180 < 90 ? d % 180 : 180 - (d % 180)
  const sinRef: Record<number, string> = {
    0: '0',
    30: '\\frac{1}{2}',
    45: '\\frac{\\sqrt{2}}{2}',
    60: '\\frac{\\sqrt{3}}{2}',
    90: '1',
  }
  const cosRef: Record<number, string> = {
    0: '1',
    30: '\\frac{\\sqrt{3}}{2}',
    45: '\\frac{\\sqrt{2}}{2}',
    60: '\\frac{1}{2}',
    90: '0',
  }
  const tanRef: Record<number, string> = {
    0: '0',
    30: '\\frac{\\sqrt{3}}{3}',
    45: '1',
    60: '\\sqrt{3}',
    90: '\\text{undefined}',
  }
  const cotRef: Record<number, string> = {
    0: '\\text{undefined}',
    30: '\\sqrt{3}',
    45: '1',
    60: '\\frac{\\sqrt{3}}{3}',
    90: '0',
  }
  const cscRef: Record<number, string> = {
    0: '\\text{undefined}',
    30: '2',
    45: '\\sqrt{2}',
    60: '\\frac{2\\sqrt{3}}{3}',
    90: '1',
  }
  const secRef: Record<number, string> = {
    0: '1',
    30: '\\frac{2\\sqrt{3}}{3}',
    45: '\\sqrt{2}',
    60: '2',
    90: '\\text{undefined}',
  }
  const table = { sin: sinRef, cos: cosRef, tan: tanRef, cot: cotRef, csc: cscRef, sec: secRef }[fn]
  if (!(ref in table)) throw new Error(`not a special angle: ${deg}`)
  const value = table[ref]
  if (value === '0' || value.startsWith('\\text')) return value
  const r = toRad(d)
  const s = Math.sin(r)
  const c = Math.cos(r)
  const sign = {
    sin: s,
    cos: c,
    tan: s * c,
    cot: s * c,
    csc: s,
    sec: c,
  }[fn]
  return sign < -1e-9 ? `-${value}` : value
}

/** Numeric value of an exact trig value (for auto-grading), NaN if undefined. */
export function trigNumeric(fn: 'sin' | 'cos' | 'tan' | 'csc' | 'sec' | 'cot', deg: number): number {
  const r = toRad(deg)
  const s = Math.sin(r)
  const c = Math.cos(r)
  const v = { sin: s, cos: c, tan: s / c, cot: c / s, csc: 1 / s, sec: 1 / c }[fn]
  return Math.abs(v) > 1e9 ? NaN : round(v, 6)
}

/** Ordinal letter for version numbers: 0 → "A". */
export function versionLetter(i: number): string {
  return String.fromCharCode(65 + i)
}
