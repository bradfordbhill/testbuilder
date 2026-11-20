import { useEffect, useRef, useState } from 'react'
import type { Diagram, DPoint, Shape } from '../model/types'
import { DiagramView } from './DiagramView'
import { dist, fitView, frameOf, shapePointIds } from './geom'
import { TEMPLATES } from './templates'
import { confirmAsk } from '../ui/dialog'

type Tool = 'select' | 'point' | 'segment' | 'line' | 'ray' | 'circle' | 'angle' | 'arc' | 'polygon' | 'text'

const TOOLS: { id: Tool; label: string; hint: string; clicks: number }[] = [
  { id: 'select', label: 'Select / move', hint: 'Click to select, drag points to move.', clicks: 0 },
  { id: 'point', label: 'Point', hint: 'Click to place a point.', clicks: 1 },
  { id: 'segment', label: 'Segment', hint: 'Click two points (or empty space to make points).', clicks: 2 },
  { id: 'line', label: 'Line', hint: 'Click two points on the line.', clicks: 2 },
  { id: 'ray', label: 'Ray', hint: 'Click the endpoint, then a point the ray passes through.', clicks: 2 },
  { id: 'circle', label: 'Circle', hint: 'Click the center, then a point on the circle.', clicks: 2 },
  { id: 'angle', label: 'Angle mark', hint: 'Click a point on one side, the vertex, then a point on the other side.', clicks: 3 },
  { id: 'arc', label: 'Arc', hint: 'Click the center, then the start and end points (counterclockwise).', clicks: 3 },
  { id: 'polygon', label: 'Shaded region', hint: 'Click the corners, then click the first point again to finish.', clicks: -1 },
  { id: 'text', label: 'Text', hint: 'Click where the text goes.', clicks: 1 },
]

const nextLabel = (d: Diagram): string => {
  const used = new Set(d.points.map((p) => p.label).filter(Boolean))
  for (const c of 'ABCDEFGHJKLMNPQRSTUVWXYZ') if (!used.has(c)) return c
  for (let i = 1; ; i++) if (!used.has(`P${i}`)) return `P${i}`
}

const newId = (prefix: string, d: Diagram) => {
  const ids = new Set([...d.points.map((p) => p.id), ...d.shapes.map((s) => s.id)])
  for (let i = 1; ; i++) if (!ids.has(`${prefix}${i}`)) return `${prefix}${i}`
}

export function DiagramEditor({ value, onChange }: { value: Diagram; onChange: (d: Diagram) => void }) {
  const [tool, setTool] = useState<Tool>('select')
  const [selected, setSelected] = useState<string | null>(null)
  const [pending, setPending] = useState<string[]>([])
  const [snap, setSnap] = useState(true)
  const [showHidden, setShowHidden] = useState(true)
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ id: string; moved: boolean } | null>(null)
  const d = value
  const f = frameOf(d)
  const toolInfo = TOOLS.find((t) => t.id === tool)!

  const update = (fn: (d: Diagram) => Diagram) => onChange(fn(structuredClone(d)))

  const toWorld = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = svgRef.current!.getBoundingClientRect()
    const sx = (e.clientX - rect.left) * (f.width / rect.width)
    const sy = (e.clientY - rect.top) * (f.height / rect.height)
    const w = f.world({ x: sx, y: sy })
    if (!snap) return { x: Math.round(w.x * 100) / 100, y: Math.round(w.y * 100) / 100 }
    const step = d.grid ? d.grid.step / 2 : niceStep((d.view.xmax - d.view.xmin) / 40)
    return { x: Math.round(w.x / step) * step, y: Math.round(w.y / step) * step }
  }

  useEffect(() => {
    setPending([])
  }, [tool])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault()
        remove(selected)
      }
      if (e.key === 'Escape') {
        setPending([])
        setTool('select')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function remove(id: string) {
    update((dd) => {
      const isPoint = dd.points.some((p) => p.id === id)
      if (isPoint) {
        dd.points = dd.points.filter((p) => p.id !== id)
        dd.shapes = dd.shapes.filter((s) => !shapePointIds(s).includes(id))
      } else dd.shapes = dd.shapes.filter((s) => s.id !== id)
      return dd
    })
    setSelected(null)
  }

  /** Add a point at the event location (or return an existing nearby point). */
  function pointAt(e: React.PointerEvent, dd: Diagram, labeled = true): string {
    const w = toWorld(e)
    const near = dd.points.find((p) => dist(f.px(p), f.px(w)) < 8)
    if (near) return near.id
    const id = newId('p', dd)
    const p: DPoint = { id, x: w.x, y: w.y }
    if (labeled) p.label = nextLabel(dd)
    dd.points.push(p)
    return id
  }

  function addToPending(id: string, dd: Diagram) {
    const ids = [...pending, id]
    if (tool === 'polygon') {
      if (ids.length > 2 && id === ids[0]) {
        dd.shapes.unshift({ id: newId('f', dd), kind: 'polygon', points: ids.slice(0, -1), fill: '#d9d9d9' })
        setPending([])
        return dd
      }
      setPending(ids)
      return dd
    }
    if (ids.length < toolInfo.clicks) {
      setPending(ids)
      return dd
    }
    const sid = newId('s', dd)
    let shape: Shape | null = null
    if (tool === 'segment') shape = { id: sid, kind: 'segment', a: ids[0], b: ids[1] }
    if (tool === 'line' || tool === 'ray') shape = { id: sid, kind: tool, a: ids[0], b: ids[1] }
    if (tool === 'circle') {
      const c = dd.points.find((p) => p.id === ids[0])!
      const t = dd.points.find((p) => p.id === ids[1])!
      shape = { id: sid, kind: 'circle', center: ids[0], radius: Math.round(dist(c, t) * 100) / 100 }
    }
    if (tool === 'angle') shape = { id: sid, kind: 'angle', a: ids[0], vertex: ids[1], b: ids[2], arcs: 1 }
    if (tool === 'arc') shape = { id: sid, kind: 'arc', center: ids[0], a: ids[1], b: ids[2] }
    if (shape && new Set(ids).size === ids.length) {
      dd.shapes.push(shape)
      setSelected(sid)
    }
    setPending([])
    return dd
  }

  const onPointDown = (id: string, e: React.PointerEvent) => {
    if (tool === 'select') {
      setSelected(id)
      drag.current = { id, moved: false }
      svgRef.current?.setPointerCapture(e.pointerId)
      return
    }
    if (tool === 'point' || tool === 'text') {
      setSelected(id)
      return
    }
    update((dd) => addToPending(id, dd))
  }

  const onShapeDown = (id: string) => {
    if (tool === 'select') setSelected(id)
  }

  const onBackgroundDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (tool === 'select') {
      setSelected(null)
      return
    }
    if (tool === 'text') {
      const w = toWorld(e)
      update((dd) => {
        const id = newId('t', dd)
        dd.shapes.push({ id, kind: 'text', x: w.x, y: w.y, text: 'text' })
        setSelected(id)
        return dd
      })
      setTool('select')
      return
    }
    update((dd) => {
      const id = pointAt(e, dd)
      if (tool === 'point') {
        setSelected(id)
        return dd
      }
      return addToPending(id, dd)
    })
  }

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return
    const w = toWorld(e)
    const id = drag.current.id
    drag.current.moved = true
    onChange({ ...d, points: d.points.map((p) => (p.id === id ? { ...p, x: w.x, y: w.y } : p)) })
  }

  const onUp = () => {
    drag.current = null
  }

  const sel = selected ? (d.points.find((p) => p.id === selected) ?? d.shapes.find((s) => s.id === selected)) : undefined

  return (
    <div className="diagram-editor">
      <div className="de-toolbar">
        {TOOLS.map((t) => (
          <button key={t.id} type="button" className={tool === t.id ? 'active' : ''} onClick={() => setTool(t.id)} title={t.hint}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="de-hint">
        {toolInfo.hint}
        {pending.length > 0 && <> · {pending.length} selected (Esc to cancel)</>}
      </div>
      <div className="de-body">
        <div className="de-canvas">
          <DiagramView
            diagram={d}
            svgRef={svgRef}
            selectedId={selected}
            pending={pending}
            showHidden={showHidden}
            onPointDown={onPointDown}
            onShapeDown={onShapeDown}
            onBackgroundDown={onBackgroundDown}
            onMove={onMove}
            onUp={onUp}
          />
        </div>
        <div className="de-side">
          <div className="de-panel">
            <h4>Diagram</h4>
            <label>
              Template{' '}
              <select
                value=""
                onChange={async (e) => {
                  const t = TEMPLATES.find((x) => x.id === e.target.value)
                  if (!t) return
                  if (d.points.length > 0 && !(await confirmAsk('Replace the diagram?', `The current diagram will be replaced with the “${t.name}” template.`, 'Replace', true))) return
                  onChange(t.make())
                  setSelected(null)
                }}
              >
                <option value="">Choose…</option>
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Width{' '}
              <input type="range" min={120} max={520} step={10} value={d.width} onChange={(e) => onChange({ ...d, width: Number(e.target.value) })} />{' '}
              {d.width}px
            </label>
            <div className="row">
              <button type="button" onClick={() => onChange({ ...d, view: fitView(d) })}>
                Fit to points
              </button>
              <button type="button" onClick={() => onChange(zoom(d, 0.85))}>
                Zoom in
              </button>
              <button type="button" onClick={() => onChange(zoom(d, 1.18))}>
                Zoom out
              </button>
            </div>
            <label>
              <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} /> Snap
            </label>
            <label>
              <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} /> Show hidden points
            </label>
            <label>
              <input
                type="checkbox"
                checked={!!d.grid}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? { ...d, grid: { step: 1, axes: true, numbers: true, numberEvery: 2 } }
                      : { ...d, grid: undefined },
                  )
                }
              />{' '}
              Coordinate grid
            </label>
            {d.grid && (
              <div className="row">
                <label>
                  Step <input type="number" value={d.grid.step} min={0.1} step={0.5} style={{ width: 50 }} onChange={(e) => onChange({ ...d, grid: { ...d.grid!, step: Number(e.target.value) || 1 } })} />
                </label>
                <label>
                  <input type="checkbox" checked={d.grid.axes} onChange={(e) => onChange({ ...d, grid: { ...d.grid!, axes: e.target.checked } })} /> Axes
                </label>
                <label>
                  <input type="checkbox" checked={d.grid.numbers} onChange={(e) => onChange({ ...d, grid: { ...d.grid!, numbers: e.target.checked } })} /> Numbers
                </label>
              </div>
            )}
            <label>
              <input type="checkbox" checked={!!d.notToScale} onChange={(e) => onChange({ ...d, notToScale: e.target.checked || undefined })} /> “Not drawn to scale”
            </label>
          </div>
          {sel && <Properties item={sel} d={d} onChange={onChange} onDelete={() => remove(sel.id)} />}
        </div>
      </div>
    </div>
  )
}

function niceStep(raw: number): number {
  const steps = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5]
  return steps.find((s) => s >= raw) ?? 5
}

function zoom(d: Diagram, k: number): Diagram {
  const { xmin, xmax, ymin, ymax } = d.view
  const cx = (xmin + xmax) / 2
  const cy = (ymin + ymax) / 2
  const hw = ((xmax - xmin) / 2) * k
  const hh = ((ymax - ymin) / 2) * k
  return { ...d, view: { xmin: cx - hw, xmax: cx + hw, ymin: cy - hh, ymax: cy + hh } }
}

function Properties({
  item,
  d,
  onChange,
  onDelete,
}: {
  item: DPoint | Shape
  d: Diagram
  onChange: (d: Diagram) => void
  onDelete: () => void
}) {
  const isPoint = !('kind' in item)
  const set = (patch: Record<string, unknown>) => {
    if (isPoint) onChange({ ...d, points: d.points.map((p) => (p.id === item.id ? clean({ ...p, ...patch }) : p)) })
    else onChange({ ...d, shapes: d.shapes.map((s) => (s.id === item.id ? (clean({ ...s, ...patch }) as Shape) : s)) })
  }
  const num = (v: string) => (v === '' ? undefined : Number(v))
  const kind = isPoint ? 'point' : (item as Shape).kind
  const it = item as unknown as Record<string, unknown>

  return (
    <div className="de-panel">
      <h4>
        {kind[0].toUpperCase() + kind.slice(1)} <span className="muted">({item.id})</span>
      </h4>
      {kind !== 'text' && (
        <label>
          Label{' '}
          <input
            value={(it.label as string) ?? ''}
            placeholder={kind === 'angle' ? 'e.g. (3x + 5)°' : kind === 'segment' ? 'e.g. 2x − 1' : ''}
            onChange={(e) => set({ label: e.target.value || undefined })}
          />
        </label>
      )}
      <div className="symbols">
        {['°', '√', 'π', 'θ', 'ℓ', '′', '²', '−'].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => (kind === 'text' ? set({ text: `${it.text ?? ''}${c}` }) : set({ label: `${(it.label as string) ?? ''}${c}` }))}
          >
            {c}
          </button>
        ))}
      </div>
      {isPoint && (
        <>
          <div className="row">
            <label>
              x <input type="number" step={0.1} value={(item as DPoint).x} style={{ width: 70 }} onChange={(e) => set({ x: Number(e.target.value) })} />
            </label>
            <label>
              y <input type="number" step={0.1} value={(item as DPoint).y} style={{ width: 70 }} onChange={(e) => set({ y: Number(e.target.value) })} />
            </label>
          </div>
          <label>
            Label position{' '}
            <select value={(item as DPoint).labelDir ?? ''} onChange={(e) => set({ labelDir: num(e.target.value) })}>
              <option value="">Auto</option>
              <option value="90">Above</option>
              <option value="270">Below</option>
              <option value="0">Right</option>
              <option value="180">Left</option>
              <option value="45">Upper right</option>
              <option value="135">Upper left</option>
              <option value="225">Lower left</option>
              <option value="315">Lower right</option>
            </select>
          </label>
          <label>
            <input type="checkbox" checked={(item as DPoint).dot ?? !!(item as DPoint).label} onChange={(e) => set({ dot: e.target.checked })} /> Show dot
          </label>
          <label>
            <input type="checkbox" checked={!!(item as DPoint).hidden} onChange={(e) => set({ hidden: e.target.checked || undefined })} /> Hidden (helper point)
          </label>
        </>
      )}
      {kind === 'segment' && (
        <>
          <Count label="Tick marks" value={(it.ticks as number) ?? 0} onChange={(v) => set({ ticks: v || undefined })} />
          <Count label="Parallel arrows" value={(it.arrows as number) ?? 0} onChange={(v) => set({ arrows: v || undefined })} />
          <label>
            Label side{' '}
            <select value={String(it.labelSide ?? '')} onChange={(e) => set({ labelSide: num(e.target.value) })}>
              <option value="">Auto</option>
              <option value="1">Side 1</option>
              <option value="-1">Side 2</option>
            </select>
          </label>
        </>
      )}
      {(kind === 'line' || kind === 'ray') && (
        <>
          <Count label="Parallel arrows" value={(it.arrows as number) ?? 0} onChange={(v) => set({ arrows: v || undefined })} />
          <label>
            <input type="checkbox" checked={it.heads !== false} onChange={(e) => set({ heads: e.target.checked ? undefined : false })} /> Arrowheads
          </label>
        </>
      )}
      {kind === 'circle' && (
        <label>
          Radius{' '}
          <input type="number" step={0.1} value={(it.radius as number) ?? ''} style={{ width: 70 }} onChange={(e) => set({ radius: num(e.target.value) })} />
        </label>
      )}
      {kind === 'angle' && (
        <>
          <label>
            <input type="checkbox" checked={!!it.right} onChange={(e) => set({ right: e.target.checked || undefined })} /> Right-angle mark
          </label>
          {!it.right && <Count label="Arcs" value={(it.arcs as number) ?? 1} onChange={(v) => set({ arcs: v })} />}
          <label>
            Size <input type="range" min={10} max={50} value={(it.size as number) ?? 18} onChange={(e) => set({ size: Number(e.target.value) })} />
          </label>
          <label>
            <input type="checkbox" checked={!!it.reflex} onChange={(e) => set({ reflex: e.target.checked || undefined })} /> Reflex (other side)
          </label>
        </>
      )}
      {kind === 'polygon' && (
        <label>
          Shade{' '}
          <select value={(it.fill as string) ?? ''} onChange={(e) => set({ fill: e.target.value || undefined })}>
            <option value="#ececec">Light</option>
            <option value="#d9d9d9">Medium</option>
            <option value="#bdbdbd">Dark</option>
            <option value="">None (outline)</option>
          </select>
        </label>
      )}
      {kind === 'text' && (
        <>
          <label>
            Text <input value={(it.text as string) ?? ''} onChange={(e) => set({ text: e.target.value })} />
          </label>
          <label>
            Size <input type="number" value={(it.size as number) ?? 15} style={{ width: 60 }} onChange={(e) => set({ size: num(e.target.value) })} />
          </label>
        </>
      )}
      {!isPoint && kind !== 'text' && (
        <div className="row">
          <label>
            <input type="checkbox" checked={!!it.dashed} onChange={(e) => set({ dashed: e.target.checked || undefined })} /> Dashed
          </label>
          <label>
            <input type="checkbox" checked={!!it.bold} onChange={(e) => set({ bold: e.target.checked || undefined })} /> Bold
          </label>
        </div>
      )}
      <button type="button" className="danger" onClick={onDelete}>
        Delete {kind}
      </button>
    </div>
  )
}

function Count({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="row count">
      <span>{label}</span>
      {[0, 1, 2, 3].map((n) => (
        <button key={n} type="button" className={value === n ? 'active' : ''} onClick={() => onChange(n)}>
          {n}
        </button>
      ))}
    </div>
  )
}

function clean<T extends object>(o: T): T {
  const out = { ...o } as Record<string, unknown>
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k]
  return out as T
}
