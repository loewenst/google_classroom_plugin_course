/**
 * src/components/analytics/ProgressChart.jsx
 * Simple SVG bar chart. No external charting library.
 * Props:
 *   data {Array<{ label: string, value: number, max: number }>}
 */

const BAR_HEIGHT = 28
const BAR_GAP = 10
const LABEL_WIDTH = 140
const CHART_WIDTH = 400
const PADDING = 16

/**
 * @param {{ data: Array<{ label: string, value: number, max: number }> }} props
 */
export default function ProgressChart({ data = [] }) {
  if (data.length === 0) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>No chart data available.</p>
  }

  const svgHeight = data.length * (BAR_HEIGHT + BAR_GAP) + PADDING * 2
  const svgWidth = LABEL_WIDTH + CHART_WIDTH + PADDING * 2

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        width={svgWidth}
        height={svgHeight}
        role="img"
        aria-label="Progress bar chart"
        style={{ display: 'block' }}
      >
        {data.map((d, i) => {
          const y = PADDING + i * (BAR_HEIGHT + BAR_GAP)
          const barMax = d.max || 100
          const barFill = Math.min(1, (d.value || 0) / barMax)
          const barWidth = Math.round(barFill * CHART_WIDTH)
          const fillColor = barFill >= 0.8
            ? 'var(--color-success)'
            : barFill >= 0.6
            ? 'var(--color-warning)'
            : 'var(--color-danger)'

          return (
            <g key={d.label || i}>
              {/* Label */}
              <text
                x={PADDING + LABEL_WIDTH - 8}
                y={y + BAR_HEIGHT / 2 + 4}
                textAnchor="end"
                fontSize="12"
                fill="var(--color-text-secondary)"
              >
                {d.label.length > 18 ? d.label.slice(0, 18) + '…' : d.label}
              </text>

              {/* Background track */}
              <rect
                x={PADDING + LABEL_WIDTH}
                y={y}
                width={CHART_WIDTH}
                height={BAR_HEIGHT}
                rx={4}
                fill="var(--color-border)"
              />

              {/* Fill bar */}
              {barWidth > 0 && (
                <rect
                  x={PADDING + LABEL_WIDTH}
                  y={y}
                  width={barWidth}
                  height={BAR_HEIGHT}
                  rx={4}
                  fill={fillColor}
                />
              )}

              {/* Value label */}
              <text
                x={PADDING + LABEL_WIDTH + barWidth + 6}
                y={y + BAR_HEIGHT / 2 + 4}
                fontSize="11"
                fill="var(--color-text-secondary)"
              >
                {d.value}/{d.max}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
