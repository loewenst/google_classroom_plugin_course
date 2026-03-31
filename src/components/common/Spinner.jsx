/**
 * src/components/common/Spinner.jsx
 * Simple CSS-based loading spinner. Sizes: sm, md (default), lg.
 * Uses CSS animation defined in index.css.
 */

import React from 'react'

/**
 * @param {{ size?: 'sm'|'md'|'lg' }} props
 */
function Spinner({ size = 'md' }) {
  return (
    <span
      className={`spinner spinner--${size}`}
      role="status"
      aria-label="Loading"
    >
      <span className="spinner__ring" />
    </span>
  )
}

export default Spinner
