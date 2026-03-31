/**
 * src/components/glossary/GlossaryTooltip.jsx
 * Wraps inline text and shows a definition tooltip on hover or tap.
 *
 * Props:
 *   term        {string}
 *   definition  {string}
 *   children    {React.ReactNode}
 */

import { useState } from 'react'

export default function GlossaryTooltip({ term, definition, children }) {
  const [visible, setVisible] = useState(false)

  return (
    <span style={{ position: 'relative', display: 'inline' }}>
      <span
        style={{
          borderBottom: '2px dotted var(--color-primary)',
          cursor: 'help',
          color: 'var(--color-primary)',
        }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible(v => !v)}
        title={term}
      >
        {children}
      </span>

      {visible && (
        <span style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-text)',
          color: '#fff',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 10px',
          fontSize: 'var(--font-size-sm)',
          whiteSpace: 'nowrap',
          zIndex: 100,
          maxWidth: '240px',
          whiteSpace: 'normal',
          boxShadow: 'var(--shadow-md)',
          marginBottom: '4px',
        }}>
          <strong style={{ display: 'block', marginBottom: 2 }}>{term}</strong>
          {definition}
        </span>
      )}
    </span>
  )
}
