/**
 * src/components/glossary/GlossaryPanel.jsx
 * Full glossary list with alphabetical grouping and search/filter.
 * Props:
 *   terms   {Array<{ term, definition }>}
 *   onClose {() => void}
 */

import { useState } from 'react'

/**
 * @param {{ terms: Array<{ term: string, definition: string }>, onClose: function }} props
 */
export default function GlossaryPanel({ terms = [], onClose }) {
  const [query, setQuery] = useState('')

  const filtered = terms
    .filter((t) => !query || t.term.toLowerCase().includes(query.toLowerCase()) || t.definition.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.term.localeCompare(b.term))

  // Group by first letter
  const grouped = filtered.reduce((acc, t) => {
    const letter = t.term[0]?.toUpperCase() || '#'
    if (!acc[letter]) acc[letter] = []
    acc[letter].push(t)
    return acc
  }, {})

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: 500,
    }}>
      <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--color-border)' }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search terms…"
          style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {Object.keys(grouped).sort().map((letter) => (
          <div key={letter}>
            <div style={{
              padding: '4px var(--spacing-md)',
              background: 'var(--color-background)',
              borderBottom: '1px solid var(--color-border)',
              fontWeight: 700,
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-primary)',
              position: 'sticky',
              top: 0,
            }}>
              {letter}
            </div>
            {grouped[letter].map((t) => (
              <div key={t.term} style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderBottom: '1px solid var(--color-border)',
              }}>
                <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 2 }}>{t.term}</p>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{t.definition}</p>
              </div>
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <p style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            {query ? 'No terms match your search.' : 'No terms defined yet.'}
          </p>
        )}
      </div>
    </div>
  )
}
