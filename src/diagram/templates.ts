import type { Diagram } from '../model/types'
import { diagram } from './build'
import { polar } from './geom'

export interface Template {
  id: string
  name: string
  make: () => Diagram
}

export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Blank',
    make: () => ({ width: 260, view: { xmin: -5, xmax: 5, ymin: -3.5, ymax: 3.5 }, points: [], shapes: [] }),
  },
  {
    id: 'grid',
    name: 'Coordinate grid',
    make: () => diagram().withGrid({ xmin: -9.5, xmax: 9.5, ymin: -9.5, ymax: 9.5 }, { numberEvery: 2 }).build(260),
  },
  {
    id: 'triangle',
    name: 'Triangle',
    make: () => diagram().pt('A', 0, 0).pt('B', 5, 0).pt('C', 1.8, 3.2).poly(['A', 'B', 'C']).build(),
  },
  {
    id: 'right-triangle',
    name: 'Right triangle',
    make: () => diagram().pt('A', 0, 3).pt('B', 4, 0).pt('C', 0, 0).poly(['A', 'B', 'C']).right('B', 'C', 'A').build(220),
  },
  {
    id: 'isosceles',
    name: 'Isosceles triangle',
    make: () =>
      diagram()
        .pt('A', 2.5, 3.6)
        .pt('B', 0, 0)
        .pt('C', 5, 0)
        .seg('A', 'B', { ticks: 1 })
        .seg('A', 'C', { ticks: 1 })
        .seg('B', 'C')
        .angle('C', 'B', 'A', { arcs: 1 })
        .angle('A', 'C', 'B', { arcs: 1 })
        .build(),
  },
  {
    id: 'altitude',
    name: 'Right triangle with altitude to hypotenuse',
    make: () =>
      diagram()
        .pt('A', 0, 0)
        .pt('B', 7, 0)
        .pt('D', 2.2, 0)
        .pt('C', 2.2, 3.29)
        .poly(['A', 'B', 'C'])
        .seg('C', 'D')
        .right('B', 'D', 'C')
        .right('A', 'C', 'B')
        .build(),
  },
  {
    id: 'nested',
    name: 'Triangle with parallel segment',
    make: () =>
      diagram()
        .pt('A', 2.2, 4)
        .pt('B', 0, 0)
        .pt('C', 6, 0)
        .pt('D', 1.21, 2.2)
        .pt('E', 3.9, 2.2)
        .seg('A', 'B')
        .seg('A', 'C')
        .seg('B', 'C', { arrows: 1 })
        .seg('D', 'E', { arrows: 1 })
        .build(),
  },
  {
    id: 'intersecting',
    name: 'Intersecting lines',
    make: () =>
      diagram()
        .pt('E', 0, 0)
        .pt('A', -3, -0.8)
        .pt('B', 3, 0.8)
        .pt('C', -1.5, 2.5)
        .pt('D', 1.5, -2.5)
        .line('A', 'B')
        .line('C', 'D')
        .build(240, 0.05),
  },
  {
    id: 'parallel',
    name: 'Parallel lines and transversal',
    make: () =>
      diagram()
        .hp('L1', -4, 2)
        .hp('R1', 4, 2)
        .hp('L2', -4, 0)
        .hp('R2', 4, 0)
        .pt('P', 0.6, 2, null, { dot: true })
        .pt('Q', -0.6, 0, null, { dot: true })
        .hp('T1', 1.5, 3.5)
        .hp('T2', -1.5, -1.5)
        .line('L1', 'R1', { label: 'ℓ', arrows: 1 })
        .line('L2', 'R2', { label: 'm', arrows: 1 })
        .line('T2', 'T1', { label: 't' })
        .build(260, 0.04),
  },
  {
    id: 'parallelogram',
    name: 'Parallelogram with diagonals',
    make: () =>
      diagram()
        .pt('A', 0, 0)
        .pt('B', 5, 0)
        .pt('C', 6.5, 3)
        .pt('D', 1.5, 3)
        .pt('E', 3.25, 1.5)
        .poly(['A', 'B', 'C', 'D'])
        .seg('A', 'C')
        .seg('B', 'D')
        .build(),
  },
  {
    id: 'rectangle',
    name: 'Rectangle',
    make: () => diagram().pt('A', 0, 0).pt('B', 5, 0).pt('C', 5, 3).pt('D', 0, 3).poly(['A', 'B', 'C', 'D']).right('B', 'A', 'D').build(),
  },
  {
    id: 'rhombus',
    name: 'Rhombus with diagonals',
    make: () =>
      diagram()
        .pt('A', 0, 0)
        .pt('B', 4, 0)
        .pt('C', 6.3, 3.3)
        .pt('D', 2.3, 3.3)
        .pt('E', 3.15, 1.65)
        .poly(['A', 'B', 'C', 'D'], [{ ticks: 1 }, { ticks: 1 }, { ticks: 1 }, { ticks: 1 }])
        .seg('A', 'C')
        .seg('B', 'D')
        .build(),
  },
  {
    id: 'kite',
    name: 'Kite',
    make: () =>
      diagram()
        .pt('A', 0, 2.2)
        .pt('B', -2.2, 0)
        .pt('C', 0, -4)
        .pt('D', 2.2, 0)
        .poly(['A', 'B', 'C', 'D'], [{ ticks: 1 }, { ticks: 2 }, { ticks: 2 }, { ticks: 1 }])
        .build(200),
  },
  {
    id: 'trapezoid',
    name: 'Isosceles trapezoid',
    make: () =>
      diagram()
        .pt('A', 0, 0)
        .pt('B', 6, 0)
        .pt('C', 4.5, 2.6)
        .pt('D', 1.5, 2.6)
        .seg('A', 'B', { arrows: 1 })
        .seg('B', 'C', { ticks: 1 })
        .seg('D', 'C', { arrows: 1 })
        .seg('D', 'A', { ticks: 1 })
        .build(),
  },
  {
    id: 'circle',
    name: 'Circle with radius',
    make: () => diagram().pt('O', 0, 0).pt('A', polar(2, 20).x, polar(2, 20).y).circle('O', 2).seg('O', 'A').build(200),
  },
  {
    id: 'inscribed',
    name: 'Inscribed and central angle',
    make: () => {
      const a = polar(2, -20)
      const b = polar(2, 60)
      const c = polar(2, 200)
      return diagram()
        .pt('O', 0, 0)
        .pt('A', a.x, a.y)
        .pt('B', b.x, b.y)
        .pt('C', c.x, c.y)
        .circle('O', 2)
        .seg('C', 'A')
        .seg('C', 'B')
        .seg('O', 'A', { dashed: true })
        .seg('O', 'B', { dashed: true })
        .angle('A', 'C', 'B')
        .build(220)
    },
  },
  {
    id: 'tangent',
    name: 'Tangent to a circle',
    make: () =>
      diagram()
        .pt('O', 0, 0)
        .pt('T', 0, -2)
        .pt('P', 3.5, -2)
        .circle('O', 2)
        .seg('O', 'T')
        .seg('T', 'P')
        .seg('O', 'P')
        .right('P', 'T', 'O')
        .build(240),
  },
  {
    id: 'chords',
    name: 'Intersecting chords',
    make: () => {
      const p = [polar(2, 150), polar(2, -30), polar(2, 70), polar(2, 230)]
      return diagram()
        .pt('O', 0, 0, null, { dot: true })
        .pt('A', p[0].x, p[0].y)
        .pt('B', p[1].x, p[1].y)
        .pt('C', p[2].x, p[2].y)
        .pt('D', p[3].x, p[3].y)
        .circle('O', 2)
        .seg('A', 'B')
        .seg('C', 'D')
        .build(220)
    },
  },
]
