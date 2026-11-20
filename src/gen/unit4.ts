import { diagram } from '../diagram/build'
import { polar } from '../diagram/geom'
import {
  degToPiLatex,
  exactTrig,
  fixed,
  fracLatex,
  gcd,
  lin,
  simplifyRadical,
  toDeg,
  toRad,
  trigNumeric,
} from '../lib/mathfmt'
import type { Rng } from '../lib/rng'
import { TRIPLES, triangleFromAngles, triangleFromSides } from './helpers'
import { ans, type Generator, letters, linearFor, numericDistractors } from './types'

const fmtN = (v: number) => String(Math.round(v * 100) / 100)
const round = (v: number, p = 1) => Math.round(v * 10 ** p) / 10 ** p
const placeOpt = {
  key: 'places',
  label: 'Round to',
  default: '1',
  choices: [
    { value: '0', label: 'Nearest whole number' },
    { value: '1', label: 'Nearest tenth' },
    { value: '2', label: 'Nearest hundredth' },
  ],
}
const placeWord = (p: number) => (p === 0 ? 'the nearest whole number' : p === 1 ? 'the nearest tenth' : 'the nearest hundredth')

// ---------------------------------------------------------------- surds: n·√r / d

interface Surd {
  n: number
  r: number
  d: number
}
function surd(n: number, r = 1, d = 1): Surd {
  const s = simplifyRadical(r)
  n *= s.coef
  r = s.rad
  const g = gcd(n, d) || 1
  return { n: n / g, r, d: d / g }
}
const surdMul = (a: Surd, k: number, root = 1): Surd => surd(a.n * k, a.r * root, a.d)
/** Divide by √root: multiply numerator and denominator by √root. */
const surdDivRoot = (a: Surd, root: number): Surd => surd(a.n, a.r * root, a.d * root)
const surdDiv = (a: Surd, k: number): Surd => surd(a.n, a.r, a.d * k)
function surdLatex(a: Surd): string {
  const top = a.r === 1 ? String(a.n) : a.n === 1 ? `\\sqrt{${a.r}}` : `${a.n}\\sqrt{${a.r}}`
  return a.d === 1 ? top : `\\frac{${top}}{${a.d}}`
}
function surdText(a: Surd): string {
  const top = a.r === 1 ? String(a.n) : a.n === 1 ? `√${a.r}` : `${a.n}√${a.r}`
  return a.d === 1 ? top : `${top}/${a.d}`
}
const surdVal = (a: Surd) => (a.n * Math.sqrt(a.r)) / a.d

// ---------------------------------------------------------------- special right triangles

export const specialRight: Generator = {
  id: 'special-right',
  types: ['SRT.45_45_90', 'SRT.30_60_90', 'ALG.RADICALS'],
  title: 'Special right triangles (45-45-90, 30-60-90)',
  lessons: ['4A.2', '4A.3'],
  description: 'Given one side, find the other two in simplest radical form.',
  options: [
    {
      key: 'kind',
      label: 'Triangle',
      default: 'any',
      choices: [
        { value: 'any', label: 'Either' },
        { value: '45', label: '45-45-90' },
        { value: '30', label: '30-60-90' },
      ],
    },
  ],
  generate(rng, opts) {
    const kind = !opts.kind || opts.kind === 'any' ? rng.pick(['45', '30']) : opts.kind
    const [A, B, C] = letters(rng, 3)
    const d = diagram()
    if (kind === '45') {
      const givenHyp = rng.bool()
      let leg: Surd, hyp: Surd
      if (givenHyp) {
        hyp = rng.bool() ? surd(rng.int(2, 16)) : surd(rng.int(2, 12), 2)
        leg = surdDivRoot(hyp, 2)
      } else {
        leg = rng.bool(0.7) ? surd(rng.int(2, 15)) : surd(rng.int(2, 8), rng.pick([2, 3]))
        hyp = surdMul(leg, 1, 2)
      }
      d.pt(C, 0, 0).pt(B, 3, 0).pt(A, 0, 3).right(B, C, A)
      d.angle(C, B, A, { label: '45°' })
      d.seg(C, B, { label: givenHyp ? 'x' : surdText(leg) })
        .seg(C, A, { label: givenHyp ? 'y' : 'x' })
        .seg(A, B, { label: givenHyp ? surdText(hyp) : 'y' })
      return {
        type: 'short',
        types: ['SRT.45_45_90', 'ALG.RADICALS'],
        prompt: 'Find the exact values of $x$ and $y$ in simplest radical form.',
        diagram: d.build(190),
        answers: givenHyp
          ? [ans('x', surdLatex(leg), surdVal(leg)), ans('y', surdLatex(leg), surdVal(leg))]
          : [ans('x', surdLatex(leg), surdVal(leg)), ans('y', surdLatex(hyp), surdVal(hyp))],
        solution: givenHyp
          ? `In a 45-45-90 triangle the hypotenuse is $\\sqrt{2}$ times a leg, so each leg is $\\frac{${surdLatex(hyp)}}{\\sqrt{2}} = ${surdLatex(leg)}$.`
          : `The legs are congruent, so $x = ${surdLatex(leg)}$, and the hypotenuse is $\\sqrt{2}$ times a leg: $y = ${surdLatex(hyp)}$.`,
        workLines: 4,
      }
    }
    // 30-60-90: short leg s (opposite 30), long leg s√3, hypotenuse 2s
    const which = rng.pick(['short', 'long', 'hyp'])
    let short: Surd
    if (which === 'short') short = rng.bool(0.75) ? surd(rng.int(2, 14)) : surd(rng.int(2, 6), rng.pick([2, 3]))
    else if (which === 'long') short = surdDivRoot(rng.bool() ? surd(rng.int(2, 15)) : surd(rng.int(2, 8), 3), 3)
    else short = surdDiv(rng.bool(0.7) ? surd(rng.int(3, 24)) : surd(rng.int(2, 12), rng.pick([2, 3])), 2)
    const long = surdMul(short, 1, 3)
    const hyp = surdMul(short, 2)
    // C right angle, A has 30°, B has 60°. Short leg = BC, long leg = AC.
    d.pt(C, 0, 0).pt(A, Math.sqrt(3) * 1.8, 0).pt(B, 0, 1.8).right(A, C, B)
    d.angle(B, A, C, { label: '30°' }).angle(C, B, A, { label: '60°' })
    const vars = ['x', 'y']
    let k = 0
    const lab = (w: string, v: Surd) => (w === which ? surdText(v) : vars[k++])
    const lShort = lab('short', short)
    const lLong = lab('long', long)
    const lHyp = lab('hyp', hyp)
    d.seg(C, B, { label: lShort }).seg(C, A, { label: lLong }).seg(A, B, { label: lHyp })
    const answers = [
      ['short', lShort, short],
      ['long', lLong, long],
      ['hyp', lHyp, hyp],
    ]
      .filter(([w]) => w !== which)
      .map(([, l, v]) => ans(l as string, surdLatex(v as Surd), surdVal(v as Surd)))
    return {
      type: 'short',
      types: ['SRT.30_60_90', 'ALG.RADICALS'],
      prompt: 'Find the exact values of $x$ and $y$ in simplest radical form.',
      diagram: d.build(230),
      answers,
      solution: `In a 30-60-90 triangle, if the short leg is $s$, the long leg is $s\\sqrt{3}$ and the hypotenuse is $2s$. Here $s = ${surdLatex(short)}$.`,
      workLines: 4,
    }
  },
}

// ---------------------------------------------------------------- trig ratios from a triangle

export const trigRatios: Generator = {
  id: 'trig-ratios',
  types: ['TRIG.RATIOS'],
  title: 'Write cosine, sine, and tangent ratios',
  lessons: ['4A.4', '4B.6', '4B.8'],
  description: 'Right triangle with Pythagorean-triple sides. Write cos, sin, tan of an acute angle (course order: cos, sin, tan).',
  generate(rng) {
    const [p, q, r] = rng.pick(TRIPLES.slice(0, 4))
    const k = rng.int(1, 3)
    const [a, b, c] = rng.bool() ? [p * k, q * k, r * k] : [q * k, p * k, r * k]
    const [A, B, C] = letters(rng, 3)
    // Right angle at C. BC = a (opposite A), AC = b (adjacent A), AB = c.
    const sc = 4 / c
    const d = diagram().pt(C, 0, 0).pt(A, b * sc, 0).pt(B, 0, a * sc).right(A, C, B)
    const hideOne = rng.bool(0.4)
    d.seg(C, B, { label: String(a) }).seg(C, A, { label: String(b) }).seg(A, B, { label: hideOne ? '' : String(c) })
    const target = rng.pick([A, B])
    const [opp, adj] = target === A ? [a, b] : [b, a]
    return {
      type: 'short',
      prompt: `${hideOne ? `Find $${A}${B}$. Then write` : 'Write'} $\\cos ${target}$, $\\sin ${target}$, and $\\tan ${target}$ as fractions in lowest terms.`,
      diagram: d.build(200),
      answers: [
        ...(hideOne ? [ans(`${A}${B}`, c)] : []),
        ans(`\\cos ${target}`, fracLatex(adj, c), adj / c),
        ans(`\\sin ${target}`, fracLatex(opp, c), opp / c),
        ans(`\\tan ${target}`, fracLatex(opp, adj), opp / adj),
      ],
      solution: `For $\\angle ${target}$: adjacent leg $${adj}$, opposite leg $${opp}$, hypotenuse $${c}$. cos = adjacent/hypotenuse, sin = opposite/hypotenuse, tan = opposite/adjacent.`,
      workLines: 3,
    }
  },
}

// ---------------------------------------------------------------- find a side

type Role = 'opp' | 'adj' | 'hyp'

export const trigFindSide: Generator = {
  id: 'trig-find-side',
  types: ['TRIG.SOLVE_RIGHT'],
  title: 'Use a trig ratio to find a side',
  lessons: ['4B.6', '4B.7'],
  description: 'Right triangle with an acute angle and one side. Includes the variable-in-the-denominator case.',
  options: [placeOpt],
  generate(rng, opts) {
    const places = Number(opts.places ?? 1)
    const theta = rng.int(15, 75)
    const [known, unknown] = rng.shuffle<Role>(['opp', 'adj', 'hyp']).slice(0, 2) as [Role, Role]
    const kv = rng.int(5, 40)
    // Compute all sides from the known one.
    const t = toRad(theta)
    const hyp = known === 'hyp' ? kv : known === 'opp' ? kv / Math.sin(t) : kv / Math.cos(t)
    const sides = { hyp, opp: hyp * Math.sin(t), adj: hyp * Math.cos(t) }
    const x = sides[unknown]
    const [A, B, C] = letters(rng, 3)
    // angle theta at A, right angle at C, BC opposite, AC adjacent
    const sc = 4 / hyp
    const d = diagram().pt(C, 0, 0).pt(A, sides.adj * sc, 0).pt(B, 0, sides.opp * sc).right(A, C, B)
    d.angle(B, A, C, { label: `${theta}°` })
    const lab = (r: Role) => (r === known ? String(kv) : r === unknown ? 'x' : '')
    d.seg(C, B, { label: lab('opp') }).seg(C, A, { label: lab('adj') }).seg(A, B, { label: lab('hyp') })
    const pair = new Set([known, unknown])
    const fn = !pair.has('hyp') ? 'tan' : pair.has('opp') ? 'sin' : 'cos'
    const num = fn === 'cos' ? 'adj' : 'opp'
    const den = fn === 'tan' ? 'adj' : 'hyp'
    const sym = (r: Role) => (r === known ? String(kv) : 'x')
    const eq = `\\${fn}(${theta}^\\circ) = \\frac{${sym(num)}}{${sym(den)}}`
    const wrongFn = fn === 'sin' ? Math.cos(t) : fn === 'cos' ? Math.sin(t) : 1 / Math.tan(t)
    const wrong = den === unknown ? kv * wrongFn : kv / wrongFn
    return {
      type: 'short',
      prompt: `Find $x$. Round to ${placeWord(places)}.`,
      diagram: d.build(210),
      answers: [ans('x', fixed(x, places), round(x, places))],
      distractors: numericDistractors(rng, round(x, places), [round(wrong, places), round(kv * Math.tan(t), places), round(x + 1.3, places)], 3, places),
      solution: `$${eq}$, so $x = ${den === unknown ? `\\frac{${kv}}{\\${fn}(${theta}^\\circ)}` : `${kv}\\${fn}(${theta}^\\circ)`} \\approx ${fixed(x, places)}$.`,
      workLines: 4,
    }
  },
}

export const trigFindAngle: Generator = {
  id: 'trig-find-angle',
  types: ['TRIG.INVERSE'],
  title: 'Use an inverse trig ratio to find an angle',
  lessons: ['4B.10'],
  description: 'Two sides of a right triangle are given. Find an acute angle with arccos, arcsin, or arctan.',
  options: [placeOpt],
  generate(rng, opts) {
    const places = Number(opts.places ?? 0)
    const [r1, r2] = rng.shuffle<Role>(['opp', 'adj', 'hyp']).slice(0, 2) as [Role, Role]
    let opp = rng.int(3, 25)
    let adj = rng.int(3, 25)
    let hyp = Math.hypot(opp, adj)
    if (r1 === 'hyp' || r2 === 'hyp') {
      // integer hypotenuse with integer known leg
      hyp = rng.int(8, 30)
      const leg = rng.int(3, hyp - 2)
      if (r1 === 'opp' || r2 === 'opp') {
        opp = leg
        adj = Math.sqrt(hyp * hyp - leg * leg)
      } else {
        adj = leg
        opp = Math.sqrt(hyp * hyp - leg * leg)
      }
    }
    const theta = toDeg(Math.atan2(opp, adj))
    const [A, B, C] = letters(rng, 3)
    const sc = 4 / hyp
    const d = diagram().pt(C, 0, 0).pt(A, adj * sc, 0).pt(B, 0, opp * sc).right(A, C, B)
    d.angle(B, A, C, { label: 'θ' })
    const shown = new Set([r1, r2])
    d.seg(C, B, { label: shown.has('opp') ? String(opp) : '' })
      .seg(C, A, { label: shown.has('adj') ? String(adj) : '' })
      .seg(A, B, { label: shown.has('hyp') ? String(hyp) : '' })
    const fn = !shown.has('hyp') ? 'tan' : shown.has('opp') ? 'sin' : 'cos'
    const ratio = fn === 'tan' ? `\\frac{${opp}}{${adj}}` : fn === 'sin' ? `\\frac{${opp}}{${hyp}}` : `\\frac{${adj}}{${hyp}}`
    return {
      type: 'short',
      prompt: `Find $\\theta$. Round to ${placeWord(places)} degree${places ? '' : ''}.`,
      diagram: d.build(210),
      answers: [ans('\\theta', `${fixed(theta, places)}^\\circ`, round(theta, places))],
      distractors: numericDistractors(rng, round(theta, places), [round(90 - theta, places), round(theta + 4, places), round(theta - 3, places)], 3, places).map((s) => `${s}^\\circ`),
      solution: `$\\${fn}\\theta = ${ratio}$, so $\\theta = \\${fn}^{-1}\\left(${ratio}\\right) \\approx ${fixed(theta, places)}^\\circ$.`,
      workLines: 3,
    }
  },
}

// ---------------------------------------------------------------- word problems

export const elevationDepression: Generator = {
  id: 'elevation-depression',
  types: ['TRIG.ELEVATION_DEPRESSION', 'TRIG.INVERSE', 'SRT.STEEPNESS'],
  title: 'Angles of elevation and depression; ladders and ramps',
  lessons: ['4B.7', '4B.10', '4C.11', '4A.1'],
  description: 'Real-world right-triangle trig: buildings, cliffs, ladders, kite strings, ADA ramps (1:12, 4.8°).',
  options: [placeOpt],
  generate(rng, opts) {
    const places = Number(opts.places ?? 1)
    const kind = rng.pick(['elevation', 'depression', 'ladder', 'kite', 'ramp'])
    const nm = rng.pick(['Maya', 'Jordan', 'Luis', 'Priya', 'Sam', 'Ana', 'Kai', 'Noor'])
    const d = diagram()
    if (kind === 'elevation') {
      const dist = rng.int(40, 200)
      const theta = rng.int(20, 65)
      const eye = rng.bool() ? rng.int(50, 62) / 10 : 0
      const h = dist * Math.tan(toRad(theta)) + eye
      const obj = rng.pick(['building', 'tree', 'flagpole', 'water tower'])
      d.pt('P', 0, 0, null).pt('F', 4, 0, null).pt('T', 4, 4 * Math.tan(toRad(theta)), null)
      d.seg('P', 'F', { label: `${dist} ft` }).seg('F', 'T', { label: 'h' }).seg('P', 'T', { dashed: true }).right('P', 'F', 'T').angle('F', 'P', 'T', { label: `${theta}°` })
      return {
        type: 'short',
        prompt: `${nm} stands ${dist} ft from the base of a ${obj}. The angle of elevation from ${eye ? `${nm}'s eyes, ${eye} ft above the ground,` : 'the ground'} to the top of the ${obj} is $${theta}^\\circ$. How tall is the ${obj}? Round to ${placeWord(places)}.`,
        diagram: d.build(220),
        answers: [ans('h', `${fixed(h, places)} \\text{ ft}`, round(h, places))],
        solution: `$\\tan(${theta}^\\circ) = \\frac{h_1}{${dist}}$, so $h_1 = ${dist}\\tan(${theta}^\\circ)$${eye ? ` and the height is $h_1 + ${eye}$` : ''} $\\approx ${fixed(h, places)}$ ft.`,
        workLines: 5,
      }
    }
    if (kind === 'depression') {
      const h = rng.int(60, 300)
      const theta = rng.int(8, 40)
      const dist = h / Math.tan(toRad(theta))
      const place = rng.pick(['lighthouse', 'cliff', 'observation tower'])
      d.pt('T', 0, 2.2, null).pt('B', 0, 0, null).pt('S', 2.2 / Math.tan(toRad(Math.max(theta, 18))), 0, null).hp('H', 4, 2.2)
      d.seg('B', 'T', { label: `${h} ft` }).seg('B', 'S', { label: 'd' }).seg('T', 'S', { dashed: true }).seg('T', 'H', { dashed: true }).angle('S', 'T', 'H', { label: `${theta}°` }).right('S', 'B', 'T')
      return {
        type: 'short',
        prompt: `From the top of a ${h}-ft ${place}, the angle of depression to a boat is $${theta}^\\circ$. How far is the boat from the base of the ${place}? Round to ${placeWord(places)}.`,
        diagram: d.build(230),
        answers: [ans('d', `${fixed(dist, places)} \\text{ ft}`, round(dist, places))],
        solution: `The angle of depression equals the angle of elevation from the boat (alternate interior angles). $\\tan(${theta}^\\circ) = \\frac{${h}}{d}$, so $d = \\frac{${h}}{\\tan(${theta}^\\circ)} \\approx ${fixed(dist, places)}$ ft.`,
        workLines: 5,
      }
    }
    if (kind === 'ladder') {
      const L = rng.int(12, 32)
      if (rng.bool()) {
        const theta = rng.int(60, 80)
        const h = L * Math.sin(toRad(theta))
        return {
          type: 'short',
          prompt: `A ${L}-ft ladder leans against a wall and makes a $${theta}^\\circ$ angle with the ground. How high up the wall does the ladder reach? Round to ${placeWord(places)}.`,
          answers: [ans('h', `${fixed(h, places)} \\text{ ft}`, round(h, places))],
          solution: `$\\sin(${theta}^\\circ) = \\frac{h}{${L}}$, so $h = ${L}\\sin(${theta}^\\circ) \\approx ${fixed(h, places)}$ ft.`,
          workLines: 4,
        }
      }
      const theta = toDeg(Math.atan(4))
      return {
        type: 'short',
        prompt: `The 4 to 1 Rule for Ladder Safety says the base of a ladder should be 1 ft from the wall for every 4 ft of height it reaches. A ${L}-ft ladder follows the rule. (a) What angle does it make with the ground? (b) How far is its base from the wall? Round to ${placeWord(places)}.`,
        answers: [
          ans('(a)', `${fixed(theta, places)}^\\circ`, round(theta, places)),
          ans('(b)', `${fixed(L / Math.sqrt(17), places)} \\text{ ft}`, round(L / Math.sqrt(17), places)),
        ],
        solution: `$\\tan\\theta = \\frac{4}{1}$, so $\\theta = \\tan^{-1}(4) \\approx ${fixed(theta, places)}^\\circ$. Base $= ${L}\\cos\\theta = \\frac{${L}}{\\sqrt{17}} \\approx ${fixed(L / Math.sqrt(17), places)}$ ft.`,
        workLines: 5,
      }
    }
    if (kind === 'kite') {
      const L = rng.int(80, 300)
      const theta = rng.int(30, 70)
      const h = L * Math.sin(toRad(theta))
      return {
        type: 'short',
        prompt: `${nm} flies a kite on ${L} ft of string. The string makes a $${theta}^\\circ$ angle with the ground. Assuming the string is straight, how high is the kite above ${nm}'s hand? Round to ${placeWord(places)}.`,
        answers: [ans('h', `${fixed(h, places)} \\text{ ft}`, round(h, places))],
        solution: `$h = ${L}\\sin(${theta}^\\circ) \\approx ${fixed(h, places)}$ ft.`,
        workLines: 4,
      }
    }
    const rise = rng.int(6, 36)
    const run = rng.int(rise * 6, rise * 16)
    const theta = toDeg(Math.atan(rise / run))
    const ok = rise / run <= 1 / 12 + 1e-9
    return {
      type: 'short',
      types: ['TRIG.INVERSE', 'SRT.STEEPNESS'],
      prompt: `A wheelchair ramp rises ${rise} in over a horizontal distance of ${run} in. (a) Find the angle the ramp makes with the ground, rounded to ${placeWord(places)} degree. (b) The ADA requires a slope of at most 1:12 (about $4.8^\\circ$). Does the ramp meet the requirement?`,
      answers: [ans('(a)', `${fixed(theta, places)}^\\circ`, round(theta, places)), ans('(b)', ok ? '\\text{Yes}' : '\\text{No}')],
      solution: `$\\theta = \\tan^{-1}\\left(\\frac{${rise}}{${run}}\\right) \\approx ${fixed(theta, places)}^\\circ$. ${ok ? 'This is at most' : 'This exceeds'} $4.8^\\circ$.`,
      workLines: 4,
    }
  },
}

// ---------------------------------------------------------------- cofunctions and the Pythagorean identity

export const cofunction: Generator = {
  id: 'cofunction',
  types: ['TRIG.COFUNCTION'],
  title: 'sin θ = cos(90° − θ): solve for x',
  lessons: ['4B.8'],
  description: 'Complementary angles: sin of one equals cos of the other. Includes an algebra version.',
  generate(rng) {
    const x = rng.int(3, 15)
    for (;;) {
      const v1 = rng.int(15, 70)
      const v2 = 90 - v1
      const e1 = linearFor(rng, x, v1, { aMax: 5, maxB: 40 })
      const e2 = linearFor(rng, x, v2, { aMax: 5, maxB: 40, avoid: [e1.a] })
      const plain = rng.int(10, 80)
      const fn1 = rng.pick(['sin', 'cos'])
      const fn2 = fn1 === 'sin' ? 'cos' : 'sin'
      return {
        type: 'short',
        prompt: `(a) Fill in the blank with an angle between $0^\\circ$ and $90^\\circ$: $\\${fn1}(${plain}^\\circ) = \\${fn2}(\\underline{\\quad\\quad})$.\n\n(b) Find the value of $x$ if $\\${fn1}\\big((${lin(e1.a, e1.b)})^\\circ\\big) = \\${fn2}\\big((${lin(e2.a, e2.b)})^\\circ\\big)$ and both angles are acute.`,
        answers: [ans('(a)', `${90 - plain}^\\circ`, 90 - plain), ans('(b)\\ x', x)],
        solution: `The angles are complementary: $(${lin(e1.a, e1.b)}) + (${lin(e2.a, e2.b)}) = 90$, so $x = ${x}$.`,
        workLines: 4,
      }
    }
  },
}

export const pythagoreanIdentity: Generator = {
  id: 'pythagorean-identity',
  types: ['TRIG.IDENTITY'],
  title: 'Pythagorean Identity: given one ratio, find the others',
  lessons: ['4B.9'],
  description: 'cos²θ + sin²θ = 1 for an acute angle. Exact answers (radicals when needed).',
  generate(rng) {
    const useTriple = rng.bool(0.5)
    let a: number, c: number
    if (useTriple) {
      const [p, q, r] = rng.pick(TRIPLES.slice(0, 4))
      a = rng.bool() ? p : q
      c = r
    } else {
      c = rng.int(3, 11)
      a = rng.int(1, c - 1)
    }
    const b2 = c * c - a * a
    const given = rng.pick(['sin', 'cos'])
    const other = given === 'sin' ? 'cos' : 'sin'
    const otherLatex = surdLatex(surd(1, b2, c))
    const tanLatex = given === 'sin' ? surdLatex(surdDivRoot(surd(a), b2)) : surdLatex(surd(1, b2, a))
    return {
      type: 'short',
      prompt: `$\\theta$ is an acute angle and $\\${given}\\theta = ${fracLatex(a, c)}$. Use the Pythagorean Identity to find the exact values of $\\${other}\\theta$ and $\\tan\\theta$.`,
      answers: [ans(`\\${other}\\theta`, otherLatex, Math.sqrt(b2) / c), ans('\\tan\\theta', tanLatex, given === 'sin' ? a / Math.sqrt(b2) : Math.sqrt(b2) / a)],
      solution: `$\\${other}^2\\theta = 1 - \\left(${fracLatex(a, c)}\\right)^2 = ${fracLatex(b2, c * c)}$, so $\\${other}\\theta = ${otherLatex}$ (positive since $\\theta$ is acute). $\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta} = ${tanLatex}$.`,
      workLines: 5,
    }
  },
}

// ---------------------------------------------------------------- regular polygons inscribed in a circle

const NGON: Record<number, string> = { 5: 'pentagon', 6: 'hexagon', 8: 'octagon', 10: 'decagon', 12: 'dodecagon', 7: 'heptagon', 9: 'nonagon' }

export const inscribedPolygon: Generator = {
  id: 'inscribed-polygon',
  types: ['POLY.REGULAR_CIRCLE'],
  title: 'Perimeter and area of a regular polygon inscribed in a circle',
  lessons: ['4C.11', '4C.12', '4D.16'],
  description: 'Split into isosceles triangles; use trig to find the side and apothem. Round results.',
  options: [placeOpt],
  generate(rng, opts) {
    const places = Number(opts.places ?? 1)
    const n = rng.pick([5, 6, 7, 8, 9, 10, 12])
    const r = rng.int(3, 20)
    const half = 180 / n
    const side = 2 * r * Math.sin(toRad(half))
    const apothem = r * Math.cos(toRad(half))
    const P = n * side
    const A = 0.5 * apothem * P
    const d = diagram().pt('O', 0, 0, 'O')
    const ids: string[] = []
    for (let i = 0; i < n; i++) {
      const p = polar(2, -90 - half + (360 / n) * i)
      ids.push(`V${i}`)
      d.hp(`V${i}`, p.x, p.y)
    }
    d.poly(ids)
    const m = polar(2 * Math.cos(toRad(half)), -90)
    d.hp('M', m.x, m.y).seg('O', 'V0', { label: String(r) }).seg('O', 'M', { dashed: true, label: 'a', labelSide: -1 }).right('O', 'M', 'V0')
    d.circle('O', 2)
    return {
      type: 'short',
      prompt: `A regular ${NGON[n]} is inscribed in a circle of radius ${r} cm. Find (a) the length of one side, (b) the perimeter, and (c) the area of the ${NGON[n]}. Round to ${placeWord(places)}.`,
      diagram: d.build(190),
      answers: [
        ans('(a)', `${fixed(side, places)} \\text{ cm}`, round(side, places)),
        ans('(b)', `${fixed(P, places)} \\text{ cm}`, round(P, places)),
        ans('(c)', `${fixed(A, places)} \\text{ cm}^2`, round(A, places)),
      ],
      solution: `Each central angle is $\\frac{360^\\circ}{${n}} = ${fmtN(360 / n)}^\\circ$; half of it is $${fmtN(half)}^\\circ$. Side $= 2(${r})\\sin(${fmtN(half)}^\\circ) \\approx ${fixed(side, 3)}$, apothem $a = ${r}\\cos(${fmtN(half)}^\\circ) \\approx ${fixed(apothem, 3)}$. Area $= \\frac{1}{2}aP$.`,
      workLines: 6,
    }
  },
}

// ---------------------------------------------------------------- radians, arc length, sectors

export const radians: Generator = {
  id: 'radians',
  types: ['RAD.MEASURE'],
  title: 'Radian measure, arc length, sector area',
  lessons: ['4D.13'],
  description: 'Convert degrees ↔ radians (exact, in terms of π); s = rθ; sector area ½r²θ (honors).',
  options: [
    {
      key: 'variant',
      label: 'Variant',
      default: 'any',
      choices: [
        { value: 'any', label: 'Any' },
        { value: 'convert', label: 'Conversions' },
        { value: 'arc', label: 'Arc length' },
        { value: 'sector', label: 'Sector area (honors)' },
      ],
    },
  ],
  generate(rng, opts) {
    const variant = !opts.variant || opts.variant === 'any' ? rng.pick(['convert', 'arc', 'sector']) : opts.variant
    const nice = [30, 45, 60, 90, 120, 135, 150, 210, 225, 240, 270, 300, 315, 330, 20, 36, 40, 72, 100, 160]
    if (variant === 'convert') {
      const [d1, d2] = rng.shuffle(nice).slice(0, 2)
      const nonNice = rng.int(1, 5) / 2 // radians not in terms of π
      return {
        type: 'short',
        prompt: `(a) Convert $${d1}^\\circ$ to radians (exact, in terms of $\\pi$).\n\n(b) Convert $${degToPiLatex(d2)}$ radians to degrees.\n\n(c) Convert $${nonNice}$ radians to degrees. Round to the nearest tenth.`,
        answers: [
          ans('(a)', degToPiLatex(d1), toRad(d1)),
          ans('(b)', `${d2}^\\circ`, d2),
          ans('(c)', `${fixed(toDeg(nonNice), 1)}^\\circ`, round(toDeg(nonNice), 1)),
        ],
        solution: `Multiply degrees by $\\frac{\\pi}{180}$; multiply radians by $\\frac{180}{\\pi}$.`,
        workLines: 4,
      }
    }
    const r = rng.int(3, 15)
    const deg = rng.pick(nice)
    const thetaLatex = degToPiLatex(deg)
    const d = diagram().pt('O', 0, 0, 'O')
    const a1 = rng.int(-30, 30)
    const pA = polar(2, a1)
    const pB = polar(2, a1 + deg)
    d.pt('A', pA.x, pA.y).pt('B', pB.x, pB.y).seg('O', 'A', { label: String(r) }).seg('O', 'B').angle('A', 'O', 'B', { label: piText(deg), reflex: deg > 180 })
    d.circle('O', 2).arc('O', 'A', 'B')
    if (deg > 180) d.shapes = d.shapes.filter((s) => s.kind !== 'arc')
    if (variant === 'arc') {
      const s = (r * deg) / 180 // coefficient of π
      const sLatex = piCoef(r * deg, 180)
      return {
        type: 'short',
        prompt: `A circle has radius ${r} cm. Find the length of the arc intercepted by a central angle of $${thetaLatex}$ radians. Give the exact answer and a decimal rounded to the nearest tenth.`,
        diagram: d.build(170),
        answers: [ans('s', `${sLatex} \\approx ${fixed(s * Math.PI, 1)} \\text{ cm}`, round(s * Math.PI, 1))],
        solution: `$s = r\\theta = ${r} \\cdot ${thetaLatex} = ${sLatex}$ cm.`,
        workLines: 3,
      }
    }
    const area = (r * r * deg) / 360 // coefficient of π (½ r² θ)
    const aLatex = piCoef(r * r * deg, 360)
    return {
      type: 'short',
      prompt: `Find the area of a sector of a circle with radius ${r} in and central angle $${thetaLatex}$ radians. Give the exact answer and a decimal rounded to the nearest tenth.`,
      diagram: d.build(170),
      answers: [ans('A', `${aLatex} \\approx ${fixed(area * Math.PI, 1)} \\text{ in}^2`, round(area * Math.PI, 1))],
      solution: `$A = \\frac{1}{2}r^2\\theta = \\frac{1}{2}(${r})^2 \\cdot ${thetaLatex} = ${aLatex}$ in².`,
      workLines: 3,
    }
  },
}

/** Plain text for deg in radians, e.g. "5π/6". */
function piText(deg: number): string {
  const g = gcd(deg, 180)
  const n = deg / g
  const d = 180 / g
  const top = n === 1 ? 'π' : `${n}π`
  return d === 1 ? top : `${top}/${d}`
}

/** LaTeX for (num/den)π. */
function piCoef(num: number, den: number): string {
  const g = gcd(num, den)
  const n = num / g
  const d = den / g
  const top = n === 1 ? '\\pi' : `${n}\\pi`
  return d === 1 ? top : `\\frac{${top}}{${d}}`
}

// ---------------------------------------------------------------- unit circle

const SPECIAL = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]

export const unitCircle: Generator = {
  id: 'unit-circle',
  types: ['UC.COORDINATES'],
  title: 'Unit circle exact values',
  lessons: ['4D.14', '4D.15'],
  description: 'Exact sin, cos, tan (and csc, sec, cot for honors) of special angles in degrees or radians, including negative and coterminal angles.',
  options: [
    {
      key: 'fns',
      label: 'Functions',
      default: 'basic',
      choices: [
        { value: 'basic', label: 'sin, cos, tan' },
        { value: 'all', label: 'All six (honors)' },
      ],
    },
    {
      key: 'units',
      label: 'Angle units',
      default: 'mixed',
      choices: [
        { value: 'deg', label: 'Degrees' },
        { value: 'rad', label: 'Radians' },
        { value: 'mixed', label: 'Mixed' },
      ],
    },
    {
      key: 'count',
      label: 'Items',
      default: '6',
      choices: ['4', '6', '8', '10'].map((v) => ({ value: v, label: v })),
    },
  ],
  generate(rng, opts) {
    const fns = (opts.fns === 'all' ? ['sin', 'cos', 'tan', 'csc', 'sec', 'cot'] : ['sin', 'cos', 'tan']) as (
      | 'sin'
      | 'cos'
      | 'tan'
      | 'csc'
      | 'sec'
      | 'cot'
    )[]
    const count = Number(opts.count || 6)
    const items: { q: string; a: string; v: number }[] = []
    const used = new Set<string>()
    while (items.length < count) {
      const fn = rng.pick(fns)
      let deg = rng.pick(SPECIAL)
      // Occasionally a negative or coterminal angle.
      const twist = rng.next()
      if (twist < 0.15) deg = deg - 360
      else if (twist < 0.25) deg = deg + 360
      const units = opts.units === 'deg' ? 'deg' : opts.units === 'rad' ? 'rad' : rng.pick(['deg', 'rad'])
      const angLatex = units === 'deg' ? `${deg}^\\circ` : degToPiLatex(deg)
      const key = `${fn}${deg}`
      if (used.has(key)) continue
      used.add(key)
      items.push({ q: `\\${fn}\\left(${angLatex}\\right)`, a: exactTrig(fn, deg), v: trigNumeric(fn, deg) })
    }
    const letter = (i: number) => String.fromCharCode(97 + i)
    return {
      type: 'short',
      prompt: `Find the exact value. Write "undefined" if the value does not exist.\n\n${items.map((it, i) => `(${letter(i)}) $${it.q}$`).join('\u2003\u2003')}`,
      answers: items.map((it, i) => ans(`(${letter(i)})`, it.a, Number.isNaN(it.v) ? undefined : it.v)),
      solution: 'Use the reference angle for the value and the quadrant for the sign.',
      workLines: 2,
    }
  },
}

export const referenceCoterminal: Generator = {
  id: 'reference-coterminal',
  types: ['UC.COORDINATES'],
  title: 'Reference angles and coterminal angles',
  lessons: ['4D.15', '4D.14'],
  description: 'Find a reference angle, the quadrant, and positive/negative coterminal angles (degrees or radians).',
  generate(rng) {
    const deg = rng.intExcept(-350, 700, [0])
    const norm = ((deg % 360) + 360) % 360
    if (norm % 90 === 0) return referenceCoterminal.generate(rng, {})
    const quadrant = norm < 90 ? 'I' : norm < 180 ? 'II' : norm < 270 ? 'III' : 'IV'
    const ref = norm < 90 ? norm : norm < 180 ? 180 - norm : norm < 270 ? norm - 180 : 360 - norm
    const radDeg = rng.pick([150, 210, 300, 135, 240, 330, 225, 120, 315])
    const radRef = radDeg < 180 ? 180 - radDeg : radDeg < 270 ? radDeg - 180 : 360 - radDeg
    return {
      type: 'short',
      prompt: `(a) An angle in standard position measures $${deg}^\\circ$. In which quadrant is its terminal side? Find its reference angle.\n\n(b) Find one positive and one negative angle coterminal with $${deg}^\\circ$.\n\n(c) Find the reference angle of $${degToPiLatex(radDeg)}$ in radians.`,
      answers: [
        ans('(a)', `\\text{Quadrant ${quadrant}},\\ ${ref}^\\circ`),
        ans('(b)', `\\text{e.g. } ${norm === deg ? norm + 360 : norm}^\\circ,\\ ${norm - 360 === deg ? norm - 720 : norm - 360}^\\circ`),
        ans('(c)', degToPiLatex(radRef), toRad(radRef)),
      ],
      solution: `Add or subtract multiples of $360^\\circ$ for coterminal angles. ${deg}° is coterminal with ${norm}°.`,
      workLines: 4,
    }
  },
}

// ---------------------------------------------------------------- oblique triangles

function obliqueFigure(rng: Rng, A: number, B: number) {
  const L = letters(rng, 3)
  const t = triangleFromAngles(A, B, 5)
  const d = diagram().pt(L[0], t.A.x, t.A.y).pt(L[1], t.B.x, t.B.y).pt(L[2], t.C.x, t.C.y)
  return { d, L, t }
}

export const areaSine: Generator = {
  id: 'area-sine',
  types: ['OBL.AREA_SAS'],
  title: 'Area of a triangle = ½ab sin C',
  lessons: ['4D.16'],
  description: 'Two sides and the included angle. Honors option: area of a regular polygon.',
  options: [placeOpt],
  generate(rng, opts) {
    const places = Number(opts.places ?? 1)
    const C = rng.int(25, 150)
    const a = rng.int(4, 20)
    const b = rng.int(4, 20)
    const area = 0.5 * a * b * Math.sin(toRad(C))
    const L = letters(rng, 3)
    // C at vertex L[2], sides a = BC, b = AC
    const c = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(toRad(C)))
    const t = triangleFromSides(a, b, c)
    const d = diagram().pt(L[0], t.A.x, t.A.y).pt(L[1], t.B.x, t.B.y).pt(L[2], t.C.x, t.C.y)
    d.seg(L[0], L[1]).seg(L[1], L[2], { label: String(a) }).seg(L[2], L[0], { label: String(b) }).angle(L[0], L[2], L[1], { label: `${C}°` })
    return {
      type: 'short',
      prompt: `Find the area of $\\triangle ${L.join('')}$. Round to ${placeWord(places)}.`,
      diagram: d.build(230),
      answers: [ans('\\text{Area}', `${fixed(area, places)} \\text{ units}^2`, round(area, places))],
      distractors: numericDistractors(rng, round(area, places), [round(a * b * Math.sin(toRad(C)), places), round(0.5 * a * b * Math.cos(toRad(C)), places), round(0.5 * a * b, places)], 3, places),
      solution: `$A = \\frac{1}{2}ab\\sin C = \\frac{1}{2}(${a})(${b})\\sin(${C}^\\circ) \\approx ${fixed(area, places)}$.`,
      workLines: 3,
    }
  },
}

export const lawOfSines: Generator = {
  id: 'law-of-sines',
  types: ['OBL.LAW_OF_SINES'],
  title: 'Law of Sines (AAS / ASA)',
  lessons: ['4D.17'],
  description: 'Two angles and a side: find a missing side (and the third angle).',
  options: [placeOpt],
  generate(rng, opts) {
    const places = Number(opts.places ?? 1)
    const A = rng.int(30, 85)
    const B = rng.int(30, 85)
    const C = 180 - A - B
    if (C < 20) return lawOfSines.generate(rng, opts)
    const { d, L } = obliqueFigure(rng, A, B)
    const [P, Q, R] = L
    // sides: a = QR (opp P), b = PR (opp Q), c = PQ (opp R)
    const known = rng.pick(['a', 'b', 'c'])
    const kv = rng.int(6, 30)
    const angOf: Record<string, number> = { a: A, b: B, c: C }
    const k = kv / Math.sin(toRad(angOf[known]))
    const sides = { a: k * Math.sin(toRad(A)), b: k * Math.sin(toRad(B)), c: k * Math.sin(toRad(C)) }
    const unknown = rng.pick(['a', 'b', 'c'].filter((s) => s !== known))
    const segFor: Record<string, [string, string]> = { a: [Q, R], b: [P, R], c: [P, Q] }
    for (const s of ['a', 'b', 'c']) d.seg(segFor[s][0], segFor[s][1], { label: s === known ? String(kv) : s === unknown ? 'x' : '' })
    // Show two angles: the one opposite the unknown is maybe not given (AAS vs ASA)
    const shownAngles = rng.shuffle(['a', 'b', 'c']).slice(0, 2)
    const vertexFor: Record<string, [string, string, string]> = { a: [Q, P, R], b: [P, Q, R], c: [P, R, Q] }
    for (const s of shownAngles) {
      const [x1, v, x2] = vertexFor[s]
      d.angle(x1, v, x2, { label: `${angOf[s]}°` })
    }
    const x = sides[unknown as 'a' | 'b' | 'c']
    const thirdNeeded = !shownAngles.includes(unknown) || !shownAngles.includes(known)
    return {
      type: 'short',
      prompt: `Find $x$. Round to ${placeWord(places)}.`,
      diagram: d.build(250),
      answers: [ans('x', fixed(x, places), round(x, places))],
      solution: `${thirdNeeded ? `First, the third angle is $180^\\circ - ${shownAngles.map((s) => angOf[s]).join('^\\circ - ')}^\\circ = ${angOf[['a', 'b', 'c'].find((s) => !shownAngles.includes(s))!]}^\\circ$. ` : ''}$\\frac{x}{\\sin(${angOf[unknown]}^\\circ)} = \\frac{${kv}}{\\sin(${angOf[known]}^\\circ)}$, so $x \\approx ${fixed(x, places)}$.`,
      workLines: 5,
    }
  },
}

export const ambiguousCase: Generator = {
  id: 'ambiguous-case',
  types: ['CRIT.SSA_COUNT', 'OBL.LAW_OF_SINES'],
  title: 'Law of Sines: the ambiguous case (SSA)',
  lessons: ['4D.18'],
  description: 'Given A, a, b: decide whether there are 0, 1, or 2 triangles (height test h = b sin A) and find B.',
  generate(rng) {
    let A = 0
    let b = 0
    let a = 0
    let h = 0
    for (let tries = 0; ; tries++) {
      A = rng.int(25, 70)
      b = rng.int(10, 30)
      h = b * Math.sin(toRad(A))
      const want = rng.pick([0, 1, 2])
      const options: number[] = []
      for (let k = 2; k <= b + 10; k++) {
        const n = k < h - 1e-9 ? 0 : k >= b || Math.abs(k - h) < 1e-9 ? 1 : 2
        if (n === want) options.push(k)
      }
      if (options.length) {
        a = rng.pick(options)
        break
      }
      if (tries > 50) throw new Error('ambiguous-case: no options')
    }
    const n = a < h - 1e-9 ? 0 : a >= b || Math.abs(a - h) < 1e-9 ? 1 : 2
    const sinB = (b * Math.sin(toRad(A))) / a
    const B1 = sinB <= 1 ? toDeg(Math.asin(sinB)) : NaN
    const B2 = 180 - B1
    const L = letters(rng, 3)
    const [P, Q, R] = L
    const answers =
      n === 0
        ? [ans('\\text{triangles}', 0), ans(`m\\angle ${Q}`, '\\text{none}')]
        : n === 1
          ? [ans('\\text{triangles}', 1), ans(`m\\angle ${Q}`, `${fixed(B1, 1)}^\\circ`, round(B1, 1))]
          : [ans('\\text{triangles}', 2), ans(`m\\angle ${Q}`, `${fixed(B1, 1)}^\\circ \\text{ or } ${fixed(B2, 1)}^\\circ`)]
    return {
      type: 'short',
      prompt: `In $\\triangle ${P}${Q}${R}$, $m\\angle ${P} = ${A}^\\circ$, $${Q}${R} = ${a}$, and $${P}${R} = ${b}$. How many triangles are possible? Find every possible $m\\angle ${Q}$ to the nearest tenth of a degree.`,
      answers,
      solution: `Height $h = ${b}\\sin(${A}^\\circ) \\approx ${fixed(h, 2)}$. ${n === 0 ? `$${a} < h$, so no triangle.` : n === 1 ? `$${a} \\ge ${b}$, so one triangle. $\\sin ${Q} = \\frac{${b}\\sin(${A}^\\circ)}{${a}}$.` : `$h < ${a} < ${b}$, so two triangles: $${Q} \\approx ${fixed(B1, 1)}^\\circ$ or $180^\\circ - ${fixed(B1, 1)}^\\circ$.`}`,
      workLines: 6,
    }
  },
}

export const lawOfCosines: Generator = {
  id: 'law-of-cosines',
  types: ['OBL.LAW_OF_COSINES'],
  title: 'Law of Cosines (SAS and SSS)',
  lessons: ['4D.19', '4D.20'],
  description: 'SAS: find the third side. SSS: find an angle with cos C = (a² + b² − c²)/(2ab).',
  options: [
    {
      key: 'variant',
      label: 'Case',
      default: 'any',
      choices: [
        { value: 'any', label: 'Either' },
        { value: 'sas', label: 'SAS: find a side' },
        { value: 'sss', label: 'SSS: find an angle' },
      ],
    },
    placeOpt,
  ],
  generate(rng, opts) {
    const places = Number(opts.places ?? 1)
    const variant = !opts.variant || opts.variant === 'any' ? rng.pick(['sas', 'sss']) : opts.variant
    const L = letters(rng, 3)
    const [P, Q, R] = L
    if (variant === 'sas') {
      const C = rng.int(20, 150)
      const a = rng.int(5, 25)
      const b = rng.int(5, 25)
      const c = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(toRad(C)))
      const t = triangleFromSides(a, b, c)
      const d = diagram().pt(P, t.A.x, t.A.y).pt(Q, t.B.x, t.B.y).pt(R, t.C.x, t.C.y)
      d.seg(P, Q, { label: 'x' }).seg(Q, R, { label: String(a) }).seg(R, P, { label: String(b) }).angle(P, R, Q, { label: `${C}°` })
      return {
        type: 'short',
        prompt: `Find $x$. Round to ${placeWord(places)}.`,
        diagram: d.build(240),
        answers: [ans('x', fixed(c, places), round(c, places))],
        distractors: numericDistractors(rng, round(c, places), [round(Math.sqrt(a * a + b * b + 2 * a * b * Math.cos(toRad(C))), places), round(Math.sqrt(a * a + b * b), places), round(a + b - c, places)], 3, places),
        solution: `$x^2 = ${a}^2 + ${b}^2 - 2(${a})(${b})\\cos(${C}^\\circ) \\approx ${fixed(c * c, 2)}$, so $x \\approx ${fixed(c, places)}$.`,
        workLines: 4,
      }
    }
    let a: number, b: number, c: number
    do {
      a = rng.int(4, 20)
      b = rng.int(4, 20)
      c = rng.int(4, 20)
    } while (a + b <= c || a + c <= b || b + c <= a)
    const t = triangleFromSides(a, b, c)
    const angC = toDeg(Math.acos((a * a + b * b - c * c) / (2 * a * b)))
    const d = diagram().pt(P, t.A.x, t.A.y).pt(Q, t.B.x, t.B.y).pt(R, t.C.x, t.C.y)
    d.seg(P, Q, { label: String(c) }).seg(Q, R, { label: String(a) }).seg(R, P, { label: String(b) })
    return {
      type: 'short',
      prompt: `Find $m\\angle ${R}$. Round to ${placeWord(places)} degree.`,
      diagram: d.build(240),
      answers: [ans(`m\\angle ${R}`, `${fixed(angC, places)}^\\circ`, round(angC, places))],
      solution: `$\\cos ${R} = \\frac{${a}^2 + ${b}^2 - ${c}^2}{2(${a})(${b})} = ${fracLatex(a * a + b * b - c * c, 2 * a * b)}$, so $m\\angle ${R} \\approx ${fixed(angC, places)}^\\circ$.`,
      workLines: 4,
    }
  },
}

export const heron: Generator = {
  id: 'heron',
  types: ['OBL.HERON'],
  title: "Heron's Formula",
  lessons: ['4D.21'],
  description: 'Area from three sides using the semiperimeter. Honors option: inradius from Area = r·s.',
  options: [
    {
      key: 'inradius',
      label: 'Inradius part',
      default: 'no',
      choices: [
        { value: 'no', label: 'No' },
        { value: 'yes', label: 'Yes (honors)' },
      ],
    },
  ],
  generate(rng, opts) {
    let a: number, b: number, c: number
    do {
      a = rng.int(5, 20)
      b = rng.int(5, 20)
      c = rng.int(5, 20)
    } while (a + b <= c + 1 || a + c <= b + 1 || b + c <= a + 1)
    const s = (a + b + c) / 2
    const prod = s * (s - a) * (s - b) * (s - c)
    const area = Math.sqrt(prod)
    const isInt = Math.abs(area - Math.round(area)) < 1e-9
    const L = letters(rng, 3)
    const t = triangleFromSides(a, b, c)
    const d = diagram().pt(L[0], t.A.x, t.A.y).pt(L[1], t.B.x, t.B.y).pt(L[2], t.C.x, t.C.y)
    d.seg(L[0], L[1], { label: String(c) }).seg(L[1], L[2], { label: String(a) }).seg(L[2], L[0], { label: String(b) })
    const inr = opts.inradius === 'yes'
    return {
      type: 'short',
      prompt: `Use Heron's Formula to find the area of the triangle. Round to the nearest tenth.${inr ? ' Then find the radius of the inscribed circle.' : ''}`,
      diagram: d.build(230),
      answers: [
        ans('s', String(s), s),
        ans('\\text{Area}', isInt ? String(area) : `${fixed(area, 1)}`, round(area, 1)),
        ...(inr ? [ans('r', fixed(area / s, 2), round(area / s, 2))] : []),
      ],
      solution: `$s = \\frac{${a} + ${b} + ${c}}{2} = ${s}$. $A = \\sqrt{${s}(${s - a})(${s - b})(${s - c})} = \\sqrt{${prod}} \\approx ${fixed(area, 2)}$.${inr ? ` $r = \\frac{A}{s} \\approx ${fixed(area / s, 2)}$.` : ''}`,
      workLines: 5,
    }
  },
}

export const unit4Generators: Generator[] = [
  specialRight,
  trigRatios,
  trigFindSide,
  trigFindAngle,
  elevationDepression,
  cofunction,
  pythagoreanIdentity,
  inscribedPolygon,
  radians,
  unitCircle,
  referenceCoterminal,
  areaSine,
  lawOfSines,
  ambiguousCase,
  lawOfCosines,
  heron,
]
