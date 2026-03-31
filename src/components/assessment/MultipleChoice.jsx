/**
 * src/components/assessment/MultipleChoice.jsx
 * Renders a multiple-choice question with radio button options.
 * Props:
 *   question  {string}
 *   options   {Array<{ id: string, text: string }>}
 *   onAnswer  {(answerId: string) => void}
 *   disabled  {boolean}
 */

import { useState } from 'react'

export default function MultipleChoice({ question, options, onAnswer, disabled }) {
  const [selected, setSelected] = useState(null)

  function handleSelect(id) {
    if (disabled) return
    setSelected(id)
    onAnswer(id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <p style={{ fontWeight: 600, fontSize: 'var(--font-size-md)' }}>{question}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {options.map(opt => (
          <label
            key={opt.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              border: `2px solid ${selected === opt.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)',
              background: selected === opt.id ? 'var(--color-primary-light)' : 'var(--color-surface)',
              cursor: disabled ? 'default' : 'pointer',
              transition: 'border-color 0.1s, background 0.1s',
            }}
          >
            <input
              type="radio"
              name="mc-question"
              value={opt.id}
              checked={selected === opt.id}
              onChange={() => handleSelect(opt.id)}
              disabled={disabled}
              style={{ accentColor: 'var(--color-primary)' }}
            />
            {opt.text}
          </label>
        ))}
      </div>
    </div>
  )
}
