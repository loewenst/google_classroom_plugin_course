/**
 * src/components/learningPath/PathBuilder.jsx
 * Teacher-facing learning path editor. Drag-to-reorder items within modules
 * using @dnd-kit/sortable. Supports inline editing of per-item metadata.
 *
 * Props:
 *   items        {Array}  Flat array of all learning path items.
 *   modules      {Array}  Module metadata array from useLearningPath.
 *   onReorder    {(updatedItems: Array) => void}  Called after drag ends.
 *   onUpdateItem {(item: object) => void}  Called when an item is inline-edited.
 *   onAddModule  {(moduleData: object) => void}  Called when a new module is added.
 */

import { useState } from 'react'
import ModuleBuilder from '../modules/ModuleBuilder.jsx'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

/**
 * A single sortable item row with inline editing of key fields.
 * @param {{ item: object, onUpdate: function }} props
 */
function SortableItem({ item, onUpdate }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.item_id })

  const [editing, setEditing] = useState(false)
  const [localItem, setLocalItem] = useState(item)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? 'var(--color-primary-light)' : 'var(--color-surface)',
    border: `1px solid ${isDragging ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--spacing-xs)',
    overflow: 'hidden',
  }

  function saveEdit() {
    onUpdate(localItem)
    setEditing(false)
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm) var(--spacing-md)' }}>
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', color: 'var(--color-text-disabled)', fontSize: '1.2rem', flexShrink: 0, userSelect: 'none' }}
          aria-label="Drag to reorder"
        >
          ⠿
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{item.title}</p>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            {item.type}
            {item.estimated_minutes ? ` · ~${item.estimated_minutes} min` : ''}
            {item.pass_threshold ? ` · Pass: ${item.pass_threshold}%` : ''}
            {item.due_date ? ` · Due: ${item.due_date}` : ''}
          </p>
        </div>

        <button
          onClick={() => setEditing((e) => !e)}
          style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'none', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {editing && (
        <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', borderTop: '1px solid var(--color-border)', background: 'var(--color-background)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 2 }}>Pass threshold %</label>
            <input
              type="number"
              min={0}
              max={100}
              value={localItem.pass_threshold ?? 70}
              onChange={(e) => setLocalItem((p) => ({ ...p, pass_threshold: Number(e.target.value) }))}
              style={{ width: '100%', padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 2 }}>Estimated minutes</label>
            <input
              type="number"
              min={1}
              value={localItem.estimated_minutes ?? ''}
              onChange={(e) => setLocalItem((p) => ({ ...p, estimated_minutes: e.target.value ? Number(e.target.value) : null }))}
              style={{ width: '100%', padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 2 }}>Due date</label>
            <input
              type="date"
              value={localItem.due_date ?? ''}
              onChange={(e) => setLocalItem((p) => ({ ...p, due_date: e.target.value }))}
              style={{ width: '100%', padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 2 }}>Teacher note</label>
            <input
              type="text"
              value={localItem.teacher_note ?? ''}
              onChange={(e) => setLocalItem((p) => ({ ...p, teacher_note: e.target.value }))}
              style={{ width: '100%', padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button
              onClick={saveEdit}
              style={{ padding: '6px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Save changes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * PathBuilder with drag-to-reorder using @dnd-kit/sortable.
 * @param {{ items: Array, modules: Array, onReorder: function, onUpdateItem: function, onAddModule: function }} props
 */
export default function PathBuilder({ items = [], modules = [], onReorder, onUpdateItem, onAddModule }) {
  const [localItems, setLocalItems] = useState(items)
  const [showAddModule, setShowAddModule] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Keep local items in sync when parent items change
  // (simple sync: only update if the IDs have changed)
  const itemIds = items.map((i) => i.item_id).join(',')
  const localIds = localItems.map((i) => i.item_id).join(',')
  if (itemIds !== localIds) {
    setLocalItems(items)
  }

  /**
   * Handles drag end: reorders local state and notifies parent.
   */
  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = localItems.findIndex((i) => i.item_id === active.id)
    const newIndex = localItems.findIndex((i) => i.item_id === over.id)

    const reordered = arrayMove(localItems, oldIndex, newIndex).map((item, idx) => ({
      ...item,
      order: idx + 1,
    }))
    setLocalItems(reordered)
    onReorder?.(reordered)
  }

  /**
   * Handles inline item update and notifies parent.
   * @param {object} updatedItem
   */
  function handleUpdate(updatedItem) {
    setLocalItems((prev) => prev.map((i) => (i.item_id === updatedItem.item_id ? updatedItem : i)))
    onUpdateItem?.(updatedItem)
  }

  function handleAddModule({ title, description }) {
    onAddModule?.({ module_id: crypto.randomUUID(), title, description })
    setShowAddModule(false)
  }

  if (localItems.length === 0) {
    return (
      <div style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
        No items in the learning path yet. Upload resources to get started.
      </div>
    )
  }

  // Group items by module
  const moduleMap = new Map()
  for (const mod of modules) {
    moduleMap.set(mod.module_id, mod)
  }

  const groupedByModule = localItems.reduce((acc, item) => {
    const key = item.module_id || 'default'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={localItems.map((i) => i.item_id)} strategy={verticalListSortingStrategy}>
          {Object.entries(groupedByModule).map(([moduleId, moduleItems]) => {
            const mod = moduleMap.get(moduleId)
            return (
              <div key={moduleId} style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
                  {mod?.title || moduleId}
                </h3>
                {moduleItems.map((item) => (
                  <SortableItem key={item.item_id} item={item} onUpdate={handleUpdate} />
                ))}
              </div>
            )
          })}
        </SortableContext>
      </DndContext>

      {/* Add module form */}
      <div style={{ marginTop: 'var(--spacing-md)' }}>
        {!showAddModule ? (
          <button
            onClick={() => setShowAddModule(true)}
            style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '2px dashed var(--color-border)', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}
          >
            + Add Module
          </button>
        ) : (
          <ModuleBuilder
            onSave={handleAddModule}
            onCancel={() => setShowAddModule(false)}
          />
        )}
      </div>
    </div>
  )
}
