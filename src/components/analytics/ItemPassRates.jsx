/**
 * src/components/analytics/ItemPassRates.jsx
 * Table showing per-item pass rates, average scores, and average attempts.
 * Props:
 *   itemStats {Array<{ itemId, title, passRate, avgScore, avgAttempts, avgConfidence }>}
 */

/**
 * @param {{ itemStats: Array }} props
 */
export default function ItemPassRates({ itemStats = [] }) {
  if (itemStats.length === 0) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>No item stats available yet.</p>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
        <thead>
          <tr style={{ background: 'var(--color-surface)', borderBottom: '2px solid var(--color-border)' }}>
            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Item</th>
            <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>Pass Rate</th>
            <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>Avg Score</th>
            <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>Avg Attempts</th>
            {itemStats[0]?.avgConfidence != null && (
              <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>Avg Confidence</th>
            )}
          </tr>
        </thead>
        <tbody>
          {itemStats.map((stat, i) => {
            const passPercent = Math.round((stat.passRate ?? 0) * 100)
            const passColor = passPercent >= 80 ? 'var(--color-success)' : passPercent >= 60 ? 'var(--color-warning)' : 'var(--color-danger)'
            return (
              <tr key={stat.itemId || i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '8px 14px', fontWeight: 500 }}>{stat.title || stat.itemId}</td>
                <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                  <span style={{ color: passColor, fontWeight: 700 }}>{passPercent}%</span>
                </td>
                <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                  {stat.avgScore != null ? `${stat.avgScore}%` : '—'}
                </td>
                <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                  {stat.avgAttempts != null ? stat.avgAttempts.toFixed(1) : '—'}
                </td>
                {itemStats[0]?.avgConfidence != null && (
                  <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                    {stat.avgConfidence != null ? stat.avgConfidence.toFixed(1) : '—'}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
