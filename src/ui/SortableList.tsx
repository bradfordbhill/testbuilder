// Vertical drag-to-reorder list with grab handles (mouse, touch and keyboard).
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'

export interface HandleProps {
  attributes: Record<string, unknown>
  listeners: Record<string, unknown> | undefined
}

export function DragHandle({ handle, label = 'Drag to reorder' }: { handle: HandleProps; label?: string }) {
  return (
    <button type="button" className="drag-handle" aria-label={label} title={label} {...handle.attributes} {...handle.listeners}>
      <GripVertical size={14} />
    </button>
  )
}

function Row({ id, children, className }: { id: string; className?: string; children: (h: HandleProps) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`sortable-row ${className ?? ''} ${isDragging ? 'dragging' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      {children({ attributes: attributes as unknown as Record<string, unknown>, listeners })}
    </div>
  )
}

/** Renders items with drag handles; calls onReorder with the new array. */
export function SortableList<T>({
  items,
  onReorder,
  render,
  rowClassName,
}: {
  items: T[]
  onReorder: (next: T[]) => void
  render: (item: T, index: number, handle: HandleProps) => ReactNode
  rowClassName?: string
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  // Index-based ids are safe: the array only changes when a drag ends.
  const ids = items.map((_, i) => `r${i}`)
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const from = ids.indexOf(String(e.active.id))
    const to = ids.indexOf(String(e.over.id))
    if (from < 0 || to < 0) return
    onReorder(arrayMove(items, from, to))
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="sortable-list">
          {items.map((item, i) => (
            <Row key={ids[i]} id={ids[i]} className={rowClassName}>
              {(h) => render(item, i, h)}
            </Row>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
