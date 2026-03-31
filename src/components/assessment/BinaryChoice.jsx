/**
 * src/components/assessment/BinaryChoice.jsx
 * Two-option choice question (True/False, Yes/No, or custom labels).
 * Props:
 *   question     {string}
 *   optionA      {string}  default: 'True'
 *   optionB      {string}  default: 'False'
 *   onAnswer     {(answer: string) => void}
 *   disabled     {boolean}
 */

import { useState } from 'react'

export default function BinaryChoice({ question, optionA = 'True', optionB = 'False', onAnswer, disabled }) {
  const [selected, setSelected] = useState(null)

  function handleSelect(value) {
    if (disabled) return
    setSelected(value)
    onAnswer(value)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <p style={{ fontWeight: 600, fontSize: 'var(--font-size-md)' }}>{question}</p>
      <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
        {[optionA, optionB].map(opt => (
          <button
            key={opt}
            onClick={() => handleSelect(opt)}
            disabled={disabled}
            style={{
              flex: 1,
              padding: 'var(--spacing-md)',
              fontSize: 'var(--font-size-lg)',
              fontWeight: 600,
              border: `3px solid ${selected === opt ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)',
              background: selected === opt ? 'var(--color-primary)' : 'var(--color-surface)',
              color: selected === opt ? '#fff' : 'var(--color-text)',
              cursor: disabled ? 'default' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
