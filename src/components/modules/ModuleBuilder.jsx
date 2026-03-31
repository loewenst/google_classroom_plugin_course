/**
 * src/components/modules/ModuleBuilder.jsx
 * Form for creating or editing a module. Takes a title and description
 * and calls onSave with the module data object.
 *
 * Props:
 *   onSave   {(moduleData: { title: string, description: string }) => void}
 *   onCancel {() => void}
 *   initial  {{ title?: string, description?: string }}  optional pre-fill values
 */

import { useState } from 'react'
import Button from '../common/Button.jsx'

/**
 * @param {{ onSave: function, onCancel: function, initial?: object }} props
 */
export default function ModuleBuilder({ onSave, onCancel, initial = {} }) {
  const [title, setTitle] = useState(initial.title || '')
  const [description, setDescription] = useState(initial.description || '')
  const [error, setError] = useState(null)

  /**
   * Validates inputs and calls onSave with the module data.
   */
  function handleSave() {
    if (!title.trim()) {
      setError('Module title is required.')
      return
    }
    setError(null)
    onSave({ title: title.trim(), description: description.trim() })
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--spacing-lg)',
    }}>
      <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 'var(--spacing-md)' }}>
        {initial.title ? 'Edit Module' : 'New Module'}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 'var(--font-size-sm)' }}>
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Introduction to the topic"
            autoFocus
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 'var(--font-size-sm)' }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Optional description for this module"
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </div>

        {error && (
          <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          )}
          <Button onClick={handleSave}>Save Module</Button>
        </div>
      </div>
    </div>
  )
}
