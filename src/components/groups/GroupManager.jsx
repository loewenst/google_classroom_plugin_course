/**
 * src/components/groups/GroupManager.jsx
 * Form to create/edit groups, assign students, and toggle grading mode.
 * Props:
 *   groups   {Array<{ group_id, name, student_ids, color }>}
 *   students {Array<{ id, name, email }>}
 *   onSave   {(group: object) => Promise<void>}
 *   onDelete {(groupId: string) => Promise<void>}
 */

import { useState } from 'react'
import Button from '../common/Button.jsx'
import GroupBadge from './GroupBadge.jsx'

const GROUP_COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#FF6D00', '#7C4DFF', '#00BCD4']

/** @param {{ group: object, onEdit: function, onDelete: function }} props */
function GroupCard({ group, onEdit, onDelete }) {
  function handleDelete() {
    if (window.confirm(`Delete group "${group.name}"? This cannot be undone.`)) {
      onDelete(group.group_id)
    }
  }

  return (
    <div style={{
      padding: 'var(--spacing-md)',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--spacing-md)',
    }}>
      <GroupBadge groupName={group.name} color={group.color} />
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 600 }}>{group.name}</p>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          {group.student_ids?.length || 0} member(s)
        </p>
      </div>
      <button
        onClick={() => onEdit(group)}
        style={{ padding: '4px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'none', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}
      >
        Edit
      </button>
      <button
        onClick={handleDelete}
        style={{ padding: '4px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', background: 'none', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}
      >
        Delete
      </button>
    </div>
  )
}

/**
 * Group manager component.
 * @param {{ groups: Array, students: Array, onSave: function, onDelete: function }} props
 */
export default function GroupManager({ groups = [], students = [], onSave, onDelete }) {
  const [editingGroup, setEditingGroup] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function openNewGroup() {
    setEditingGroup({
      group_id: crypto.randomUUID(),
      name: '',
      student_ids: [],
      color: GROUP_COLORS[0],
      grade_individually: false,
    })
  }

  async function handleSave() {
    if (!editingGroup?.name?.trim()) {
      setError('Group name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(editingGroup)
      setEditingGroup(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
        <p style={{ fontWeight: 600, fontSize: 'var(--font-size-md)' }}>
          {groups.length} group(s)
        </p>
        <Button onClick={openNewGroup}>New Group</Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
        {groups.map((g) => (
          <GroupCard key={g.group_id} group={g} onEdit={setEditingGroup} onDelete={onDelete} />
        ))}
        {groups.length === 0 && (
          <p style={{ color: 'var(--color-text-secondary)' }}>No groups yet.</p>
        )}
      </div>

      {/* Edit / create form */}
      {editingGroup && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-lg)',
          marginTop: 'var(--spacing-md)',
        }}>
          <h3 style={{ marginBottom: 'var(--spacing-md)', fontWeight: 700 }}>
            {editingGroup.name ? `Edit "${editingGroup.name}"` : 'New Group'}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Group name *</label>
              <input
                type="text"
                value={editingGroup.name}
                onChange={(e) => setEditingGroup((g) => ({ ...g, name: e.target.value }))}
                placeholder="e.g., Team Alpha"
                style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {GROUP_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setEditingGroup((g) => ({ ...g, color }))}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: color,
                      border: editingGroup.color === color ? '3px solid var(--color-text)' : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>

            {students.length > 0 && (
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Students</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                  {students.map((s) => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editingGroup.student_ids.includes(s.id)}
                        onChange={(e) => {
                          setEditingGroup((g) => ({
                            ...g,
                            student_ids: e.target.checked
                              ? [...g.student_ids, s.id]
                              : g.student_ids.filter((id) => id !== s.id),
                          }))
                        }}
                      />
                      {s.name || s.email || s.id}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={editingGroup.grade_individually ?? false}
                onChange={(e) => setEditingGroup((g) => ({ ...g, grade_individually: e.target.checked }))}
              />
              <span style={{ fontWeight: 600 }}>Grade individually (not as a group)</span>
            </label>

            {error && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>{error}</p>}

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <Button onClick={handleSave} loading={saving}>Save Group</Button>
              <Button variant="secondary" onClick={() => setEditingGroup(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
