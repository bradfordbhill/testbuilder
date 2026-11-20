// Fluent builder used by templates and problem generators.
import type { AngleShape, Diagram, DPoint, GridSpec, LineShape, SegmentShape, Shape } from '../model/types'
import { fitView } from './geom'

type Opt<T> = Partial<Omit<T, 'id' | 'kind'>>

export class DiagramBuilder {
  points: DPoint[] = []
  shapes: Shape[] = []
  private n = 0
  grid?: GridSpec
  view?: Diagram['view']
  notToScale = false

  private sid(prefix: string) {
    return `${prefix}${++this.n}`
  }

  /** Add a labeled point. id defaults to the label. */
  pt(id: string, x: number, y: number, label: string | null = id, extra: Partial<DPoint> = {}): this {
    this.points.push({ id, x, y, ...(label ? { label } : {}), ...extra })
    return this
  }

  /** Unlabeled helper point (no dot). */
  hp(id: string, x: number, y: number): this {
    this.points.push({ id, x, y, dot: false })
    return this
  }

  seg(a: string, b: string, o: Opt<SegmentShape> = {}): this {
    this.shapes.push({ id: this.sid('s'), kind: 'segment', a, b, ...o })
    return this
  }

  /** Closed polygon drawn as segments (so each side can carry marks). */
  poly(ids: string[], sideOpts: (Opt<SegmentShape> | undefined)[] = []): this {
    ids.forEach((id, i) => this.seg(id, ids[(i + 1) % ids.length], sideOpts[i] ?? {}))
    return this
  }

  fill(ids: string[], fill = '#d9d9d9'): this {
    this.shapes.unshift({ id: this.sid('f'), kind: 'polygon', points: ids, fill })
    return this
  }

  line(a: string, b: string, o: Opt<LineShape> = {}): this {
    this.shapes.push({ id: this.sid('l'), kind: 'line', a, b, ...o })
    return this
  }

  ray(a: string, b: string, o: Opt<LineShape> = {}): this {
    this.shapes.push({ id: this.sid('r'), kind: 'ray', a, b, ...o })
    return this
  }

  angle(a: string, vertex: string, b: string, o: Opt<AngleShape> = {}): this {
    this.shapes.push({ id: this.sid('a'), kind: 'angle', a, vertex, b, ...o })
    return this
  }

  right(a: string, vertex: string, b: string): this {
    return this.angle(a, vertex, b, { right: true })
  }

  circle(center: string, radius: number, label?: string): this {
    this.shapes.push({ id: this.sid('c'), kind: 'circle', center, radius, ...(label ? { label } : {}) })
    return this
  }

  arc(center: string, a: string, b: string, label?: string): this {
    this.shapes.push({ id: this.sid('arc'), kind: 'arc', center, a, b, ...(label ? { label } : {}) })
    return this
  }

  text(x: number, y: number, text: string): this {
    this.shapes.push({ id: this.sid('t'), kind: 'text', x, y, text })
    return this
  }

  withGrid(view: Diagram['view'], grid: Partial<GridSpec> = {}): this {
    this.view = view
    this.grid = { step: 1, axes: true, numbers: true, ...grid }
    return this
  }

  noScale(): this {
    this.notToScale = true
    return this
  }

  build(width = 260, margin = 0.16): Diagram {
    const d: Diagram = {
      width,
      view: this.view ?? { xmin: 0, xmax: 1, ymin: 0, ymax: 1 },
      points: this.points,
      shapes: this.shapes,
      ...(this.grid ? { grid: this.grid } : {}),
      ...(this.notToScale ? { notToScale: true } : {}),
    }
    if (!this.view) d.view = fitView(d, margin)
    return d
  }
}

export const diagram = () => new DiagramBuilder()
