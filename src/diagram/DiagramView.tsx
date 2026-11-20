import type React from 'react'
import type { AngleShape, Diagram, DPoint, Shape } from '../model/types'
import {
  add,
  clipLine,
  dist,
  frameOf,
  type Frame,
  len,
  mul,
  norm,
  perp,
  pointMap,
  polar,
  sub,
  type Vec,
} from './geom'

const FONT = "'KaTeX_Main', 'Times New Roman', Times, serif"
const FONT_SIZE = 15
const STROKE = '#111'

const UPRIGHT_WORDS = new Set(['sin', 'cos', 'tan', 'csc', 'sec', 'cot', 'cm', 'mm', 'km', 'in', 'ft', 'yd', 'mi', 'units', 'unit', 'not', 'to', 'scale', 'rad'])

/** Approximate rendered width (px) of a label at the default font size. */
export function textWidth(text: string): number {
  let w = 0
  for (const ch of text) w += /[()\s.,'′]/.test(ch) ? 4.5 : /[°]/.test(ch) ? 6 : /[mwMW]/.test(ch) ? 11 : 7.6
  return w
}

/** Typographic minus signs for "3x - 5", "-4". */
const prettyMinus = (t: string) => t.replace(/ - /g, ' − ').replace(/(^|[\s(=])-(?=[\d\w(√π])/g, '$1−')

/** Split label text into tspans, italicizing variable letters. */
export function LabelText({ text: raw }: { text: string }) {
  const text = prettyMinus(raw)
  const parts: React.ReactNode[] = []
  const re = /([A-Za-z]+)|([^A-Za-z]+)/g
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    const t = m[0]
    if (m[1] && !UPRIGHT_WORDS.has(t)) {
      parts.push(
        <tspan key={i++} fontStyle="italic">
          {t}
        </tspan>,
      )
    } else {
      parts.push(<tspan key={i++}>{t}</tspan>)
    }
  }
  return <>{parts}</>
}

interface Interaction {
  selectedId?: string | null
  onPointDown?: (id: string, e: React.PointerEvent) => void
  onShapeDown?: (id: string, e: React.PointerEvent) => void
  onBackgroundDown?: (e: React.PointerEvent<SVGSVGElement>) => void
  onMove?: (e: React.PointerEvent<SVGSVGElement>) => void
  onUp?: (e: React.PointerEvent<SVGSVGElement>) => void
  /** Highlight these point ids (e.g. tool in progress). */
  pending?: string[]
  svgRef?: React.Ref<SVGSVGElement>
  /** Draw invisible helper points too (editor mode). */
  showHidden?: boolean
}

interface Props extends Interaction {
  diagram: Diagram
  className?: string
}

export function DiagramView({ diagram, className, ...ix }: Props) {
  const f = frameOf(diagram)
  const pts = pointMap(diagram)
  const P = (id: string): Vec | null => {
    const p = pts.get(id)
    return p ? f.px(p) : null
  }
  const editing = !!ix.onPointDown

  // Centroid of visible points (pixel space), used to push labels outward.
  const visible = diagram.points.filter((p) => !p.hidden)
  const centroid: Vec = visible.length
    ? mul(
        visible.map((p) => f.px(p)).reduce((s, p) => add(s, p), { x: 0, y: 0 }),
        1 / visible.length,
      )
    : { x: f.width / 2, y: f.height / 2 }

  const neighbors = neighborMap(diagram)
  /** Centroid of the figure a segment belongs to (its endpoints and their neighbors). */
  const localCentroid = (sh: Shape): Vec => {
    if (sh.kind !== 'segment') return centroid
    const ids = new Set([sh.a, sh.b, ...(neighbors.get(sh.a) ?? []), ...(neighbors.get(sh.b) ?? [])])
    const ps = [...ids].map((id) => P(id)).filter((v): v is Vec => !!v)
    if (ps.length <= 2) return centroid
    return mul(ps.reduce((acc, v) => add(acc, v), { x: 0, y: 0 }), 1 / ps.length)
  }
  const obstacles = new Map<string, Vec[]>()
  for (const sh of diagram.shapes) {
    if (sh.kind !== 'angle' || (!sh.label && !sh.arcs && !sh.right)) continue
    const v = P(sh.vertex)
    const a = P(sh.a)
    const b = P(sh.b)
    if (!v || !a || !b) continue
    let bis = add(norm(sub(a, v)), norm(sub(b, v)))
    if (Math.hypot(bis.x, bis.y) < 1e-6) bis = perp(norm(sub(a, v)))
    if (sh.reflex) bis = mul(bis, -1)
    obstacles.set(sh.vertex, [...(obstacles.get(sh.vertex) ?? []), add(v, mul(norm(bis), 30))])
  }

  return (
    <svg
      ref={ix.svgRef}
      className={className}
      width={f.width}
      height={f.height}
      viewBox={`0 0 ${f.width} ${f.height}`}
      style={{ overflow: 'visible', touchAction: editing ? 'none' : undefined, userSelect: 'none' }}
      onPointerDown={ix.onBackgroundDown}
      onPointerMove={ix.onMove}
      onPointerUp={ix.onUp}
      fontFamily={FONT}
      fontSize={FONT_SIZE}
    >
      {editing && <rect x={0} y={0} width={f.width} height={f.height} fill="#fff" stroke="#ddd" />}
      {diagram.grid && <Grid diagram={diagram} f={f} />}
      {diagram.shapes
        .filter((s) => s.kind === 'polygon')
        .map((s) => (
          <ShapeView key={s.id} s={s} f={f} P={P} centroid={centroid} ix={ix} />
        ))}
      {diagram.shapes
        .filter((s) => s.kind !== 'polygon')
        .map((s) => (
          <ShapeView key={s.id} s={s} f={f} P={P} centroid={localCentroid(s)} ix={ix} />
        ))}
      {diagram.points.map((p) => (
        <PointView
          key={p.id}
          p={p}
          f={f}
          centroid={centroid}
          neighbors={[...(neighbors.get(p.id) ?? []).map((id) => P(id)).filter((v): v is Vec => !!v), ...(obstacles.get(p.id) ?? [])]}
          ix={ix}
        />
      ))}
      {diagram.notToScale && (
        <text x={f.width} y={f.height + 4} textAnchor="end" fontSize={11} fontStyle="italic" fill="#444" dominantBaseline="hanging">
          Not drawn to scale
        </text>
      )}
    </svg>
  )
}

function neighborMap(d: Diagram): Map<string, string[]> {
  const m = new Map<string, string[]>()
  const link = (a: string, b: string) => {
    if (a === b) return
    m.set(a, [...(m.get(a) ?? []), b])
    m.set(b, [...(m.get(b) ?? []), a])
  }
  const one = (a: string, b: string) => {
    if (a !== b) m.set(a, [...(m.get(a) ?? []), b])
  }
  const pts = new Map(d.points.map((p) => [p.id, p]))
  const tol = (d.view.xmax - d.view.xmin) * 1e-3
  for (const s of d.shapes) {
    if (s.kind === 'segment' || s.kind === 'line' || s.kind === 'ray') {
      link(s.a, s.b)
      // Points lying on the interior of the segment/line see both directions.
      const A = pts.get(s.a)
      const B = pts.get(s.b)
      if (!A || !B) continue
      const L = Math.hypot(B.x - A.x, B.y - A.y)
      if (L < 1e-9) continue
      for (const p of d.points) {
        if (p.id === s.a || p.id === s.b) continue
        const t = ((p.x - A.x) * (B.x - A.x) + (p.y - A.y) * (B.y - A.y)) / (L * L)
        const off = Math.abs((p.x - A.x) * (B.y - A.y) - (p.y - A.y) * (B.x - A.x)) / L
        const inside = s.kind === 'segment' ? t > 0 && t < 1 : s.kind === 'ray' ? t > 0 : true
        if (off < tol && inside) {
          one(p.id, s.b)
          if (s.kind === 'segment' || t > 0) one(p.id, s.a)
        }
      }
    } else if (s.kind === 'polygon') s.points.forEach((p, i) => link(p, s.points[(i + 1) % s.points.length]))
    else if (s.kind === 'angle') {
      link(s.vertex, s.a)
      link(s.vertex, s.b)
    } else if (s.kind === 'circle' && s.through) link(s.center, s.through)
  }
  return m
}

function Grid({ diagram, f }: { diagram: Diagram; f: Frame }) {
  const g = diagram.grid!
  const { xmin, xmax, ymin, ymax } = diagram.view
  const lines: React.ReactNode[] = []
  const step = g.step || 1
  const every = g.numberEvery ?? 1
  const startX = Math.ceil(xmin / step) * step
  const startY = Math.ceil(ymin / step) * step
  let k = 0
  for (let x = startX; x <= xmax + 1e-9; x += step) {
    const p = f.px({ x, y: 0 })
    lines.push(<line key={`gx${k++}`} x1={p.x} x2={p.x} y1={0} y2={f.height} stroke="#cfd6de" strokeWidth={0.7} />)
  }
  for (let y = startY; y <= ymax + 1e-9; y += step) {
    const p = f.px({ x: 0, y })
    lines.push(<line key={`gy${k++}`} y1={p.y} y2={p.y} x1={0} x2={f.width} stroke="#cfd6de" strokeWidth={0.7} />)
  }
  const o = f.px({ x: 0, y: 0 })
  const axes: React.ReactNode[] = []
  if (g.axes) {
    if (o.y >= 0 && o.y <= f.height) {
      axes.push(<line key="ax" x1={0} x2={f.width} y1={o.y} y2={o.y} stroke="#333" strokeWidth={1.2} />)
      axes.push(<Head key="axh1" at={{ x: f.width, y: o.y }} dir={{ x: 1, y: 0 }} />)
      axes.push(<Head key="axh2" at={{ x: 0, y: o.y }} dir={{ x: -1, y: 0 }} />)
      axes.push(
        <text key="axl" x={f.width + 4} y={o.y} fontStyle="italic" dominantBaseline="central">
          x
        </text>,
      )
    }
    if (o.x >= 0 && o.x <= f.width) {
      axes.push(<line key="ay" y1={0} y2={f.height} x1={o.x} x2={o.x} stroke="#333" strokeWidth={1.2} />)
      axes.push(<Head key="ayh1" at={{ x: o.x, y: 0 }} dir={{ x: 0, y: -1 }} />)
      axes.push(<Head key="ayh2" at={{ x: o.x, y: f.height }} dir={{ x: 0, y: 1 }} />)
      axes.push(
        <text key="ayl" x={o.x} y={-6} fontStyle="italic" textAnchor="middle">
          y
        </text>,
      )
    }
  }
  const nums: React.ReactNode[] = []
  if (g.numbers && g.axes) {
    let n = 0
    for (let x = startX; x <= xmax + 1e-9; x += step) {
      const idx = Math.round(x / step)
      if (Math.abs(x) < 1e-9 || idx % every !== 0) continue
      const p = f.px({ x, y: 0 })
      if (p.x < 6 || p.x > f.width - 6) continue
      nums.push(
        <text key={`nx${n++}`} x={p.x} y={o.y + 4} fontSize={10} textAnchor="middle" dominantBaseline="hanging" fill="#333">
          {fmtTick(x)}
        </text>,
      )
    }
    for (let y = startY; y <= ymax + 1e-9; y += step) {
      const idx = Math.round(y / step)
      if (Math.abs(y) < 1e-9 || idx % every !== 0) continue
      const p = f.px({ x: 0, y })
      if (p.y < 6 || p.y > f.height - 6) continue
      nums.push(
        <text key={`ny${n++}`} x={o.x - 4} y={p.y} fontSize={10} textAnchor="end" dominantBaseline="central" fill="#333">
          {fmtTick(y)}
        </text>,
      )
    }
  }
  return (
    <g pointerEvents="none">
      {lines}
      {axes}
      {nums}
    </g>
  )
}

const fmtTick = (v: number) => String(Math.round(v * 100) / 100).replace('-', '−')

function Head({ at, dir, size = 9 }: { at: Vec; dir: Vec; size?: number }) {
  const d = norm(dir)
  const n = perp(d)
  const back = sub(at, mul(d, size))
  const p1 = add(back, mul(n, size * 0.45))
  const p2 = sub(back, mul(n, size * 0.45))
  return <path d={`M${at.x},${at.y} L${p1.x},${p1.y} L${p2.x},${p2.y} Z`} fill={STROKE} />
}

/** Tick marks / parallel arrows across a segment at its midpoint (pixel coords). */
function Marks({ a, b, ticks = 0, arrows = 0 }: { a: Vec; b: Vec; ticks?: number; arrows?: number }) {
  const d = norm(sub(b, a))
  const n = perp(d)
  const mid = mul(add(a, b), 0.5)
  const out: React.ReactNode[] = []
  const gap = 4.5
  // When both are present, shift arrows toward b and ticks toward a.
  const tickCenter = arrows ? sub(mid, mul(d, 9)) : mid
  const arrowCenter = ticks ? add(mid, mul(d, 9)) : mid
  for (let i = 0; i < ticks; i++) {
    const c = add(tickCenter, mul(d, (i - (ticks - 1) / 2) * gap))
    const p1 = add(c, mul(n, 6))
    const p2 = sub(c, mul(n, 6))
    out.push(<line key={`t${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={STROKE} strokeWidth={1.4} />)
  }
  for (let i = 0; i < arrows; i++) {
    const c = add(arrowCenter, mul(d, (i - (arrows - 1) / 2) * 6 + 3))
    const back = sub(c, mul(d, 6))
    const p1 = add(back, mul(n, 4.5))
    const p2 = sub(back, mul(n, 4.5))
    out.push(
      <path key={`a${i}`} d={`M${p1.x},${p1.y} L${c.x},${c.y} L${p2.x},${p2.y}`} fill="none" stroke={STROKE} strokeWidth={1.4} />,
    )
  }
  return <>{out}</>
}

interface ShapeProps {
  s: Shape
  f: Frame
  P: (id: string) => Vec | null
  centroid: Vec
  ix: Interaction
}

function ShapeView({ s, f, P, centroid, ix }: ShapeProps) {
  const selected = ix.selectedId === s.id
  const color = selected ? '#1d6fe0' : STROKE
  const sw = s.bold ? 2.6 : 1.6
  const dash = s.dashed ? '6 4' : undefined
  const hit = ix.onShapeDown
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          e.stopPropagation()
          ix.onShapeDown!(s.id, e)
        },
        style: { cursor: 'pointer' },
      }
    : {}

  switch (s.kind) {
    case 'segment': {
      const a = P(s.a)
      const b = P(s.b)
      if (!a || !b) return null
      const mid = mul(add(a, b), 0.5)
      let n = perp(norm(sub(b, a)))
      const side = s.labelSide ?? (dot(sub(mid, centroid), n) >= 0 ? 1 : -1)
      n = mul(n, side)
      const tw = s.label ? textWidth(s.label) : 0
      const nAbs = Math.abs(n.x)
      const labelPos = add(mid, mul(n, 10 + nAbs * tw * 0.5 + (1 - nAbs) * 6))
      return (
        <g>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={sw} strokeDasharray={dash} strokeLinecap="round" />
          <Marks a={a} b={b} ticks={s.ticks} arrows={s.arrows} />
          {s.label && (
            <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="central" fill={color}>
              <LabelText text={s.label} />
            </text>
          )}
          {ix.onShapeDown && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={12} {...hit} />}
        </g>
      )
    }
    case 'line':
    case 'ray': {
      const a = P(s.a)
      const b = P(s.b)
      if (!a || !b) return null
      const d = norm(sub(b, a))
      const m = 4
      const range = clipLine(a, d, m, m, f.width - m, f.height - m)
      if (!range) return null
      const t0 = s.kind === 'ray' ? 0 : range[0]
      const t1 = range[1]
      const p0 = add(a, mul(d, t0))
      const p1 = add(a, mul(d, t1))
      const heads = s.heads !== false
      const labelPos = add(add(p1, mul(d, -14)), mul(perp(d), 12))
      return (
        <g>
          <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={color} strokeWidth={sw} strokeDasharray={dash} />
          {heads && <Head at={p1} dir={d} />}
          {heads && s.kind === 'line' && <Head at={p0} dir={mul(d, -1)} />}
          <Marks a={a} b={b} arrows={s.arrows} />
          {s.label && (
            <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="central" fill={color}>
              <LabelText text={s.label} />
            </text>
          )}
          {ix.onShapeDown && <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="transparent" strokeWidth={12} {...hit} />}
        </g>
      )
    }
    case 'circle': {
      const c = P(s.center)
      if (!c) return null
      const t = s.through ? P(s.through) : null
      const r = t ? dist(c, t) : (s.radius ?? 1) * f.scale
      const lp = add(c, polar(r + 12, -45))
      return (
        <g>
          <circle cx={c.x} cy={c.y} r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={dash} />
          {s.label && (
            <text x={lp.x} y={lp.y} dominantBaseline="central" fill={color}>
              <LabelText text={s.label} />
            </text>
          )}
          {ix.onShapeDown && <circle cx={c.x} cy={c.y} r={r} fill="none" stroke="transparent" strokeWidth={12} {...hit} />}
        </g>
      )
    }
    case 'arc': {
      const c = P(s.center)
      const a = P(s.a)
      const b = P(s.b)
      if (!c || !a || !b) return null
      const r = dist(c, a)
      // World CCW == screen CCW visually; screen angles have y flipped.
      const angA = Math.atan2(a.y - c.y, a.x - c.x)
      const angB = Math.atan2(b.y - c.y, b.x - c.x)
      let sweep = angA - angB // positive = CCW on screen
      if (sweep <= 0) sweep += 2 * Math.PI
      const end = { x: c.x + r * Math.cos(angB), y: c.y + r * Math.sin(angB) }
      const large = sweep > Math.PI ? 1 : 0
      const midAng = angA - sweep / 2
      const lp = { x: c.x + (r + 14) * Math.cos(midAng), y: c.y + (r + 14) * Math.sin(midAng) }
      const d = `M${a.x},${a.y} A${r},${r} 0 ${large} 0 ${end.x},${end.y}`
      return (
        <g>
          <path d={d} fill="none" stroke={color} strokeWidth={sw + 0.6} strokeDasharray={dash} />
          {s.label && (
            <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="central" fill={color}>
              <LabelText text={s.label} />
            </text>
          )}
          {ix.onShapeDown && <path d={d} fill="none" stroke="transparent" strokeWidth={12} {...hit} />}
        </g>
      )
    }
    case 'angle':
      return <AngleView s={s} P={P} color={color} hit={hit} />
    case 'polygon': {
      const ps = s.points.map(P)
      if (ps.some((p) => !p)) return null
      const d = ps.map((p, i) => `${i ? 'L' : 'M'}${p!.x},${p!.y}`).join(' ') + ' Z'
      return (
        <g>
          <path
            d={d}
            fill={s.fill ?? 'none'}
            stroke={s.fill && !s.bold ? 'none' : color}
            strokeWidth={sw}
            strokeDasharray={dash}
            strokeLinejoin="round"
            {...(ix.onShapeDown ? hit : {})}
          />
          {selected && <path d={d} fill="none" stroke={color} strokeWidth={2} strokeDasharray="3 3" />}
        </g>
      )
    }
    case 'text': {
      const p = f.px({ x: s.x, y: s.y })
      return (
        <text
          x={p.x}
          y={p.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={s.size ?? FONT_SIZE}
          fill={color}
          {...hit}
        >
          <LabelText text={s.text} />
        </text>
      )
    }
  }
}

const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y

function AngleView({
  s,
  P,
  color,
  hit,
}: {
  s: AngleShape
  P: (id: string) => Vec | null
  color: string
  hit: Record<string, unknown>
}) {
  const v = P(s.vertex)
  const a = P(s.a)
  const b = P(s.b)
  if (!v || !a || !b) return null
  const ua = norm(sub(a, v))
  const ub = norm(sub(b, v))
  const t1 = Math.atan2(ua.y, ua.x)
  let delta = Math.atan2(ub.y, ub.x) - t1
  while (delta <= -Math.PI) delta += 2 * Math.PI
  while (delta > Math.PI) delta -= 2 * Math.PI
  if (s.reflex) delta = delta > 0 ? delta - 2 * Math.PI : delta + 2 * Math.PI
  const r0 = s.size ?? 18
  const arcs = s.arcs ?? 1
  const els: React.ReactNode[] = []
  if (s.right) {
    const k = 11
    const p1 = add(v, mul(ua, k))
    const p2 = add(add(v, mul(ua, k)), mul(ub, k))
    const p3 = add(v, mul(ub, k))
    els.push(<path key="r" d={`M${p1.x},${p1.y} L${p2.x},${p2.y} L${p3.x},${p3.y}`} fill="none" stroke={color} strokeWidth={1.3} />)
  } else {
    for (let i = 0; i < arcs; i++) {
      const r = r0 + i * 4
      const p1 = { x: v.x + r * Math.cos(t1), y: v.y + r * Math.sin(t1) }
      const p2 = { x: v.x + r * Math.cos(t1 + delta), y: v.y + r * Math.sin(t1 + delta) }
      const large = Math.abs(delta) > Math.PI ? 1 : 0
      const sweep = delta > 0 ? 1 : 0
      els.push(
        <path key={i} d={`M${p1.x},${p1.y} A${r},${r} 0 ${large} ${sweep} ${p2.x},${p2.y}`} fill="none" stroke={color} strokeWidth={1.3} />,
      )
    }
  }
  if (s.label) {
    const mid = t1 + delta / 2
    // Push the label out along the bisector until its box fits between the two rays,
    // but keep it near the vertex (shrinking the font if the angle is too tight).
    const half = Math.abs(delta) / 2
    const base = (s.right ? 14 : r0 + (arcs - 1) * 4) + 9
    const cap = Math.min(110, 0.5 * Math.min(len(sub(a, v)), len(sub(b, v))))
    const fitFor = (w: number) => (half < Math.PI / 2 ? (w / 2 + 4) / Math.max(Math.sin(half), 0.12) : 0)
    let fontSize = FONT_SIZE
    let w = textWidth(s.label)
    if (fitFor(w) > cap) {
      fontSize = 12.5
      w *= fontSize / FONT_SIZE
    }
    // Also keep the label box clear of the vertex along the bisector direction.
    const along = Math.abs(Math.cos(mid)) * (w / 2) + Math.abs(Math.sin(mid)) * 7
    const r = Math.max(base + w * 0.12 + 6, base + along - 4, Math.min(fitFor(w) + 3, cap))
    const lp = { x: v.x + r * Math.cos(mid), y: v.y + r * Math.sin(mid) }
    els.push(
      <text key="l" x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="central" fill={color} fontSize={fontSize}>
        <LabelText text={s.label} />
      </text>,
    )
  }
  const hitR = r0 + 6
  const hp1 = { x: v.x + hitR * Math.cos(t1), y: v.y + hitR * Math.sin(t1) }
  const hp2 = { x: v.x + hitR * Math.cos(t1 + delta), y: v.y + hitR * Math.sin(t1 + delta) }
  return (
    <g>
      {els}
      {'onPointerDown' in hit && (
        <path
          d={`M${v.x},${v.y} L${hp1.x},${hp1.y} A${hitR},${hitR} 0 ${Math.abs(delta) > Math.PI ? 1 : 0} ${delta > 0 ? 1 : 0} ${hp2.x},${hp2.y} Z`}
          fill="transparent"
          {...hit}
        />
      )}
    </g>
  )
}

function PointView({
  p,
  f,
  centroid,
  neighbors,
  ix,
}: {
  p: DPoint
  f: Frame
  centroid: Vec
  neighbors: Vec[]
  ix: Interaction
}) {
  const editing = !!ix.onPointDown
  if (p.hidden && !(editing && ix.showHidden)) return null
  const q = f.px(p)
  const selected = ix.selectedId === p.id
  const pending = ix.pending?.includes(p.id)
  const showDot = p.dot ?? !!p.label
  let dir: Vec
  if (p.labelDir !== undefined) {
    dir = polar(1, -p.labelDir) // screen y is down
  } else if (neighbors.length) {
    // Bisector of the widest angular gap between neighbor directions.
    const angs = neighbors.map((n) => Math.atan2(n.y - q.y, n.x - q.x)).sort((a, b) => a - b)
    let best = 0
    let bestGap = -1
    for (let i = 0; i < angs.length; i++) {
      const next = i + 1 < angs.length ? angs[i + 1] : angs[0] + 2 * Math.PI
      const gap = next - angs[i]
      if (gap > bestGap + 1e-6) {
        bestGap = gap
        best = angs[i] + gap / 2
      }
    }
    dir = { x: Math.cos(best), y: Math.sin(best) }
  } else {
    const away = sub(q, centroid)
    dir = Math.hypot(away.x, away.y) < 1 ? { x: 0.7, y: -0.7 } : norm(away)
  }
  const lp = add(q, mul(dir, 13))
  return (
    <g>
      {(showDot || editing) && (
        <circle
          cx={q.x}
          cy={q.y}
          r={showDot ? 2.8 : 2.2}
          fill={selected || pending ? '#1d6fe0' : p.hidden ? '#bbb' : showDot ? STROKE : '#999'}
        />
      )}
      {p.label && !p.hidden && (
        <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="central" fill={selected ? '#1d6fe0' : STROKE}>
          <LabelText text={p.label} />
        </text>
      )}
      {editing && (
        <circle
          cx={q.x}
          cy={q.y}
          r={9}
          fill={selected ? 'rgba(29,111,224,0.15)' : 'transparent'}
          style={{ cursor: 'move' }}
          onPointerDown={(e) => {
            e.stopPropagation()
            ix.onPointDown!(p.id, e)
          }}
        />
      )}
    </g>
  )
}

