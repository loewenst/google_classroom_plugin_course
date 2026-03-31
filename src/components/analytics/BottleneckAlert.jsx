/**
 * src/components/analytics/BottleneckAlert.jsx
 * Shows alert cards for items where more than 30% of students are stuck.
 * Props:
 *   bottlenecks {Array<{ itemId, title, stuckCount, totalStudents }>}
 */

/**
 * @param {{ bottlenecks: Array }} props
 */
export default function BottleneckAlert({ bottlenecks = [] }) {
  if (bottlenecks.length === 0) {
    return (
      <div style={{
        padding: 'var(--spacing-md)',
        background: 'var(--color-success-light)',
        border: '1px solid var(--color-success)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--color-success)',
      }}>
        No bottlenecks detected — all items are on track.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
      {bottlenecks.map((b, i) => {
        const pct = b.totalStudents > 0
          ? Math.round((b.stuckCount / b.totalStudents) * 100)
          : 0
        return (
          <div
            key={b.itemId || i}
            style={{
              padding: 'var(--spacing-md)',
              background: 'var(--color-warning-light)',
              border: '1px solid var(--color-warning)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <p style={{ fontWeight: 700, marginBottom: 2 }}>{b.title || b.itemId}</p>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {b.stuckCount} of {b.totalStudents} students stuck ({pct}% fail rate)
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
