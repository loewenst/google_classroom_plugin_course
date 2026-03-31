/**
 * src/components/common/ProgressBar.jsx
 * Accessible progress bar. Displays a filled bar proportional to value/max,
 * along with an optional label and percentage text.
 */

import React from 'react'

/**
 * @param {{ value: number, max: number, label?: string }} props
 */
function ProgressBar({ value, max, label }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0

  return (
    <div className="progress-bar" aria-label={label || 'Progress'}>
      {label && <span className="progress-bar__label">{label}</span>}
      <div className="progress-bar__track">
        <div
          className="progress-bar__fill"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
      <span className="progress-bar__pct">{pct}%</span>
    </div>
  )
}

export default ProgressBar
